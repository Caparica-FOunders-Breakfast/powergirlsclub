import { useState, useRef, useCallback } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Award, ChevronRight, ChevronDown, X, Plus } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useExerciseScorecard, getLevel, getLevelProgress, type ExerciseEntry } from "@/hooks/useExerciseScorecard";
import { useActivityData } from "@/hooks/useActivityData";
import { useProfile } from "@/hooks/useProfile";
import { useScorecardVisibility } from "@/hooks/useScorecardVisibility";
import { ActivityOverview } from "./ActivityOverview";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ExerciseDetail } from "./ExerciseDetail";
import { StrengthSummary } from "./StrengthSummary";
import { AddExerciseModal } from "./AddExerciseModal";
import { NON_KG_THRESHOLDS, LEVEL_DEFS, getNonKgLevel, getNonKgProgress, ASSISTED_EXERCISES, getAssistedLevel, getAssistedProgress } from "./exerciseLevels";
import { useToast } from "@/hooks/use-toast";

// Unit mapping: exercises not measured in kg
const EXERCISE_UNITS: Record<string, string> = {
  "Plank": "sec",
  "Side Plank": "sec",
  "Battle Ropes": "sec",
  "Farmer Carry": "sec",
  "Push Ups": "reps",
  "Dead Bug": "reps",
  "Bird Dog": "reps",
  "Hanging Knee Raises": "reps",
  "Box Jumps": "reps",
  "Bike Sprint (20s all-in + 3min rest)": "rounds",
  "Sprint / Jump Rope": "rounds",
  "Recovery Day": "—",
  "Rest Day": "—",
  "Pull Ups": "kg assist",
  "jkk": "reps",
};

const getUnit = (name: string) => EXERCISE_UNITS[name] || "kg";

// Category mapping
const EXERCISE_CATEGORIES: Record<string, string> = {
  "Goblet Squat": "🦵 Legs",
  "Barbell Squat": "🦵 Legs",
  "Smith Machine Lunges": "🦵 Legs",
  "Step Ups": "🦵 Legs",
  "Box Jumps": "🦵 Legs",
  "Hip Thrust": "🍑 Glutes",
  "Cable Kickbacks": "🍑 Glutes",
  "Romanian Deadlift": "🍑 Glutes",
  "Lat Pulldown": "💪 Upper Body",
  "Dumbbell Shoulder Press": "💪 Upper Body",
  "Seated Row": "💪 Upper Body",
  "Cable Row": "💪 Upper Body",
   "Push Ups": "💪 Upper Body",
   "Pull Ups": "💪 Upper Body",
  "Back Extension": "💪 Upper Body",
  "Plank": "🧘 Core",
  "Dead Bug": "🧘 Core",
  "Russian Twists": "🧘 Core",
  "Side Plank": "🧘 Core",
  "Bird Dog": "🧘 Core",
  "Hanging Knee Raises": "🧘 Core",
  "Kettlebell Swings": "⚡ Cardio & Power",
  "Battle Ropes": "⚡ Cardio & Power",
  "Sprint / Jump Rope": "⚡ Cardio & Power",
  "Bike Sprint (20s all-in + 3min rest)": "⚡ Cardio & Power",
  "Farmer Carry": "⚡ Cardio & Power",
};

const CATEGORY_ORDER = ["🦵 Legs", "🍑 Glutes", "💪 Upper Body", "🧘 Core", "⚡ Cardio & Power", "🏋️ Other"];

const CATEGORY_FILTERS: { key: string; label: string; match: (cat: string) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "lower", label: "Lower Body", match: (c) => c.includes("Legs") || c.includes("Glutes") },
  { key: "upper", label: "Upper Body", match: (c) => c.includes("Upper Body") },
  { key: "core", label: "Core", match: (c) => c.includes("Core") },
  { key: "hiit", label: "HIIT", match: (c) => c.includes("Cardio") },
];

