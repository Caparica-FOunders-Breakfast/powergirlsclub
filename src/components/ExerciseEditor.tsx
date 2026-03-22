import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GripVertical, RotateCcw, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type Exercise, type WorkoutDay } from "@/data/workoutPlan";
import { useProfile } from "@/hooks/useProfile";

const DEFAULT_RATIOS = [0.35, 0.60, 0.85, 1.20, 1.60];
const DEFAULT_TIME_THRESHOLDS = [15, 30, 60, 90, 120]; // seconds
const DEFAULT_REPS_THRESHOLDS = [5, 10, 20, 35, 50]; // reps
// Assisted: assistance weight goes DOWN (BW → 0). Fractions of BW still needed as assist.
const ASSISTED_FRACTIONS = [1.0, 0.75, 0.50, 0.25, 0.0];

const LEVEL_DEFS = [
  { icon: "🌱", label: "Beginner", hint: "< 0.35x" },
  { icon: "💪", label: "Getting Stronger", hint: "0.35–0.60x" },
  { icon: "⚡", label: "Strong", hint: "0.60–0.85x" },
  { icon: "🔥", label: "Very Strong", hint: "0.85–1.20x" },
  { icon: "👑", label: "Elite", hint: "> 1.20x" },
];

const ASSISTED_LEVEL_DEFS = [
  { icon: "🌱", label: "Beginner", hint: "= BW assist" },
  { icon: "💪", label: "Getting Stronger", hint: "75% BW" },
  { icon: "⚡", label: "Strong", hint: "50% BW" },
  { icon: "🔥", label: "Very Strong", hint: "25% BW" },
  { icon: "👑", label: "Elite", hint: "0 kg (unassisted)" },
];

interface ExerciseEditorProps {
  day: WorkoutDay;
  dayIndex: number;
  hasCustom: boolean;
  onSave: (exercises: Exercise[]) => void;
  onReset: () => void;
  onClose: () => void;
}

