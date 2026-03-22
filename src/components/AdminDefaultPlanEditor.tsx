import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDefaultWorkoutPlan, useSaveDefaultDay } from "@/hooks/useDefaultWorkoutPlan";
import { useToast } from "@/hooks/use-toast";
import ExerciseEditor from "@/components/ExerciseEditor";
import { type Exercise } from "@/data/workoutPlan";

const AdminDefaultPlanEditor = () => {
  const { plan, isLoading } = useDefaultWorkoutPlan();
  const saveDay = useSaveDefaultDay();
  const { toast } = useToast();
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  if (isLoading) return null;

  const handleSave = async (dayIndex: number, exercises: Exercise[]) => {
    const day = plan[dayIndex];
    try {
      await saveDay.mutateAsync({
        dayIndex,
        exercises,
        label: day.label,
        emoji: day.emoji,
        isRest: day.isRest,
        isRecovery: day.isRecovery,
        restNote: day.restNote,
      });
      setEditingDay(null);
      toast({ title: "Default plan updated! ✨" });
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-card rounded-2xl comic-border p-5"
    >
      <h2 className="text-2xl font-display text-foreground mb-1">⚙️ Default Workout Plan</h2>
      <p className="text-sm text-muted-foreground font-bold mb-4">Edit the template all users start with</p>

      <div className="space-y-2">
        {plan.map((day, idx) => (
          <div key={idx} className="rounded-xl border-2 border-border overflow-hidden">
            <button
              onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-xl">{day.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">{day.day}</p>
                <p className="text-xs text-muted-foreground">{day.label} · {day.exercises.length} exercises</p>
              </div>
              {expandedDay === idx ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {expandedDay === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {editingDay === idx ? (
                    <ExerciseEditor
                      day={day}
                      dayIndex={idx}
                      hasCustom={false}
                      onSave={(exercises) => handleSave(idx, exercises)}
                      onReset={() => {}}
                      onClose={() => setEditingDay(null)}
                    />
                  ) : (
                    <div className="px-4 pb-3 space-y-1">
                      {day.isRest || day.isRecovery ? (
                        <p className="text-sm text-muted-foreground italic">{day.restNote || "Rest day"}</p>
                      ) : (
                        day.exercises.map((ex, eIdx) => (
                          <div key={eIdx} className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{eIdx + 1}.</span>
                            <span className="font-semibold text-foreground">{ex.name}</span>
                            <span className="text-muted-foreground">
                              {ex.sets}×{ex.reps} · {ex.suggestedWeight}
                            </span>
                          </div>
                        ))
                      )}
                      {!day.isRest && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingDay(idx)}
                          className="mt-2 text-primary font-bold"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Exercises
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default AdminDefaultPlanEditor;