export function ExerciseScorecard() {
  const { data: grouped, isLoading } = useExerciseScorecard();
  const { data: activityEntries } = useActivityData();
  const { data: profile } = useProfile();
  const { hiddenExercises, hideExercise, unhideExercise } = useScorecardVisibility();
  const { toast } = useToast();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bw = profile?.body_weight ? Number(profile.body_weight) : null;

  const handleRemoveExercise = useCallback((exerciseName: string) => {
    hideExercise.mutate(exerciseName);

    const { dismiss } = toast({
      description: "Exercise removed from Scorecard",
      action: (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs font-bold"
          onClick={() => {
            unhideExercise.mutate(exerciseName);
            dismiss();
          }}
        >
          Undo
        </Button>
      ),
      duration: 4000,
    });
  }, [hideExercise, unhideExercise, toast]);

  const handleAddExercise = useCallback((exerciseName: string) => {
    unhideExercise.mutate(exerciseName);
  }, [unhideExercise]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!grouped || grouped.size === 0) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-12 bg-card rounded-2xl border-2 border-border"
      >
        <p className="text-5xl mb-3">📊</p>
        <h2 className="text-2xl font-display text-foreground">No Data Yet</h2>
        <p className="text-muted-foreground font-semibold mt-2">
          Complete exercises with weights to see your progression
        </p>
      </motion.div>
    );
  }

  const allExerciseNames = Array.from(grouped.keys());

  // Build exercise cards, filtering out hidden ones
  const exercises = Array.from(grouped.entries())
    .filter(([name]) => !hiddenExercises.includes(name))
    .map(([name, entries]) => {
      const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestNonFailed = sorted.find((e) => !e.failed);
      const currentWeight = latestNonFailed?.weight ?? 0;
      const isAssisted = ASSISTED_EXERCISES.has(name);
      const nonFailedEntries = entries.filter((e) => !e.failed);
      const bestWeight = nonFailedEntries.length === 0 ? 0 : isAssisted
        ? Math.min(...nonFailedEntries.map((e) => e.weight))
        : Math.max(...nonFailedEntries.map((e) => e.weight));
      const failCount = entries.filter((e) => e.failed).length;
      const unit = getUnit(name);
      const useRatio = unit === "kg" && !!bw;
      const ratio = useRatio ? currentWeight / bw! : 0;
      const hasThresholds = !useRatio && !isAssisted && NON_KG_THRESHOLDS[name] != null;
      const level = isAssisted
        ? getAssistedLevel(name, currentWeight)
        : useRatio
          ? getLevel(ratio)
          : hasThresholds
            ? getNonKgLevel(name, currentWeight)
            : { label: "—" as const, icon: "📈", index: -1 };
      const category = EXERCISE_CATEGORIES[name] || "🏋️ Other";
      return { name, entries: sorted, currentWeight, bestWeight, ratio, level, category, unit, useRatio, hasThresholds, isAssisted, failCount };
    });

  // Detail view
  if (selectedExercise) {
    const ex = exercises.find((e) => e.name === selectedExercise);
    if (ex) {
      return (
        <ExerciseDetail
          exercise={ex}
          bodyWeight={bw}
          onBack={() => setSelectedExercise(null)}
          onRemove={(name) => {
            handleRemoveExercise(name);
            setSelectedExercise(null);
          }}
        />
      );
    }
  }

  const hasHiddenExercises = hiddenExercises.length > 0;

  const activeFilter = CATEGORY_FILTERS.find((f) => f.key === categoryFilter) ?? CATEGORY_FILTERS[0];
  const filteredExercises = exercises
    .filter((ex) => activeFilter.match(ex.category))
    .sort((a, b) => {
      if (a.isAssisted && b.isAssisted) return a.bestWeight - b.bestWeight;
      return b.bestWeight - a.bestWeight;
    });

  return (
    <div className="space-y-4">
      {/* Activity Overview (responsive — mobile + desktop) */}
      <ActivityOverview entries={activityEntries ?? []} />

      {/* Strength Summary */}
      <StrengthSummary exercises={exercises} bodyWeight={bw} />

      {/* Strength Level Legend */}
      <Collapsible defaultOpen={false}>
        <motion.div
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border-2 border-border bg-card px-4 py-3"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full group">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Strength Levels</p>
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {[
                { icon: "🌱", label: "Beginner", range: "< 0.35x" },
                { icon: "💪", label: "Getting Stronger", range: "0.35–0.60x" },
                { icon: "⚡", label: "Strong", range: "0.60–0.85x" },
                { icon: "🔥", label: "Very Strong", range: "0.85–1.20x" },
                { icon: "👑", label: "Elite", range: "> 1.20x" },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span>{l.icon}</span>
                  <span className="font-semibold text-foreground">{l.label}</span>
                  <span className="opacity-60">{l.range}</span>
                </span>
              ))}
            </div>
          </CollapsibleContent>
        </motion.div>
      </Collapsible>

      {/* Exercise Progress card */}
      <div className="rounded-2xl bg-card border-2 border-border overflow-hidden">
        <div className="p-4 lg:p-5 border-b border-border">
          <h3 className="font-display text-xl text-foreground lg:text-2xl mb-3">Exercise Progress</h3>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
            {CATEGORY_FILTERS.map((f) => {
              const active = categoryFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setCategoryFilter(f.key)}
                  className={cn(
                    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredExercises.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground font-semibold">
              No exercises in this category yet.
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-3 lg:p-0 lg:space-y-0 lg:divide-y lg:divide-border">
            {filteredExercises.map((ex, i) => (
              <ExerciseRow
                key={ex.name}
                ex={ex}
                index={i}
                bodyWeight={bw}
                onSelect={setSelectedExercise}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Exercise Button */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={() => setAddModalOpen(true)}
          disabled={!hasHiddenExercises}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed transition-all active:scale-[0.98]",
            hasHiddenExercises
              ? "border-primary/30 text-primary hover:border-primary/50 hover:bg-primary/5"
              : "border-border text-muted-foreground/50 cursor-not-allowed"
          )}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-bold">Add Exercise</span>
        </button>
      </motion.div>

      {/* Add Exercise Modal */}
      <AddExerciseModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        allExercises={allExerciseNames}
        hiddenExercises={hiddenExercises}
        onAdd={handleAddExercise}
      />
    </div>
  );
}

type ExerciseRowData = {
  name: string;
  entries: ExerciseEntry[];
  currentWeight: number;
  bestWeight: number;
  ratio: number;
  level: { label: string; icon: string; index: number };
  category: string;
  unit: string;
  useRatio: boolean;
  hasThresholds: boolean;
  isAssisted: boolean;
  failCount: number;
};

function ExerciseRow({
  ex,
  index,
  bodyWeight,
  onSelect,
}: {
  ex: ExerciseRowData;
  index: number;
  bodyWeight: number | null;
  onSelect: (name: string) => void;
}) {
  const isPR = ex.currentWeight === ex.bestWeight && ex.entries.length > 1;
  const progress = ex.isAssisted
    ? getAssistedProgress(ex.name, ex.currentWeight)
    : ex.useRatio
      ? (bodyWeight ? getLevelProgress(ex.ratio) : 0)
      : ex.hasThresholds
        ? getNonKgProgress(ex.name, ex.currentWeight)
        : 0;
  const hasProgress = ex.useRatio || ex.hasThresholds || ex.isAssisted;

  return (
    <motion.div
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "relative group transition-colors",
        // Desktop alternating row backgrounds
        index % 2 === 1 ? "lg:bg-muted/30" : "lg:bg-card",
        "lg:hover:bg-muted/50"
      )}
    >
      {/* Mobile layout — stacked card with progress bar at bottom */}
      <button
        onClick={() => onSelect(ex.name)}
        className="lg:hidden w-full text-left rounded-2xl border-2 border-border bg-card p-4 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{ex.level.icon}</span>
            <h3 className="font-extrabold text-sm text-foreground truncate">{ex.name}</h3>
            {isPR && (
              <span className="shrink-0 text-base" title="Personal Record">⭐</span>
            )}
            {ex.failCount > 0 && (
              <span
                className="shrink-0 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive"
                title={`${ex.failCount} failed attempt${ex.failCount > 1 ? "s" : ""}`}
              >
                {ex.failCount}F
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {ex.category}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {ex.entries.length} session{ex.entries.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-xl font-display text-foreground tabular-nums">{ex.currentWeight}</span>
          <span className="text-xs font-bold text-muted-foreground">{ex.unit}</span>
          {ex.useRatio && (
            <span className="text-[10px] font-bold text-muted-foreground">{ex.ratio.toFixed(2)}x BW</span>
          )}
        </div>

        {hasProgress ? (
          <div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
              />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground mt-1">{ex.level.label}</p>
          </div>
        ) : (
          <p className="text-[10px] font-bold text-muted-foreground italic">Tracked in {ex.unit}</p>
        )}
      </button>

      {/* Desktop layout — 90px tall single row */}
      <button
        onClick={() => onSelect(ex.name)}
        className="hidden lg:flex w-full text-left h-[90px] px-5 items-center gap-4 cursor-pointer"
      >
        <span className="text-2xl shrink-0">{ex.level.icon}</span>

        <div className="w-64 shrink-0 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-extrabold text-[18px] leading-tight text-foreground truncate">{ex.name}</h3>
            {ex.failCount > 0 && (
              <span className="shrink-0 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">
                {ex.failCount}F
              </span>
            )}
          </div>
          <div className="flex gap-1.5 mt-1.5">
            <span className="text-[13px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {ex.category}
            </span>
            <span className="text-[13px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {ex.entries.length} session{ex.entries.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {hasProgress ? (
            <>
              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
                />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground mt-1">{ex.level.label}</p>
            </>
          ) : (
            <p className="text-[11px] font-bold text-muted-foreground italic">Tracked in {ex.unit}</p>
          )}
        </div>

        <div className="text-right shrink-0 min-w-[88px]">
          <span className="text-[22px] font-display text-foreground tabular-nums leading-none">{ex.currentWeight}</span>
          <span className="text-[16px] font-bold text-muted-foreground ml-1">{ex.unit}</span>
          {ex.useRatio && (
            <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{ex.ratio.toFixed(2)}x BW</p>
          )}
        </div>

        <div className="w-[54px] shrink-0 flex justify-end">
          {isPR && (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent">
              ⭐ PR
            </span>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    </motion.div>
  );
}

