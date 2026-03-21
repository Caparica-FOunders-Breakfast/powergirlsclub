import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ExerciseLevel = "Beginner" | "Getting Stronger" | "Strong" | "Very Strong" | "Elite";

export interface ExerciseEntry {
  date: string;
  weight: number;
  exerciseName: string;
}

export interface ExerciseCard {
  name: string;
  entries: ExerciseEntry[];
  currentWeight: number;
  bestWeight: number;
  level: ExerciseLevel;
  ratio: number;
  levelIcon: string;
}

const LEVELS: { max: number; label: ExerciseLevel; icon: string }[] = [
  { max: 0.35, label: "Beginner", icon: "🌱" },
  { max: 0.6, label: "Getting Stronger", icon: "💪" },
  { max: 0.85, label: "Strong", icon: "⚡" },
  { max: 1.2, label: "Very Strong", icon: "🔥" },
  { max: Infinity, label: "Elite", icon: "👑" },
];

export function getLevel(ratio: number): { label: ExerciseLevel; icon: string; index: number } {
  for (let i = 0; i < LEVELS.length; i++) {
    if (ratio < LEVELS[i].max) return { label: LEVELS[i].label, icon: LEVELS[i].icon, index: i };
  }
  return { label: "Elite", icon: "👑", index: 4 };
}

export function getLevelProgress(ratio: number): number {
  const thresholds = [0, 0.35, 0.6, 0.85, 1.2, 1.6];
  for (let i = 1; i < thresholds.length; i++) {
    if (ratio < thresholds[i]) {
      const segmentStart = thresholds[i - 1];
      const segmentEnd = thresholds[i];
      const segmentProgress = (ratio - segmentStart) / (segmentEnd - segmentStart);
      return ((i - 1) / (thresholds.length - 2)) * 100 + (segmentProgress / (thresholds.length - 2)) * 100;
    }
  }
  return 100;
}

export const useExerciseScorecard = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["exercise-scorecard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("exercise_name, weight_used, completed_at, week_start, day_index")
        .eq("user_id", user!.id)
        .eq("completed", true)
        .not("weight_used", "is", null)
        .order("completed_at", { ascending: true });

      if (error) throw error;

      // Group by exercise name
      const grouped = new Map<string, ExerciseEntry[]>();
      data?.forEach((log) => {
        if (log.weight_used == null) return;
        const name = log.exercise_name;
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name)!.push({
          date: log.completed_at || log.week_start,
          weight: Number(log.weight_used),
          exerciseName: name,
        });
      });

      return grouped;
    },
    enabled: !!user,
  });
};
