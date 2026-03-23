import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useExerciseLogs = (weekStart: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["exercise-logs", user?.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("week_start", weekStart);
      if (error) throw error;

      const map: Record<string, typeof data[number]> = {};
      data.forEach((log) => {
        map[`${log.day_index}-${log.exercise_index}`] = log;
      });
      return map;
    },
    enabled: !!user && !!weekStart,
  });
};

export const useSaveExerciseLog = (weekStart: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      dayIndex,
      exerciseIndex,
      exerciseName,
      weightUsed,
      completed,
    }: {
      dayIndex: number;
      exerciseIndex: number;
      exerciseName: string;
      weightUsed: number | null;
      completed: boolean;
    }) => {
      const { data, error } = await supabase
        .from("exercise_logs")
        .upsert(
          {
            user_id: user!.id,
            week_start: weekStart,
            day_index: dayIndex,
            exercise_index: exerciseIndex,
            exercise_name: exerciseName,
            weight_used: weightUsed,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          },
          { onConflict: "user_id,week_start,day_index,exercise_index" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-logs"] });
      queryClient.invalidateQueries({ queryKey: ["scores"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-winner"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-scorecard"] });
    },
  });
};
