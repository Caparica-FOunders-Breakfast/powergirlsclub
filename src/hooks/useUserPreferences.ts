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
  /** @deprecated superseded by progression_kg_per_week; kept for back-compat. */
  progress_goal: ProgressGoal;
  /** Weekly working-weight increment (kg) — single source of truth for overload. */
  progression_kg_per_week: number;
}

/** DB plan_type: 'default' = Klarita's plan · 'custom' = user's own program. */
export type DbPlanType = "default" | "custom";

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

/** Default weekly progression (kg) for brand-new users. */
export const PROGRESSION_DEFAULT = 1.0;
/** Custom progression stepper bounds (kg/week). */
export const PROGRESSION_MIN = 0.5;
export const PROGRESSION_MAX = 3.0;
export const PROGRESSION_STEP = 0.5;
/** Warn at or above this weekly increment. */
export const PROGRESSION_WARN_AT = 2.5;

export type ProgressionPreset = "healthy" | "aggressive" | "custom";

/** Which preset card a numeric progression maps to (UI sugar only — we always
 *  store and read the number). */
export const progressionPreset = (kgPerWeek: number): ProgressionPreset =>
  kgPerWeek === 1 ? "healthy" : kgPerWeek === 2 ? "aggressive" : "custom";

export const useUserPreferences = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-preferences", user?.id],
    queryFn: async (): Promise<UserPreferences | null> => {
      const { data, error } = await supabase
        .from("user_preferences" as any)
        .select(
          "frequency, training_days, start_date, progress_goal, progression_kg_per_week",
        )
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
        progression_kg_per_week: Number(
          row.progression_kg_per_week ?? PROGRESSION_DEFAULT,
        ),
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
            progression_kg_per_week: prefs.progression_kg_per_week,
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

/** Reads just the plan_type column (kept separate from UserPreferences so the
 *  prefs write path never clobbers plan_type, which import/generate also set). */
export const usePlanType = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["plan-type", user?.id],
    queryFn: async (): Promise<DbPlanType | null> => {
      const { data, error } = await supabase
        .from("user_preferences" as any)
        .select("plan_type")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.plan_type ?? null) as DbPlanType | null;
    },
    enabled: !!user,
  });
};

export const useSetPlanType = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (planType: DbPlanType) => {
      const { error } = await supabase
        .from("user_preferences" as any)
        .upsert(
          { user_id: user!.id, plan_type: planType } as any,
          { onConflict: "user_id" },
        );
      if (error) throw error;
      return planType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-type"] });
      queryClient.invalidateQueries({ queryKey: ["personal-workout-plan"] });
    },
  });
};
