import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentWeekStart } from "./useWorkouts";

export const useCurrentReward = () => {
  const weekStart = useCurrentWeekStart();

  return useQuery({
    queryKey: ["reward", weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Get chooser profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", data.chosen_by)
        .single();

      return { ...data, chooser_name: profile?.display_name };
    },
  });
};

export const useAllRewards = () => {
  return useQuery({
    queryKey: ["rewards-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get all profiles for display names
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]));

      return data.map((r) => ({ ...r, chooser_name: profileMap.get(r.chosen_by) || "Unknown" }));
    },
  });
};

export const useSetReward = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
        })
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
