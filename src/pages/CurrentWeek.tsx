import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Dumbbell, Pencil, TrendingUp } from "lucide-react";
import { useExerciseLogs, useSaveExerciseLog } from "@/hooks/useExerciseLogs";
import { useActiveChallenge, useChallengeProgress } from "@/hooks/useChallenge";
import { usePersonalWorkoutPlan, useSavePersonalDay, useResetPersonalDay } from "@/hooks/usePersonalWorkoutPlan";
import ExerciseEditor from "@/components/ExerciseEditor";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { type WorkoutDay, type Exercise } from "@/data/workoutPlan";
import { startOfWeek, addWeeks, addDays, format, isSameWeek, differenceInDays } from "date-fns";

const getWeekStart = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");

const CurrentWeek = () => {
  const { data: challenge } = useActiveChallenge();
  const progress = useChallengeProgress(challenge?.start_date ?? null);
  const { plan: weeklyPlan, hasCustom } = usePersonalWorkoutPlan();
  const savePersonalDay = useSavePersonalDay();
  const resetPersonalDay = useResetPersonalDay();
  const { toast } = useToast();

  const now = new Date();
  const currentWeekDate = startOfWeek(now, { weekStartsOn: 1 });
  const [weekOffset, setWeekOffset] = useState(0);

  const selectedWeekDate = addWeeks(currentWeekDate, weekOffset);
  const weekStart = getWeekStart(selectedWeekDate);
  const prevWeekStart = getWeekStart(addWeeks(selectedWeekDate, -1));
  const isCurrentWeek = weekOffset === 0;

  const { data: logs, isLoading: logsLoading } = useExerciseLogs(weekStart);
  const { data: prevLogs } = useExerciseLogs(prevWeekStart);
  const saveLog = useSaveExerciseLog(weekStart);

  const today = now.getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  const [expandedDay, setExpandedDay] = useState<number | null>(isCurrentWeek ? todayIndex : null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [localWeights, setLocalWeights] = useState<Record<string, string>>({});
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);

  // Reset state when week changes
  useEffect(() => {
    setInitialized(false);
    setLocalWeights({});
    setLocalCompleted({});
    setExpandedDay(isCurrentWeek ? todayIndex : null);
  }, [weekStart, isCurrentWeek, todayIndex]);

  // Hydrate local state from DB
  useEffect(() => {
    if (logs && !initialized) {
      const w: Record<string, string> = {};
      const c: Record<string, boolean> = {};
      Object.entries(logs).forEach(([key, log]) => {
        if (log.weight_used != null) w[key] = String(log.weight_used);
        c[key] = log.completed;
      });
      setLocalWeights(w);
      setLocalCompleted(c);
      setInitialized(true);
    }
  }, [logs, initialized]);

  // Build previous week weight map
  const prevWeightMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (prevLogs) {
      Object.entries(prevLogs).forEach(([key, log]) => {
        if (log.weight_used != null) map[key] = Number(log.weight_used);
      });
    }
    return map;
  }, [prevLogs]);

  const getExKey = (dayIdx: number, exIdx: number) => `${dayIdx}-${exIdx}`;

  const getDayCompletion = (dayIdx: number, day: WorkoutDay) => {
    if (day.exercises.length === 0) return day.isRest || day.isRecovery ? 100 : 0;
    const total = day.exercises.length;
    const done = day.exercises.filter((_, i) => localCompleted[getExKey(dayIdx, i)]).length;
    return Math.round((done / total) * 100);
  };

  const totalWorkoutDays = weeklyPlan.filter((d) => !d.isRest && !d.isRecovery && d.exercises.length > 0).length;
  const completedDays = weeklyPlan.filter((d, i) => {
    if (d.isRest || d.isRecovery || d.exercises.length === 0) return false;
    return getDayCompletion(i, d) === 100;
  }).length;
  const weeklyScore = Math.round((completedDays / totalWorkoutDays) * 100);

  const saveExercise = useCallback(
    (dayIdx: number, exIdx: number, exerciseName: string, weight: string, completed: boolean) => {
      saveLog.mutate({
        dayIndex: dayIdx,
        exerciseIndex: exIdx,
        exerciseName,
        weightUsed: weight ? Number(weight) : null,
        completed,
      });
    },
    [saveLog]
  );

  const toggleExercise = (dayIdx: number, exIdx: number, exerciseName: string) => {
    const key = getExKey(dayIdx, exIdx);
    const newVal = !localCompleted[key];
    setLocalCompleted((prev) => ({ ...prev, [key]: newVal }));
    saveExercise(dayIdx, exIdx, exerciseName, localWeights[key] || "", newVal);

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

  const handleWeightChange = (dayIdx: number, exIdx: number, exerciseName: string, value: string) => {
    const key = getExKey(dayIdx, exIdx);
    setLocalWeights((prev) => ({ ...prev, [key]: value }));
  };

  const handleWeightBlur = (dayIdx: number, exIdx: number, exerciseName: string) => {
    const key = getExKey(dayIdx, exIdx);
    saveExercise(dayIdx, exIdx, exerciseName, localWeights[key] || "", localCompleted[key] || false);
  };

  const handleCompleteDay = (dayIdx: number, day: WorkoutDay) => {
    const updates: Record<string, boolean> = {};
    day.exercises.forEach((ex, i) => {
      const key = getExKey(dayIdx, i);
      updates[key] = true;
      saveExercise(dayIdx, i, ex.name, localWeights[key] || "", true);
    });
    setLocalCompleted((prev) => ({ ...prev, ...updates }));
    confetti({
      particleCount: 120,
      spread: 80,
      colors: ["#FF2D87", "#00F5D4", "#FFE600", "#5271FF"],
      origin: { y: 0.6 },
    });
    toast({ title: "DAY CRUSHED! 💪🔥" });
  };

  // Calculate challenge week number for the viewed week
  // Calculate which challenge week the viewed week falls into (cycling 1-4)
  const challengeWeekNum = useMemo(() => {
    if (!challenge?.start_date) return null;
    const challengeStart = startOfWeek(new Date(challenge.start_date + "T00:00:00"), { weekStartsOn: 1 });
    const weeksDiff = Math.round(differenceInDays(selectedWeekDate, challengeStart) / 7);
    if (weeksDiff < 0) return null;
    return ((weeksDiff % 4) + 1);
  }, [challenge?.start_date, selectedWeekDate]);

  const weekLabel = isCurrentWeek
    ? "This Week"
    : weekOffset === -1
    ? "Last Week"
    : weekOffset === 1
    ? "Next Week"
    : format(selectedWeekDate, "MMM d, yyyy");

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-4">
        <h1 className="text-4xl font-display text-foreground">
          <Dumbbell className="inline w-8 h-8 text-neon-teal mr-2" />
          {weekLabel}
        </h1>
        {challengeWeekNum != null && (
          <span className="inline-block mt-1 text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            Week {challengeWeekNum}
          </span>
        )}

        {/* Week navigation */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset((o) => o - 1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-bold text-muted-foreground">
            {format(selectedWeekDate, "MMM d")} – {format(addWeeks(selectedWeekDate, 1), "MMM d")}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset((o) => o + 1)}
            className="h-8 w-8"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {!isCurrentWeek && (
          <Button
            variant="link"
            size="sm"
            onClick={() => setWeekOffset(0)}
            className="text-xs text-primary mt-1"
          >
            Go to current week
          </Button>
        )}
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
        <p className="text-xs text-muted-foreground font-semibold mt-1.5">
          {completedDays}/{totalWorkoutDays} workout days completed
        </p>
      </motion.div>

      {/* Loading state */}
      {logsLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Day cards */}
      {!logsLoading && (
        <div className="space-y-3">
          {weeklyPlan.map((day, dayIdx) => {
            const expanded = expandedDay === dayIdx;
            const completion = getDayCompletion(dayIdx, day);
            const isToday = isCurrentWeek && dayIdx === todayIndex;


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
                  <div
                    className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0",
                      isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    {day.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-foreground truncate">{day.day}</p>
                      {isToday && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-bold">
                      {day.label}
                      {!day.isRest && !day.isRecovery && day.exercises.length > 0 && ` • ${day.exercises.length} exercises`}
                    </p>
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
                    <ChevronDown
                      className={cn("w-5 h-5 text-muted-foreground transition-transform shrink-0", expanded && "rotate-180")}
                    />
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
                        {/* Edit button */}
                        {editingDay !== dayIdx && (
                          <div className="flex justify-end mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingDay(dayIdx)}
                              className="text-xs text-muted-foreground font-bold h-7"
                            >
                              <Pencil className="w-3 h-3 mr-1" /> Edit Exercises
                            </Button>
                          </div>
                        )}

                        {/* Exercise Editor */}
                        <AnimatePresence>
                          {editingDay === dayIdx && (
                            <ExerciseEditor
                              day={day}
                              dayIndex={dayIdx}
                              hasCustom={hasCustom(dayIdx)}
                              onSave={(exercises) => {
                                savePersonalDay.mutate({
                                  dayIndex: dayIdx,
                                  exercises,
                                  label: day.label,
                                  emoji: day.emoji,
                                  isRest: day.isRest,
                                  isRecovery: day.isRecovery,
                                  restNote: day.restNote,
                                });
                                setEditingDay(null);
                                toast({ title: "Exercises updated! 💪" });
                              }}
                              onReset={() => {
                                resetPersonalDay.mutate(dayIdx);
                                setEditingDay(null);
                                toast({ title: "Reset to default exercises" });
                              }}
                              onClose={() => setEditingDay(null)}
                            />
                          )}
                        </AnimatePresence>

                        {editingDay !== dayIdx && (day.isRest || day.isRecovery) && day.restNote && (
                          <div className="p-4 rounded-xl bg-muted/50 text-center">
                            <p className="text-3xl mb-2">{day.isRecovery ? "🌿" : "😴"}</p>
                            <p className="font-bold text-foreground text-sm">{day.restNote}</p>
                          </div>
                        )}

                        {editingDay !== dayIdx && day.exercises.length > 0 && (
                          <div className="space-y-2.5">
                            {day.exercises.map((ex, exIdx) => {
                              const key = getExKey(dayIdx, exIdx);
                              const isDone = localCompleted[key] || false;
                              const lastWeekWeight = prevWeightMap[key];

                              return (
                                <ExerciseCard
                                  key={key}
                                  exercise={ex}
                                  isDone={isDone}
                                  weight={localWeights[key] || ""}
                                  lastWeekWeight={lastWeekWeight}
                                  onWeightChange={(val) => handleWeightChange(dayIdx, exIdx, ex.name, val)}
                                  onWeightBlur={() => handleWeightBlur(dayIdx, exIdx, ex.name)}
                                  onToggle={() => toggleExercise(dayIdx, exIdx, ex.name)}
                                />
                              );
                            })}

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
      )}
    </div>
  );
};

function ExerciseCard({
  exercise,
  isDone,
  weight,
  lastWeekWeight,
  onWeightChange,
  onWeightBlur,
  onToggle,
}: {
  exercise: Exercise;
  isDone: boolean;
  weight: string;
  lastWeekWeight?: number;
  onWeightChange: (val: string) => void;
  onWeightBlur: () => void;
  onToggle: () => void;
}) {
  const isRounds = exercise.isRoundsBased;
  const isTime = exercise.isTimeBased;
  const isBodyweight = exercise.isBodyweight && !isTime;
  const unit = isRounds ? "rounds" : isTime ? "sec" : isBodyweight ? "reps" : "kg";
  const increment = isRounds ? 1 : isTime ? 5 : isBodyweight ? 2 : 2;
  const recommendedWeight = lastWeekWeight != null ? lastWeekWeight + increment : null;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border-2 p-3 transition-all",
        isDone ? "bg-secondary/5 border-secondary/40" : "bg-background border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={cn(
            "mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
            isDone ? "bg-secondary border-secondary text-secondary-foreground" : "border-primary/40 hover:border-primary"
          )}
        >
          {isDone && <Check className="w-3.5 h-3.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn("font-extrabold text-sm text-foreground", isDone && "line-through opacity-50")}>
            {exercise.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-xs font-bold text-primary">
              {exercise.sets} × {exercise.reps}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">{exercise.suggestedWeight}</span>
          </div>

          {/* Last week value + recommendation */}
          {lastWeekWeight != null && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Last week: {lastWeekWeight} {unit}
              </span>
              <span className="text-[11px] font-bold text-neon-teal">
                → Try {recommendedWeight} {unit} {isTime ? "⏱️" : isBodyweight ? "🔁" : "💪"}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-neon-teal shrink-0" />
            <span className="text-[11px] font-semibold text-neon-teal">{exercise.progression}</span>
          </div>
        </div>

        <div className="shrink-0">
          <Input
            type="number"
            placeholder={recommendedWeight != null ? `${recommendedWeight}` : unit}
            value={weight}
            onChange={(e) => onWeightChange(e.target.value)}
            onBlur={onWeightBlur}
            className={cn(
              "w-16 h-8 text-center text-xs font-bold border-2 border-primary/20 rounded-lg",
              isDone && "opacity-50"
            )}
            disabled={isDone}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default CurrentWeek;
