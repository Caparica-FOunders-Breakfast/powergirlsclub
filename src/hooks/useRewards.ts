import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentWeekStart } from "./useWorkouts";
import { useMyTeam } from "./useTeams";

export const useCurrentReward = () => {
  const weekStart = useCurrentWeekStart();
  const { data: team } = useMyTeam();

  return useQuery({
    queryKey: ["reward", weekStart, team?.id],
    queryFn: async () => {
      let query = supabase
        .from("rewards")
        .select("*")
        .eq("week_start", weekStart);

      if (team?.id) {
        query = query.eq("team_id", team.id);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", data.chosen_by)
        .single();

      return { ...data, chooser_name: profile?.display_name };
    },
    enabled: !!team,
  });
};

export const useAllRewards = () => {
  const { data: team } = useMyTeam();

  return useQuery({
    queryKey: ["rewards-all", team?.id],
    queryFn: async () => {
      let query = supabase
        .from("rewards")
        .select("*")
        .order("created_at", { ascending: false });

      if (team?.id) {
        query = query.eq("team_id", team.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]));

      return data.map((r) => ({ ...r, chooser_name: profileMap.get(r.chosen_by) || "Unknown" }));
    },
    enabled: !!team,
  });
};

export const useSetReward = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: team } = useMyTeam();

  return useMutation({
    mutationFn: async ({ weekStart, weekNumber, rewardType, rewardValue }: {
      weekStart: string;
      weekNumber: number;
      rewardType: string;
      rewardValue: string;
    }) => {
      const { data, error } = await supabase
        .from("rewards")
        .insert({
          week_start: weekStart,
          week_number: weekNumber,
          reward_type: rewardType,
          reward_value: rewardValue,
          chosen_by: user!.id,
          team_id: team?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reward"] });
      queryClient.invalidateQueries({ queryKey: ["rewards-all"] });
    },
  });
};
