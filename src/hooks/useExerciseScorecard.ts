import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canonicalExerciseName } from "@/lib/exerciseNormalize";

export type ExerciseLevel = "Beginner" | "Leveling up" | "Strong" | "Advanced" | "Very strong";

export interface ExerciseEntry {
  date: string;
  weight: number;
  exerciseName: string;
  failed?: boolean;
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
  { max: 0.6, label: "Leveling up", icon: "⚡" },
  { max: 0.85, label: "Strong", icon: "💪" },
  { max: 1.2, label: "Advanced", icon: "🔥" },
  { max: Infinity, label: "Very strong", icon: "👑" },
];

export function getLevel(ratio: number): { label: ExerciseLevel; icon: string; index: number } {
  for (let i = 0; i < LEVELS.length; i++) {
    if (ratio < LEVELS[i].max) return { label: LEVELS[i].label, icon: LEVELS[i].icon, index: i };
  }
  return { label: "Very strong", icon: "👑", index: 4 };
}

export function getLevelProgress(ratio: number): number {
  // Very strong starts at 1.2 x bodyweight and is the top level, so reaching
  // 1.2 is a full bar (no phantom 1.6 / "101 kg at 63 kg" target).
  const thresholds = [0, 0.35, 0.6, 0.85, 1.2];
  const segments = thresholds.length - 1;
  if (ratio >= thresholds[segments]) return 100;
  for (let i = 1; i < thresholds.length; i++) {
    if (ratio < thresholds[i]) {
      const segmentProgress = (ratio - thresholds[i - 1]) / (thresholds[i] - thresholds[i - 1]);
      return ((i - 1 + segmentProgress) / segments) * 100;
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
        // Canonicalise so "Goblet Squat"/"Goblet Squats", "Pull Up"/"Pull Ups",
        // "deadlift"/"Romanian Deadlift" etc. merge into a single card.
        const name = canonicalExerciseName(log.exercise_name);
        const w = Number(log.weight_used);
        const failed = w === -1;
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name)!.push({
          date: log.completed_at || log.week_start,
          weight: failed ? 0 : w,
          exerciseName: name,
          failed,
        });
      });

      return grouped;
    },
    enabled: !!user,
  });
};
