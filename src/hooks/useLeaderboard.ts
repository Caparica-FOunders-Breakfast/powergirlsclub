import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWeekStart } from "./useWorkouts";
import { useMyTeam } from "./useTeams";

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

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return scores.map((score) => ({
        ...score,
        profile: profileMap.get(score.user_id) || null,
      }));
    },
    enabled: !!team,
  });
};
