import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GripVertical, RotateCcw, Save, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type Exercise, type WorkoutDay } from "@/data/workoutPlan";

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

        {exercises.map((ex, idx) => (
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

            <div className="grid grid-cols-3 gap-2">
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
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Weight</label>
                <Input
                  value={ex.suggestedWeight}
                  onChange={(e) => updateExercise(idx, "suggestedWeight", e.target.value)}
                  placeholder="kg"
                  className="h-7 text-xs text-center border-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Progression</label>
              <Input
                value={ex.progression}
                onChange={(e) => updateExercise(idx, "progression", e.target.value)}
                placeholder="e.g. +2 kg, Add reps, -2 kg assist"
                className="h-7 text-xs border-primary/20"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {([
                { key: "isBodyweight", label: "Bodyweight" },
                { key: "isTimeBased", label: "Time-based" },
                { key: "isRoundsBased", label: "Rounds" },
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
        ))}

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
