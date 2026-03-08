import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWeekStart } from "./useWorkouts";

export const useLeaderboard = () => {
  const weekStart = useCurrentWeekStart();

  return useQuery({
    queryKey: ["scores", weekStart],
    queryFn: async () => {
      // Get scores for this week
      const { data: scores, error: scoresError } = await supabase
        .from("weekly_scores")
        .select("*")
        .eq("week_start", weekStart)
        .order("points", { ascending: false });
      if (scoresError) throw scoresError;

      if (!scores || scores.length === 0) return [];

      // Get all profiles
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
  });
};
