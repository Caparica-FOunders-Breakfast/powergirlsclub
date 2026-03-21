import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLevel, getLevelProgress, type ExerciseEntry } from "@/hooks/useExerciseScorecard";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ExerciseDetailProps {
  exercise: {
    name: string;
    entries: ExerciseEntry[];
    currentWeight: number;
    bestWeight: number;
    ratio: number;
    level: { label: string; icon: string; index: number };
    unit?: string;
    useRatio?: boolean;
  };
  bodyWeight: number | null;
  onBack: () => void;
}

export function ExerciseDetail({ exercise, bodyWeight, onBack }: ExerciseDetailProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const { entries, name, currentWeight, bestWeight, level, ratio } = exercise;
  const progress = bodyWeight ? getLevelProgress(ratio) : 0;

  // Trend chart data (oldest first for chart)
  const chartEntries = [...entries].reverse().slice(-20);
  const maxW = Math.max(...chartEntries.map((e) => e.weight), 1);
  const minW = Math.min(...chartEntries.map((e) => e.weight));
  const range = maxW - minW || 1;

  const chartW = 280;
  const chartH = 80;
  const pad = 8;

  const points = chartEntries.map((e, i) => {
    const x = pad + (i / Math.max(chartEntries.length - 1, 1)) * (chartW - pad * 2);
    const y = chartH - pad - ((e.weight - minW) / range) * (chartH - pad * 2);
    return { x, y, entry: e };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1]?.x ?? pad},${chartH - pad} L${pad},${chartH - pad} Z`;

  return (
    <motion.div
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 30, opacity: 0 }}
      className="space-y-4"
    >
      {/* Back button + header */}
      <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground font-bold -ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="rounded-2xl border-2 border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{level.icon}</span>
          <div>
            <h2 className="font-display text-xl text-foreground">{name}</h2>
            <p className="text-xs font-bold text-muted-foreground">{level.label}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-xl bg-muted/50">
            <p className="text-lg font-display text-foreground">{currentWeight}</p>
            <p className="text-[10px] font-bold text-muted-foreground">Current (kg)</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-muted/50">
            <p className="text-lg font-display text-primary">{bestWeight}</p>
            <p className="text-[10px] font-bold text-muted-foreground">Best (kg)</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-muted/50">
            <p className="text-lg font-display text-foreground">{bodyWeight ? ratio.toFixed(2) : "—"}</p>
            <p className="text-[10px] font-bold text-muted-foreground">× BW</p>
          </div>
        </div>

        {/* Level progress */}
        {bodyWeight && (
          <div className="mb-4">
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
              />
            </div>
            <div className="flex justify-between mt-1">
              {["🌱", "💪", "⚡", "🔥", "👑"].map((icon, i) => (
                <span key={i} className={cn("text-xs", i <= level.index ? "opacity-100" : "opacity-30")}>{icon}</span>
              ))}
            </div>
          </div>
        )}

        {/* Trend chart */}
        {chartEntries.length > 1 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Progression</p>
            <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} className="overflow-visible">
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#chart-grad)" />
              <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 3.5 : 2} fill="hsl(var(--primary))" opacity={i === points.length - 1 ? 1 : 0.5} />
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* History list */}
      <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase">History ({entries.length})</p>
        </div>
        <div className="divide-y divide-border">
          {entries.slice(0, 20).map((entry, i) => {
            const isPR = entry.weight === bestWeight;
            const entryRatio = bodyWeight ? entry.weight / bodyWeight : 0;
            const entryLevel = getLevel(entryRatio);
            const expanded = expandedIdx === i;

            return (
              <button
                key={i}
                onClick={() => setExpandedIdx(expanded ? null : i)}
                className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{entryLevel.icon}</span>
                    <span className="text-xs font-bold text-muted-foreground w-16">
                      {format(new Date(entry.date), "MMM d")}
                    </span>
                    <span className="font-extrabold text-sm text-foreground">{entry.weight} kg</span>
                    {isPR && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground">
                        PR
                      </span>
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 text-xs font-bold text-muted-foreground space-y-0.5">
                        {bodyWeight && <p>Ratio: {entryRatio.toFixed(2)}x BW</p>}
                        <p>Level: {entryLevel.label}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
