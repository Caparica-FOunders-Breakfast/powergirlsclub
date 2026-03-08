import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWeekStart } from "./useWorkouts";
import { useMyTeam } from "./useTeams";
import { startOfWeek, addDays, format } from "date-fns";

export const useLeaderboard = () => {
  const weekStart = useCurrentWeekStart();
  const { data: team } = useMyTeam();

  return useQuery({
    queryKey: ["scores", weekStart, team?.id],
    queryFn: async () => {
      let query = supabase
        .from("weekly_scores")
        .select("*")
        .eq("week_start", weekStart)
        .order("points", { ascending: false });

      if (team?.id) {
        query = query.eq("team_id", team.id);
      }

      const { data: scores, error: scoresError } = await query;
      if (scoresError) throw scoresError;

      if (!scores || scores.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");
      if (profilesError) throw profilesError;

      // Fetch exercise logs for all users in this week to build sparkline data
      const userIds = scores.map((s) => s.user_id);
      const { data: exerciseLogs } = await supabase
        .from("exercise_logs")
        .select("user_id, day_index, completed, completed_at")
        .eq("week_start", weekStart)
        .in("user_id", userIds);

      // Build daily power scores per user (7 days)
      const userDailyScores = new Map<string, number[]>();
      userIds.forEach((uid) => userDailyScores.set(uid, [0, 0, 0, 0, 0, 0, 0]));

      exerciseLogs?.forEach((log) => {
        const arr = userDailyScores.get(log.user_id);
        if (arr && log.completed && log.day_index >= 0 && log.day_index < 7) {
          arr[log.day_index] += 1;
        }
      });

      // Convert to cumulative power score
      const userPowerData = new Map<string, number[]>();
      userDailyScores.forEach((daily, uid) => {
        const cumulative: number[] = [];
        let total = 0;
        daily.forEach((val) => {
          total += val;
          cumulative.push(total);
        });
        userPowerData.set(uid, cumulative);
      });

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return scores.map((score) => ({
        ...score,
        profile: profileMap.get(score.user_id) || null,
        powerData: userPowerData.get(score.user_id) || [0, 0, 0, 0, 0, 0, 0],
      }));
    },
    enabled: !!team,
  });
};