const ExerciseEditor = ({ day, dayIndex, hasCustom, onSave, onReset, onClose }: ExerciseEditorProps) => {
  const [exercises, setExercises] = useState<Exercise[]>([...day.exercises]);
  const [levelsOpen, setLevelsOpen] = useState<Record<number, boolean>>({});
  const { data: profile } = useProfile();
  const bodyWeight = profile?.body_weight ?? null;

  const getDefaultThresholds = (): number[] => {
    if (!bodyWeight) return DEFAULT_RATIOS.map((r) => Math.round(r * 70));
    return DEFAULT_RATIOS.map((r) => Math.round(r * bodyWeight));
  };

  const getAssistedDefaults = (): number[] => {
    const bw = bodyWeight ?? 70;
    return ASSISTED_FRACTIONS.map((f) => Math.round(f * bw));
  };

  const addExercise = () => {
    setExercises([...exercises, {
      name: "",
      sets: 3,
      reps: "10",
      suggestedWeight: "",
      progression: "",
    }]);
  };

  const removeExercise = (idx: number) => {
    setExercises(exercises.filter((_, i) => i !== idx));
    setLevelsOpen((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const updateExercise = (idx: number, field: keyof Exercise, value: any) => {
    setExercises(exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };

  const updateThreshold = (exIdx: number, levelIdx: number, value: number) => {
    setExercises(exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const thresholds = [...(ex.levelThresholds || getDefaultThresholds())];
      thresholds[levelIdx] = value;
      return { ...ex, levelThresholds: thresholds };
    }));
  };

  const handleSave = () => {
    const validExercises = exercises.filter((ex) => ex.name.trim());
    onSave(validExercises);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase text-muted-foreground">Edit Exercises</p>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {exercises.map((ex, idx) => {
          const isAssisted = !!ex.isAssisted;
          const thresholds = ex.levelThresholds || (isAssisted ? getAssistedDefaults() : getDefaultThresholds());
          const levelDefs = isAssisted ? ASSISTED_LEVEL_DEFS : LEVEL_DEFS;
          const isLevelsOpen = levelsOpen[idx] ?? false;
          const showLevels = !ex.isTimeBased && !ex.isRoundsBased;

          return (
            <motion.div
              key={idx}
              layout
              className="p-3 rounded-xl border-2 border-border bg-background space-y-2"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  value={ex.name}
                  onChange={(e) => updateExercise(idx, "name", e.target.value)}
                  placeholder="Exercise name"
                  className="flex-1 h-8 text-sm font-bold border-primary/20"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeExercise(idx)}
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Sets</label>
                  <Input
                    type="number"
                    value={ex.sets}
                    onChange={(e) => updateExercise(idx, "sets", parseInt(e.target.value) || 0)}
                    className="h-7 text-xs text-center border-primary/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Reps</label>
                  <Input
                    value={ex.reps}
                    onChange={(e) => updateExercise(idx, "reps", e.target.value)}
                    placeholder="10"
                    className="h-7 text-xs text-center border-primary/20"
                  />
                </div>
              </div>

              {/* Strength Level Selector */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  {isAssisted ? "Assistance Level" : "Strength Level"}
                </label>
                <div className="flex gap-1 mt-1">
                  {levelDefs.map((level, lIdx) => {
                    const weight = thresholds[lIdx];
                    const prevWeight = lIdx > 0 ? thresholds[lIdx - 1] : 0;
                    const rangeLabel = isAssisted
                      ? (lIdx === 0 ? `≥ ${weight} kg` : lIdx === levelDefs.length - 1 ? `${weight} kg` : `${weight}–${thresholds[lIdx - 1]} kg`)
                      : (lIdx === 0 ? `< ${weight} kg` : lIdx === levelDefs.length - 1 ? `≥ ${weight} kg` : `${prevWeight}–${weight} kg`);
                    const isSelected = ex.suggestedWeight === rangeLabel;
                    return (
                      <button
                        key={lIdx}
                        type="button"
                        onClick={() => updateExercise(idx, "suggestedWeight", rangeLabel)}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg border-2 transition-all text-center",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border hover:border-primary/30 bg-transparent"
                        )}
                      >
                        <span className="text-sm leading-none">{level.icon}</span>
                        <span className={cn(
                          "text-[7px] font-bold leading-tight whitespace-nowrap",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}>
                          {rangeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Progression per week ({isAssisted ? "kg less assist" : ex.isTimeBased ? "sec" : ex.isRoundsBased ? "reps" : "kg"})
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground">{isAssisted ? "−" : "+"}</span>
                  <Input
                    type="number"
                    step="0.5"
                    value={ex.progression?.replace(/[^0-9.\-]/g, "") || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const prefix = isAssisted ? "-" : "+";
                      const unit = isAssisted ? " kg/week" : ex.isTimeBased ? " sec/week" : ex.isRoundsBased ? " reps/week" : " kg/week";
                      updateExercise(idx, "progression", val ? `${prefix}${val}${unit}` : "");
                    }}
                    placeholder={isAssisted ? "2" : "2.5"}
                    className="h-7 text-xs text-center border-primary/20 flex-1"
                  />
                  <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                    {isAssisted ? "kg/week" : ex.isTimeBased ? "sec/week" : ex.isRoundsBased ? "reps/week" : "kg/week"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {([
                  { key: "isBodyweight", label: "Weight" },
                  { key: "isTimeBased", label: "Time-based" },
                  { key: "isRoundsBased", label: "Reps" },
                  { key: "isAssisted", label: "Assisted" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateExercise(idx, key, !ex[key])}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors",
                      ex[key]
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Strength Level Thresholds */}
              {showLevels && (
                <div>
                  <button
                    type="button"
                    onClick={() => setLevelsOpen((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors w-full"
                  >
                    <span>Strength Levels</span>
                    <span className="text-[9px] font-normal normal-case tracking-normal text-muted-foreground/70">
                      {bodyWeight ? `(${bodyWeight} kg BW)` : "(set BW in profile)"}
                    </span>
                    <span className="ml-auto">
                      {isLevelsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isLevelsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 space-y-1.5">
                          {levelDefs.map((level, lIdx) => (
                            <div key={lIdx} className="flex items-center gap-2">
                              <span className="text-sm w-5 text-center">{level.icon}</span>
                              <span className="text-[10px] font-bold text-foreground flex-1 min-w-0 truncate">
                                {level.label}
                              </span>
                              <span className="text-[9px] text-muted-foreground/60 shrink-0 w-16 text-right">
                                {level.hint}
                              </span>
                              <Input
                                type="number"
                                value={thresholds[lIdx] ?? ""}
                                onChange={(e) => updateThreshold(idx, lIdx, parseFloat(e.target.value) || 0)}
                                className="h-6 w-16 text-[11px] text-center border-primary/20 shrink-0"
                                placeholder={isAssisted ? "kg assist" : "kg"}
                              />
                              <span className="text-[9px] text-muted-foreground font-bold">
                                {isAssisted ? "kg assist" : "kg"}
                              </span>
                            </div>
                          ))}
                          {!ex.levelThresholds && (
                            <p className="text-[9px] text-muted-foreground/50 italic">
                              Auto-calculated from body weight. Edit to customize.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          );
        })}

        <Button
          variant="outline"
          onClick={addExercise}
          className="w-full border-dashed border-2 border-primary/30 text-primary font-bold text-sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Exercise
        </Button>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1 gradient-primary text-primary-foreground font-bold">
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
          {hasCustom && (
            <Button variant="outline" onClick={onReset} className="text-muted-foreground font-bold">
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ExerciseEditor;