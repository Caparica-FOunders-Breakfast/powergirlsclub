import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { weeklyPlan, type WorkoutDay, type Exercise } from "@/data/workoutPlan";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const useDefaultWorkoutPlan = () => {
  const { data: dbDefaults, isLoading } = useQuery({
    queryKey: ["default-workout-plan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("default_workout_plans" as any)
        .select("*")
        .order("day_index");
      if (error) throw error;
      return data as any[];
    },
  });

  // Map DB rows to WorkoutDay[], fall back to hardcoded if DB is empty
  const plan: WorkoutDay[] = dbDefaults && dbDefaults.length > 0
    ? dbDefaults.map((row) => ({
        day: DAYS[row.day_index] || `Day ${row.day_index}`,
        label: row.label,
        emoji: row.emoji,
        isRest: row.is_rest,
        isRecovery: row.is_recovery,
        restNote: row.rest_note || undefined,
        exercises: (row.exercises as unknown as Exercise[]) || [],
      }))
    : weeklyPlan;

  return { plan, isLoading };
};

export const useSaveDefaultDay = () => {
  const queryClient = useQueryClient();

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
        .from("default_workout_plans" as any)
        .upsert({
          day_index: dayIndex,
          exercises: exercises as any,
          label: label || "Workout",
          emoji: emoji || "💪",
          is_rest: isRest ?? false,
          is_recovery: isRecovery ?? false,
          rest_note: restNote || null,
        }, { onConflict: "day_index" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["default-workout-plan"] });
      queryClient.invalidateQueries({ queryKey: ["personal-workout-plan"] });
    },
  });
};
