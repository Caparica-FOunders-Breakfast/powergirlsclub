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
        .select("*, profiles!rewards_chosen_by_fkey(display_name)")
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

export const useAllRewards = () => {
  return useQuery({
    queryKey: ["rewards-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*, profiles!rewards_chosen_by_fkey(display_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
