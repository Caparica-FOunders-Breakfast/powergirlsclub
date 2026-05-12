import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, GripVertical, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type Exercise, type WorkoutDay } from "@/data/workoutPlan";
import { useDebouncedCallback } from "@/hooks/useDebounce";

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

  // Skip the first effect run — that's the initial mount with the day's exercises,
  // not a user edit. After that, every change autosaves via the debounced callback.
  const hydrated = useRef(false);
  const latestExercises = useRef(exercises);
  latestExercises.current = exercises;

  const autosave = useDebouncedCallback((next: Exercise[]) => {
    const valid = next.filter((ex) => ex.name.trim());
    onSave(valid);
  }, 800);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    autosave(exercises);
  }, [exercises, autosave]);

  // If the user closes the editor before the debounce fires, flush the latest state.
  useEffect(
    () => () => autosave.flush(latestExercises.current),
    [autosave],
  );

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
  };

  const updateExercise = (idx: number, field: keyof Exercise, value: any) => {
    setExercises(exercises.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
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

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Video URL (YouTube)
                </label>
                <Input
                  type="url"
                  inputMode="url"
                  value={ex.videoUrl ?? ""}
                  onChange={(e) => updateExercise(idx, "videoUrl", e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="h-7 text-xs border-primary/20"
                />
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

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] font-bold text-muted-foreground">
            Changes save automatically
          </p>
          {hasCustom && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 text-xs text-muted-foreground font-bold"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset to default
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ExerciseEditor;
