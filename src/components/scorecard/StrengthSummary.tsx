import { motion } from "framer-motion";
import { getLevel, type ExerciseEntry } from "@/hooks/useExerciseScorecard";

interface ExerciseData {
  name: string;
  currentWeight: number;
  bestWeight: number;
  ratio: number;
  useRatio: boolean;
  unit: string;
  level: { label: string; icon: string; index: number };
}

interface StrengthSummaryProps {
  exercises: ExerciseData[];
  bodyWeight: number | null;
}

const LEVEL_ORDER = ["Beginner", "Leveling Up", "Strong", "Very Strong", "Elite"];

export function StrengthSummary({ exercises, bodyWeight }: StrengthSummaryProps) {
  const weightBased = exercises.filter((e) => e.useRatio && e.ratio > 0);

  if (weightBased.length === 0) return null;

  // Overall level: average ratio → level
  const avgRatio = weightBased.reduce((sum, e) => sum + e.ratio, 0) / weightBased.length;
  const overall = getLevel(avgRatio);

  // Top 3 strongest lifts by ratio
  const top3 = [...weightBased].sort((a, b) => b.ratio - a.ratio).slice(0, 3);

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl border-2 border-border bg-card p-4 space-y-3"
    >
      {/* Overall Level */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Overall Strength</p>
          <p className="text-lg font-display text-foreground flex items-center gap-2 mt-0.5">
            <span className="text-2xl">{overall.icon}</span>
            {overall.label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Avg Ratio</p>
          <p className="text-lg font-display text-foreground">{avgRatio.toFixed(2)}x <span className="text-xs font-bold text-muted-foreground">BW</span></p>
        </div>
      </div>

      {/* Strongest Lifts */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Strongest Lifts</p>
        <div className="space-y-1.5">
          {top3.map((ex, i) => (
            <div key={ex.name} className="flex items-center gap-2">
              <span className="text-sm">{ex.level.icon}</span>
              <span className="text-xs font-extrabold text-foreground truncate flex-1">{ex.name}</span>
              <span className="text-xs font-bold text-primary shrink-0">{ex.ratio.toFixed(2)}x</span>
              <span className="text-xs font-bold text-muted-foreground shrink-0">{ex.currentWeight} {ex.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
