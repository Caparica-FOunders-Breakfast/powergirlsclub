import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Award, ChevronRight, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useExerciseScorecard, getLevel, getLevelProgress, type ExerciseEntry } from "@/hooks/useExerciseScorecard";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ExerciseDetail } from "./ExerciseDetail";
import { StrengthSummary } from "./StrengthSummary";

export function ExerciseScorecard() {
  const { data: grouped, isLoading } = useExerciseScorecard();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [bodyWeight, setBodyWeight] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const bw = profile?.body_weight ? Number(profile.body_weight) : null;

  const handleSaveWeight = async () => {
    const val = parseFloat(bodyWeight);
    if (!val || val <= 0) return;
    await updateProfile.mutateAsync({ body_weight: val } as any);
    setBodyWeight("");
  };

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
    "jkk": "reps",
  };

  const getUnit = (name: string) => EXERCISE_UNITS[name] || "kg";
  const isWeightBased = (name: string) => getUnit(name) === "kg";

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

  // Build exercise cards sorted by most recent activity
  const exercises = Array.from(grouped.entries()).map(([name, entries]) => {
    const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const currentWeight = sorted[0].weight;
    const bestWeight = Math.max(...entries.map((e) => e.weight));
    const unit = getUnit(name);
    const useRatio = unit === "kg" && !!bw;
    const ratio = useRatio ? currentWeight / bw! : 0;
    const level = useRatio ? getLevel(ratio) : { label: "—" as const, icon: "📈", index: -1 };
    const category = EXERCISE_CATEGORIES[name] || "🏋️ Other";
    return { name, entries: sorted, currentWeight, bestWeight, ratio, level, category, unit, useRatio };
  });

  // Group by category
  const groupedByCategory = new Map<string, typeof exercises>();
  for (const ex of exercises) {
    if (!groupedByCategory.has(ex.category)) groupedByCategory.set(ex.category, []);
    groupedByCategory.get(ex.category)!.push(ex);
  }
  // Sort within each category by best weight descending
  for (const [, exs] of groupedByCategory) {
    exs.sort((a, b) => b.bestWeight - a.bestWeight);
  }
  const sortedCategories = CATEGORY_ORDER.filter((c) => groupedByCategory.has(c));

  // Detail view
  if (selectedExercise) {
    const ex = exercises.find((e) => e.name === selectedExercise);
    if (ex) {
      return (
        <ExerciseDetail
          exercise={ex}
          bodyWeight={bw}
          onBack={() => setSelectedExercise(null)}
        />
      );
    }
  }

  return (
    <div className="space-y-4">
      {/* Body Weight Input */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-2xl border-2 border-border bg-card p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Body Weight</p>
            {bw ? (
              <p className="text-2xl font-display text-foreground">{bw} <span className="text-sm font-bold text-muted-foreground">kg</span></p>
            ) : (
              <p className="text-sm font-bold text-muted-foreground">Not set</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder={bw ? String(bw) : "kg"}
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              className="w-20 h-9 text-center border-2 border-border"
            />
            <Button
              size="sm"
              onClick={handleSaveWeight}
              disabled={!bodyWeight}
              className="h-9 font-bold"
            >
              Save
            </Button>
          </div>
        </div>
      </motion.div>

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

      {/* Grouped Exercise Cards */}
      {sortedCategories.map((category, catIdx) => (
        <div key={category} className="space-y-3">
          <motion.h3
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: catIdx * 0.08 }}
            className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-1 pt-2"
          >
            {category}
          </motion.h3>

          {groupedByCategory.get(category)!.map((ex, i) => {
            const isPR = ex.currentWeight === ex.bestWeight && ex.entries.length > 1;
            const progress = bw ? getLevelProgress(ex.ratio) : 0;

            return (
              <motion.button
                key={ex.name}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: catIdx * 0.08 + i * 0.04 }}
                onClick={() => setSelectedExercise(ex.name)}
                className="w-full text-left rounded-2xl border-2 border-border bg-card p-4 transition-all hover:border-primary/30 active:scale-[0.98]"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{ex.level.icon}</span>
                    <h3 className="font-extrabold text-sm text-foreground truncate">{ex.name}</h3>
                    {isPR && (
                      <span className="shrink-0 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground">
                        PR
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>

                {/* Stats row */}
                <div className="flex items-baseline gap-4 mb-3">
                  <div>
                    <span className="text-xl font-display text-foreground">{ex.currentWeight}</span>
                    <span className="text-xs font-bold text-muted-foreground ml-1">{ex.unit}</span>
                  </div>
                  {ex.bestWeight > ex.currentWeight && (
                    <div className="text-xs font-bold text-muted-foreground">
                      Best: <span className="text-primary">{ex.bestWeight} {ex.unit}</span>
                    </div>
                  )}
                  {ex.useRatio && (
                    <div className="text-xs font-bold text-muted-foreground ml-auto">
                      {ex.ratio.toFixed(2)}x BW
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {ex.useRatio ? (
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
                      />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground">{ex.level.label}</p>
                  </div>
                ) : (
                  <p className="text-[10px] font-bold text-muted-foreground italic">
                    Tracked in {ex.unit}
                  </p>
                )}

                {/* Mini trend dots */}
                <div className="flex items-end gap-[3px] mt-3 h-5">
                  {ex.entries.slice(0, 12).reverse().map((entry, j) => {
                    const max = ex.bestWeight || 1;
                    const h = Math.max(4, (entry.weight / max) * 20);
                    return (
                      <div
                        key={j}
                        className="w-[5px] rounded-full bg-primary/40"
                        style={{ height: `${h}px` }}
                      />
                    );
                  })}
                </div>
              </motion.button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
