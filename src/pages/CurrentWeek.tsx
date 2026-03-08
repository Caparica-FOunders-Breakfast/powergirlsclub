import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Dumbbell, Music, Zap, TrendingUp } from "lucide-react";
import { useCurrentReward } from "@/hooks/useRewards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { weeklyPlan, type WorkoutDay, type Exercise } from "@/data/workoutPlan";

const CurrentWeek = () => {
  const { data: reward } = useCurrentReward();
  const { toast } = useToast();

  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  const todayIndex = today === 0 ? 6 : today - 1; // convert to 0=Mon

  const [expandedDay, setExpandedDay] = useState<number | null>(todayIndex);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [loggedWeights, setLoggedWeights] = useState<Record<string, string>>({});

  const getExKey = (dayIdx: number, exIdx: number) => `${dayIdx}-${exIdx}`;

  const getDayCompletion = (dayIdx: number, day: WorkoutDay) => {
    if (day.isRest || day.isRecovery || day.exercises.length === 0) return 100;
    const total = day.exercises.length;
    const done = day.exercises.filter((_, i) => completedExercises[getExKey(dayIdx, i)]).length;
    return Math.round((done / total) * 100);
  };

  const totalWorkoutDays = weeklyPlan.filter((d) => !d.isRest && !d.isRecovery && d.exercises.length > 0).length;
  const completedDays = weeklyPlan.filter((d, i) => {
    if (d.isRest || d.isRecovery || d.exercises.length === 0) return false;
    return getDayCompletion(i, d) === 100;
  }).length;
  const weeklyScore = Math.round((completedDays / totalWorkoutDays) * 100);

  const toggleExercise = (dayIdx: number, exIdx: number) => {
    const key = getExKey(dayIdx, exIdx);
    const newVal = !completedExercises[key];
    setCompletedExercises((prev) => ({ ...prev, [key]: newVal }));

    if (newVal) {
      confetti({
        particleCount: 30,
        spread: 50,
        colors: ["#FF2D87", "#00F5D4", "#FFE600", "#5271FF"],
        origin: { y: 0.8 },
        gravity: 1.2,
      });
    }
  };

  const handleCompleteDay = (dayIdx: number, day: WorkoutDay) => {
    const updates: Record<string, boolean> = {};
    day.exercises.forEach((_, i) => {
      updates[getExKey(dayIdx, i)] = true;
    });
    setCompletedExercises((prev) => ({ ...prev, ...updates }));
    confetti({
      particleCount: 120,
      spread: 80,
      colors: ["#FF2D87", "#00F5D4", "#FFE600", "#5271FF"],
      origin: { y: 0.6 },
    });
    toast({ title: "DAY CRUSHED! 💪🔥" });
  };

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-4">
        <h1 className="text-4xl font-display text-foreground">
          <Dumbbell className="inline w-8 h-8 text-neon-teal mr-2" />
          This Week
        </h1>
        <p className="text-muted-foreground font-bold text-sm mt-1">Your strength training program</p>
      </motion.div>

      {/* Weekly progress */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-4 p-4 rounded-2xl bg-card border-2 border-border"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-extrabold text-foreground">Weekly Progress</span>
          <span className="text-sm font-display text-primary">{weeklyScore}%</span>
        </div>
        <Progress value={weeklyScore} className="h-3 bg-muted [&>div]:gradient-primary" />
        <p className="text-xs text-muted-foreground font-semibold mt-1.5">{completedDays}/{totalWorkoutDays} workout days completed</p>
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
              <Music className="w-6 h-6 text-neon-pink shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">🎵 Song of the Week</p>
                <p className="font-extrabold text-foreground">{reward.reward_value}</p>
              </div>
            </div>
          )}
          {reward.reward_type === "challenge" && (
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-neon-yellow shrink-0" />
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

      {/* Day cards */}
      <div className="space-y-3">
        {weeklyPlan.map((day, dayIdx) => {
          const expanded = expandedDay === dayIdx;
          const completion = getDayCompletion(dayIdx, day);
          const isToday = dayIdx === todayIndex;

          return (
            <motion.div
              key={day.day}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: dayIdx * 0.04 }}
              className={cn(
                "rounded-2xl border-2 overflow-hidden transition-all",
                isToday && "ring-2 ring-primary/40",
                completion === 100 && !day.isRest && !day.isRecovery && day.exercises.length > 0
                  ? "bg-secondary/10 border-secondary"
                  : "bg-card border-border hover:border-primary/30"
              )}
            >
              {/* Day header */}
              <button
                onClick={() => setExpandedDay(expanded ? null : dayIdx)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0",
                  isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {day.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-foreground truncate">{day.day}</p>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Today</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-bold">
                    {day.label}
                    {!day.isRest && !day.isRecovery && day.exercises.length > 0 && ` • ${day.exercises.length} exercises`}
                  </p>
                  {/* Mini progress bar */}
                  {!day.isRest && !day.isRecovery && day.exercises.length > 0 && (
                    <div className="mt-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all duration-500"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  )}
                </div>
                {completion === 100 && !day.isRest && !day.isRecovery && day.exercises.length > 0 ? (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-secondary-foreground" />
                  </div>
                ) : (
                  <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform shrink-0", expanded && "rotate-180")} />
                )}
              </button>

              {/* Expanded content */}
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      {/* Rest / Recovery days */}
                      {(day.isRest || day.isRecovery) && day.restNote && (
                        <div className="p-4 rounded-xl bg-muted/50 text-center">
                          <p className="text-3xl mb-2">{day.isRecovery ? "🌿" : "😴"}</p>
                          <p className="font-bold text-foreground text-sm">{day.restNote}</p>
                        </div>
                      )}

                      {/* Exercise cards */}
                      {day.exercises.length > 0 && (
                        <div className="space-y-2.5">
                          {day.exercises.map((ex, exIdx) => {
                            const key = getExKey(dayIdx, exIdx);
                            const isDone = completedExercises[key];

                            return (
                              <ExerciseCard
                                key={key}
                                exercise={ex}
                                isDone={isDone}
                                weight={loggedWeights[key] || ""}
                                onWeightChange={(val) =>
                                  setLoggedWeights((prev) => ({ ...prev, [key]: val }))
                                }
                                onToggle={() => toggleExercise(dayIdx, exIdx)}
                              />
                            );
                          })}

                          {/* Complete all button */}
                          {completion < 100 && (
                            <Button
                              onClick={() => handleCompleteDay(dayIdx, day)}
                              className="w-full mt-2 gradient-primary text-primary-foreground font-bold comic-border border-primary-foreground/20"
                            >
                              Complete All 🔥
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

function ExerciseCard({
  exercise,
  isDone,
  weight,
  onWeightChange,
  onToggle,
}: {
  exercise: Exercise;
  isDone: boolean;
  weight: string;
  onWeightChange: (val: string) => void;
  onToggle: () => void;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border-2 p-3 transition-all",
        isDone
          ? "bg-secondary/5 border-secondary/40"
          : "bg-background border-border"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={cn(
            "mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
            isDone
              ? "bg-secondary border-secondary text-secondary-foreground"
              : "border-primary/40 hover:border-primary"
          )}
        >
          {isDone && <Check className="w-3.5 h-3.5" />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Exercise name */}
          <p className={cn(
            "font-extrabold text-sm text-foreground",
            isDone && "line-through opacity-50"
          )}>
            {exercise.name}
          </p>

          {/* Sets × Reps */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-xs font-bold text-primary">
              {exercise.sets} × {exercise.reps}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {exercise.suggestedWeight}
            </span>
          </div>

          {/* Progression */}
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-neon-teal shrink-0" />
            <span className="text-[11px] font-semibold text-neon-teal">{exercise.progression}</span>
          </div>
        </div>

        {/* Weight input */}
        {!exercise.isBodyweight && !exercise.isTimeBased && (
          <div className="shrink-0">
            <Input
              type="number"
              placeholder="kg"
              value={weight}
              onChange={(e) => onWeightChange(e.target.value)}
              className={cn(
                "w-16 h-8 text-center text-xs font-bold border-2 border-primary/20 rounded-lg",
                isDone && "opacity-50"
              )}
              disabled={isDone}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default CurrentWeek;
