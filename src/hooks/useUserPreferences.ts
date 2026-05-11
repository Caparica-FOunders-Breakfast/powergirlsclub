import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ProgressGoal = "healthy" | "aggressive";

export interface UserPreferences {
  frequency: number;
  /** Day indices where 0 = Monday … 6 = Sunday. */
  training_days: number[];
  /** YYYY-MM-DD */
  start_date: string;
  progress_goal: ProgressGoal;
}

export const FREQUENCY_DEFAULT_DAYS: Record<number, number[]> = {
  // Mon, Wed, Fri
  3: [0, 2, 4],
  // Mon, Wed, Fri, Sat (drops Thursday HIIT)
  4: [0, 2, 4, 5],
  // Mon, Wed, Thu, Fri, Sat (full plan)
  5: [0, 2, 3, 4, 5],
};

export const PROGRESS_GOAL_RATE: Record<ProgressGoal, number> = {
  healthy: 1,
  aggressive: 2,
};

export const useUserPreferences = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async (): Promise<UserPreferences | null> => {
      const { data, error } = await supabase
        .from("user_preferences" as any)
        .select("frequency, training_days, start_date, progress_goal")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as any;
      return {
        frequency: row.frequency,
        training_days: (row.training_days ?? []).map((d: number) => Number(d)),
        start_date: row.start_date,
        progress_goal: row.progress_goal as ProgressGoal,
      };
    },
    enabled: !!user,
  });
};

export const useSaveUserPreferences = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (prefs: UserPreferences) => {
      const { data, error } = await supabase
        .from("user_preferences" as any)
        .upsert(
          {
            user_id: user!.id,
            frequency: prefs.frequency,
            training_days: prefs.training_days,
            start_date: prefs.start_date,
            progress_goal: prefs.progress_goal,
          } as any,
          { onConflict: "user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      // Plan derives from preferences too — refresh the weekly view.
      queryClient.invalidateQueries({ queryKey: ["personal-workout-plan"] });
    },
  });
};
