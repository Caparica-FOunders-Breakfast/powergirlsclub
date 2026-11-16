import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { looseExerciseKey } from "@/lib/plan";

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

// Fetches the most recent weeks the user actually logged each exercise *before*
// the selected week, regardless of how many weeks were skipped. Returns a map of
// `${day_index}-${exercise_index}` -> array of weights ordered most-recent-first.
// This is what powers the "Last week: X kg → Try Y" reference, so it keeps working
// even after a gap of several weeks with no training.
/**
 * Your most recent weights for each exercise from any week before `weekStart`,
 * keyed by exercise name (loose match: "Goblet Squats" == "Goblet squat"),
 * newest first. Keyed by name, not by day/slot position: a new plan, a
 * reordered day or a different training day must still find the last time you
 * did *that exercise*. (Position keys showed another exercise's weight, or
 * "First time", after any plan change.)
 *
 * -1 (a failed set, logged as "F") is kept; the week view falls back to the
 * record before a fail.
 */
export const usePriorExerciseWeights = (weekStart: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["prior-exercise-weights", user?.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("exercise_name, day_index, weight_used, week_start")
        .eq("user_id", user!.id)
        .lt("week_start", weekStart)
        .not("weight_used", "is", null)
        .order("week_start", { ascending: false })
        .order("day_index", { ascending: false });
      if (error) throw error;

      // Newest first. `weights[key][0]` is the last logged weight; `lastWeek`
      // says which week it came from (to match a week 1 starting weight).
      const weights: Record<string, number[]> = {};
      const lastWeek: Record<string, string> = {};
      data.forEach((log) => {
        if (log.weight_used == null || !log.exercise_name) return;
        const key = looseExerciseKey(log.exercise_name);
        if (!weights[key]) { weights[key] = []; lastWeek[key] = log.week_start; }
        weights[key].push(Number(log.weight_used));
      });
      return { weights, lastWeek };
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
      queryClient.invalidateQueries({ queryKey: ["prior-exercise-weights"] });
      queryClient.invalidateQueries({ queryKey: ["scores"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-winner"] });
      queryClient.invalidateQueries({ queryKey: ["exercise-scorecard"] });
    },
  });
};
