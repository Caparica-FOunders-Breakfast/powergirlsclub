import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWeekStart } from "./useWorkouts";

export const useLeaderboard = () => {
  const weekStart = useCurrentWeekStart();

  return useQuery({
    queryKey: ["scores", weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_scores")
        .select("*, profiles!inner(display_name, avatar_color)")
        .eq("week_start", weekStart)
        .order("points", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};
