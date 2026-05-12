import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDefaultWorkoutPlan } from "@/hooks/useDefaultWorkoutPlan";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { type WorkoutDay, type Exercise } from "@/data/workoutPlan";

const isStartDateActive = (startDate: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate + "T00:00:00");
  return start.getTime() <= today.getTime();
};

export const usePersonalWorkoutPlan = () => {
  const { user } = useAuth();
  const { plan: defaultPlan, isLoading: defaultsLoading } = useDefaultWorkoutPlan();
  const { data: preferences } = useUserPreferences();

  const { data: customPlans, isLoading: customLoading } = useQuery({
    queryKey: ["personal-workout-plan", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workout_plans" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("day_index");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Step 1: merge custom plans on top of DB defaults.
  const mergedPlan: WorkoutDay[] = defaultPlan.map((defaultDay, idx) => {
    const custom = customPlans?.find((c: any) => c.day_index === idx);
    if (!custom) return defaultDay;
    return {
      day: defaultDay.day,
      label: custom.label || defaultDay.label,
      emoji: custom.emoji || defaultDay.emoji,
      isRest: custom.is_rest ?? defaultDay.isRest,
      isRecovery: custom.is_recovery ?? defaultDay.isRecovery,
      restNote: custom.rest_note || defaultDay.restNote,
      exercises: (custom.exercises as Exercise[]) || defaultDay.exercises,
    };
  });

  // Step 2: if the user has activated preferences (start date today or past),
  // convert non-training-days to rest so the weekly view reflects their chosen frequency.
  let plan: WorkoutDay[] = mergedPlan;
  if (preferences && isStartDateActive(preferences.start_date)) {
    const trainingDays = new Set(preferences.training_days);
    plan = mergedPlan.map((day, idx) => {
      if (trainingDays.has(idx)) return day;
      // Preserve the day label but blank out exercises and mark as rest.
      return {
        ...day,
        label: "Rest",
        emoji: "🧘",
        isRest: true,
        isRecovery: false,
        restNote: "Rest day. Light walk, mobility, or full rest.",
        exercises: [],
      };
    });
  }

  return {
    plan,
    mergedPlan,
    isLoading: defaultsLoading || customLoading,
    hasCustom: (dayIdx: number) => !!customPlans?.find((c: any) => c.day_index === dayIdx),
  };
};

export const useSavePersonalDay = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ dayIndex, exercises, label, emoji, isRest, isRecovery, restNote }: {
      dayIndex: number;
      exercises: Exercise[];
      label?: string;
      emoji?: string;
      isRest?: boolean;
      isRecovery?: boolean;
      restNote?: string;
    }) => {
      const { data, error } = await supabase
        .from("user_workout_plans" as any)
        .upsert({
          user_id: user!.id,
          day_index: dayIndex,
          exercises: exercises as any,
          label: label || null,
          emoji: emoji || null,
          is_rest: isRest ?? false,
          is_recovery: isRecovery ?? false,
          rest_note: restNote || null,
        } as any, { onConflict: "user_id,day_index" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-workout-plan"] });
    },
  });
};

export const useResetPersonalDay = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dayIndex: number) => {
      const { error } = await supabase
        .from("user_workout_plans" as any)
        .delete()
        .eq("user_id", user!.id)
        .eq("day_index", dayIndex);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personal-workout-plan"] });
    },
  });
};
