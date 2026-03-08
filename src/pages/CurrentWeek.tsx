import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Dumbbell, Music, Zap, Plus } from "lucide-react";
import { useWeeklyWorkouts, useMyEntries, useCompleteWorkout, useCreateWorkout, useCurrentWeekStart } from "@/hooks/useWorkouts";
import { useCurrentReward } from "@/hooks/useRewards";
import { useUserRole } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CurrentWeek = () => {
  const { data: workouts, isLoading } = useWeeklyWorkouts();
  const { data: entries } = useMyEntries();
  const { data: reward } = useCurrentReward();
  const { data: role } = useUserRole();
  const completeWorkout = useCompleteWorkout();
  const createWorkout = useCreateWorkout();
  const weekStart = useCurrentWeekStart();
  const { toast } = useToast();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [weights, setWeights] = useState<Record<string, Record<string, number>>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDay, setNewDay] = useState(0);
  const [newExercises, setNewExercises] = useState("");

  const isAdmin = role === "admin";

  const isCompleted = (workoutId: string) =>
    entries?.some((e) => e.workout_id === workoutId && e.completed);

  const handleComplete = async (workoutId: string) => {
    try {
      await completeWorkout.mutateAsync({
        workoutId,
        weights: weights[workoutId] || {},
      });
      confetti({
        particleCount: 100,
        spread: 70,
        colors: ["#FF2D87", "#00F5D4", "#FFE600", "#5271FF"],
        origin: { y: 0.7 },
      });
      toast({ title: "CRUSHED IT! 💪🔥", description: "Workout logged!" });
    } catch {
      toast({ title: "Error", description: "Could not log workout", variant: "destructive" });
    }
  };

  const handleAddWorkout = async () => {
    if (!newTitle.trim()) return;
    const exercises = newExercises.split(",").map((e) => e.trim()).filter(Boolean).map((name) => ({ name, suggestedWeight: 0 }));
    try {
      await createWorkout.mutateAsync({
        week_start: weekStart,
        day_of_week: newDay,
        title: newTitle,
        exercises,
      });
      setShowAddForm(false);
      setNewTitle("");
      setNewExercises("");
      toast({ title: "Workout added! 🎯" });
    } catch {
      toast({ title: "Error", description: "Could not create workout", variant: "destructive" });
    }
  };

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-4">
        <h1 className="text-4xl font-display text-foreground">
          <Dumbbell className="inline w-8 h-8 text-neon-teal mr-2" />
          This Week
        </h1>
      </motion.div>

      {/* Reward card */}
      {reward && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-neon-yellow/20 to-neon-teal/20 border-2 border-accent"
        >
          {reward.reward_type === "song" && (
            <div className="flex items-center gap-3">
              <Music className="w-6 h-6 text-neon-pink" />
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">🎵 Song of the Week</p>
                <p className="font-extrabold text-foreground">{reward.reward_value}</p>
              </div>
            </div>
          )}
          {reward.reward_type === "challenge" && (
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-neon-yellow" />
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">⚡ Mini Challenge</p>
                <p className="font-extrabold text-foreground">{reward.reward_value}</p>
              </div>
            </div>
          )}
          {reward.reward_type === "recovery" && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧘</span>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Sunday Recovery</p>
                <p className="font-extrabold text-foreground">{reward.reward_value}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : !workouts || workouts.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl comic-border">
          <p className="text-5xl mb-3">📋</p>
          <h2 className="text-2xl font-display text-foreground">No Workouts Yet</h2>
          <p className="text-muted-foreground font-semibold mt-2">
            {isAdmin ? "Add workouts for the squad!" : "The admin hasn't set this week's plan yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((workout, i) => {
            const completed = isCompleted(workout.id);
            const expanded = expandedId === workout.id;
            const exercises = (workout.exercises as any[]) || [];

            return (
              <motion.div
                key={workout.id}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "rounded-2xl border-2 overflow-hidden transition-all",
                  completed
                    ? "bg-secondary/10 border-secondary"
                    : "bg-card border-border hover:border-primary/40"
                )}
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : workout.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-display text-sm",
                    completed ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary"
                  )}>
                    {completed ? <Check className="w-5 h-5" /> : DAYS[workout.day_of_week]}
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-extrabold text-foreground", completed && "line-through opacity-60")}>
                      {workout.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {exercises.length} exercises • {DAYS[workout.day_of_week]}
                    </p>
                  </div>
                  <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {expanded && !completed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        {exercises.map((ex: any, j: number) => (
                          <div key={j} className="flex items-center gap-3">
                            <span className="text-sm font-bold text-foreground flex-1">{ex.name}</span>
                            <Input
                              type="number"
                              placeholder="kg"
                              className="w-20 h-8 text-center text-sm border-2 border-primary/30"
                              value={weights[workout.id]?.[ex.name] || ""}
                              onChange={(e) =>
                                setWeights((prev) => ({
                                  ...prev,
                                  [workout.id]: {
                                    ...prev[workout.id],
                                    [ex.name]: Number(e.target.value),
                                  },
                                }))
                              }
                            />
                          </div>
                        ))}
                        <Button
                          onClick={() => handleComplete(workout.id)}
                          disabled={completeWorkout.isPending}
                          className="w-full gradient-primary text-primary-foreground font-bold comic-border border-primary-foreground/20"
                        >
                          Complete Workout 🔥
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Admin: Add Workout */}
      {isAdmin && (
        <div className="mt-6">
          {showAddForm ? (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-card rounded-2xl p-4 comic-border space-y-3"
            >
              <h3 className="font-display text-xl text-foreground">Add Workout</h3>
              <select
                value={newDay}
                onChange={(e) => setNewDay(Number(e.target.value))}
                className="w-full h-10 rounded-lg border-2 border-primary/30 bg-background px-3 text-sm font-bold"
              >
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <Input
                placeholder="Workout title (e.g. Upper Body Blast)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="border-2 border-primary/30"
              />
              <Input
                placeholder="Exercises (comma-separated)"
                value={newExercises}
                onChange={(e) => setNewExercises(e.target.value)}
                className="border-2 border-primary/30"
              />
              <div className="flex gap-2">
                <Button onClick={handleAddWorkout} className="flex-1 gradient-primary text-primary-foreground font-bold">
                  Add 🎯
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full gradient-accent text-accent-foreground font-bold comic-border"
            >
              <Plus className="w-5 h-5 mr-1" /> Add Workout
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default CurrentWeek;
