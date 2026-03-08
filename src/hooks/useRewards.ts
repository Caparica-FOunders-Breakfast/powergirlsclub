import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentWeekStart } from "./useWorkouts";
import { useMyTeam } from "./useTeams";

export const useMyRewards = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-rewards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("chosen_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useMyCurrentWeekReward = () => {
  const { user } = useAuth();
  const weekStart = useCurrentWeekStart();

  return useQuery({
    queryKey: ["my-reward", user?.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("chosen_by", user!.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCurrentReward = () => {
  const { user } = useAuth();
  const weekStart = useCurrentWeekStart();

  return useQuery({
    queryKey: ["my-reward", user?.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("chosen_by", user!.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useTeamRewards = () => {
  const weekStart = useCurrentWeekStart();
  const { data: team } = useMyTeam();

  return useQuery({
    queryKey: ["team-rewards", team?.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rewards")
        .select("*")
        .eq("week_start", weekStart)
        .eq("team_id", team!.id);
      if (error) throw error;

      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_color");
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return data.map((r) => ({
        ...r,
        profile: profileMap.get(r.chosen_by),
      }));
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
    mutationFn: async ({ weekStart, weekNumber, rewardType, rewardValue, rewardDetails }: {
      weekStart: string;
      weekNumber: number;
      rewardType: string;
      rewardValue: string;
      rewardDetails?: Record<string, any>;
    }) => {
      // Check if reward already exists for this user/week
      const { data: existing } = await supabase
        .from("rewards")
        .select("id")
        .eq("chosen_by", user!.id)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("rewards")
          .update({
            reward_type: rewardType,
            reward_value: rewardValue,
            reward_details: rewardDetails || {},
          } as any)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("rewards")
        .insert({
          week_start: weekStart,
          week_number: weekNumber,
          reward_type: rewardType,
          reward_value: rewardValue,
          chosen_by: user!.id,
          team_id: team?.id,
          reward_details: rewardDetails || {},
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reward"] });
      queryClient.invalidateQueries({ queryKey: ["team-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["rewards-all"] });
      queryClient.invalidateQueries({ queryKey: ["my-rewards"] });
    },
  });
};
