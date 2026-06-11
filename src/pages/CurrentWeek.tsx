import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Dumbbell, Pencil, Play, TrendingUp, Undo2 } from "lucide-react";
import { useExerciseLogs, useSaveExerciseLog, usePriorExerciseWeights } from "@/hooks/useExerciseLogs";
import { useActiveChallenge, useChallengeProgress } from "@/hooks/useChallenge";
import { useProfile } from "@/hooks/useProfile";
import { usePersonalWorkoutPlan, useSavePersonalDay, useResetPersonalDay } from "@/hooks/usePersonalWorkoutPlan";
import ExerciseEditor from "@/components/ExerciseEditor";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { type WorkoutDay, type Exercise } from "@/data/workoutPlan";
import { startOfWeek, addWeeks, addDays, format, isSameWeek, differenceInDays } from "date-fns";

// Accepts the common YouTube URL shapes (watch?v=, youtu.be/, /shorts/, /embed/) — including
// variants that carry extra query params like ?si=… — and returns a clean
// https://www.youtube.com/embed/VIDEO_ID URL for the iframe. Returns null if no ID is found.
function toYouTubeEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Video IDs use [A-Za-z0-9_-]. The character class stops on the first ?, &, or /
  // so any trailing query (e.g. ?si=…&feature=…) is dropped automatically.
  const patterns = [
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /[?&]v=([A-Za-z0-9_-]{6,})/i,
  ];

  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

const getWeekStart = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
const DEFAULT_RATIOS = [0.35, 0.6, 0.85, 1.2, 1.6];
const DEFAULT_TIME_THRESHOLDS = [15, 30, 60, 90, 120];
const DEFAULT_REPS_THRESHOLDS = [5, 10, 20, 35, 50];
const ASSISTED_FRACTIONS = [1, 0.75, 0.5, 0.25, 0];
const LEVEL_EMOJIS = ["🌱", "⚡", "💪", "🔥", "👑"];

const CurrentWeek = () => {
  const { data: challenge } = useActiveChallenge();
  const progress = useChallengeProgress(challenge?.start_date ?? null);
  const { data: profile } = useProfile();
  const bodyWeight = profile?.body_weight ?? 70;
  const { plan: weeklyPlan, hasCustom } = usePersonalWorkoutPlan();
  const savePersonalDay = useSavePersonalDay();
  const resetPersonalDay = useResetPersonalDay();
  const { toast } = useToast();

  const now = new Date();
  const currentWeekDate = startOfWeek(now, { weekStartsOn: 1 });
  const [weekOffset, setWeekOffset] = useState(0);

  const selectedWeekDate = addWeeks(currentWeekDate, weekOffset);
  const weekStart = getWeekStart(selectedWeekDate);
  const isCurrentWeek = weekOffset === 0;

  const { data: logs, isLoading: logsLoading } = useExerciseLogs(weekStart);
  // The two most recent weeks each exercise was actually logged before this one,
  // skipping over any weeks with no training. priorWeights[key] is ordered
  // most-recent-first.
  const { data: priorWeights } = usePriorExerciseWeights(weekStart);
  const saveLog = useSaveExerciseLog(weekStart);

  const today = now.getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  const [expandedDay, setExpandedDay] = useState<number | null>(isCurrentWeek ? todayIndex : null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [localWeights, setLocalWeights] = useState<Record<string, string>>({});
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);
  const [videoModal, setVideoModal] = useState<{ name: string; url: string } | null>(null);
  const embedUrl = toYouTubeEmbedUrl(videoModal?.url);

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
        if (log.weight_used != null) {
          w[key] = Number(log.weight_used) === -1 ? "F" : String(log.weight_used);
        }
        c[key] = log.completed;
      });
      setLocalWeights(w);
      setLocalCompleted(c);
      setInitialized(true);
    }
  }, [logs, initialized]);

  // Most recent logged weight per exercise (includes -1 for failures).
  const prevWeightMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (priorWeights) {
      Object.entries(priorWeights).forEach(([key, weights]) => {
        if (weights.length > 0) map[key] = weights[0];
      });
    }
    return map;
  }, [priorWeights]);

  // Second-most-recent logged weight per exercise (for looking back past failures).
  const prevPrevWeightMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (priorWeights) {
      Object.entries(priorWeights).forEach(([key, weights]) => {
        if (weights.length > 1) map[key] = weights[1];
      });
    }
    return map;
  }, [priorWeights]);

  const getExKey = (dayIdx: number, exIdx: number) => `${dayIdx}-${exIdx}`;

  const getDayCompletion = (dayIdx: number, day: WorkoutDay) => {
    if ((day.isRest || day.isRecovery) && day.exercises.length === 0) {
      return localCompleted[getExKey(dayIdx, 0)] ? 100 : 0;
    }
    if (day.exercises.length === 0) return 0;
    const total = day.exercises.length;
    const done = day.exercises.filter((_, i) => localCompleted[getExKey(dayIdx, i)]).length;
    return Math.round((done / total) * 100);
  };

  const totalWorkoutDays = weeklyPlan.length;
  const completedDays = weeklyPlan.filter((d, i) => getDayCompletion(i, d) === 100).length;
  const weeklyScore = Math.round((completedDays / totalWorkoutDays) * 100);

  const saveExercise = useCallback(
    (dayIdx: number, exIdx: number, exerciseName: string, weight: string, completed: boolean) => {
      const isFailed = weight.trim().toUpperCase() === "F";
      saveLog.mutate({
        dayIndex: dayIdx,
        exerciseIndex: exIdx,
        exerciseName,
        weightUsed: isFailed ? -1 : weight ? Number(weight) : null,
        completed,
      });
    },
    [saveLog]
  );

  const toggleExercise = (dayIdx: number, exIdx: number, exerciseName: string) => {
    const key = getExKey(dayIdx, exIdx);
    const newVal = !localCompleted[key];

    // Require weight/value before marking as complete (F is valid)
    if (newVal && !localWeights[key]?.trim()) {
      toast({ title: "Enter a value first! ⚖️", description: "Add weight/reps/time or F for failed." });
      return;
    }

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
    // Check all exercises have a weight/value entered
    const missing = day.exercises.filter((_, i) => {
      const key = getExKey(dayIdx, i);
      return !localWeights[key]?.trim();
    });
    if (missing.length > 0) {
      toast({ title: "Fill in all values first! ⚖️", description: `${missing.length} exercise${missing.length > 1 ? "s" : ""} missing weight/reps/time (or F for failed).` });
      return;
    }

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

  const handleUndoDay = (dayIdx: number, day: WorkoutDay) => {
    const updates: Record<string, boolean> = {};
    day.exercises.forEach((ex, i) => {
      const key = getExKey(dayIdx, i);
      updates[key] = false;
      saveExercise(dayIdx, i, ex.name, localWeights[key] || "", false);
    });
    setLocalCompleted((prev) => ({ ...prev, ...updates }));
    toast({ title: "Day unmarked — you can edit now ✏️" });
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
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto lg:max-w-7xl lg:px-8 lg:pb-8">
      {/* Header */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-4 lg:text-left">
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

      {/* Weekly progress — card on mobile, slim strip on lg+ */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-4 p-4 rounded-2xl bg-card border-2 border-border lg:p-3 lg:px-4 lg:rounded-lg lg:border"
      >
        <div className="lg:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-extrabold text-foreground">Weekly Progress</span>
            <span className="text-sm font-display text-primary">{weeklyScore}%</span>
          </div>
          <Progress value={weeklyScore} className="h-3 bg-muted [&>div]:gradient-primary" />
          <p className="text-xs text-muted-foreground font-semibold mt-1.5">
            {completedDays}/{totalWorkoutDays} workout days completed
          </p>
        </div>
        <div className="hidden lg:flex lg:items-center lg:gap-4">
          <span className="text-sm font-extrabold text-foreground shrink-0">Weekly Progress</span>
          <Progress value={weeklyScore} className="h-2 flex-1 bg-muted [&>div]:gradient-primary" />
          <span className="text-sm font-display text-primary shrink-0 tabular-nums">{weeklyScore}%</span>
          <span className="text-xs text-muted-foreground font-semibold shrink-0 tabular-nums">
            {completedDays}/{totalWorkoutDays} days
          </span>
        </div>
      </motion.div>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-6 lg:items-start">
      <div className="lg:min-w-0">
      {/* Loading state */}
      {logsLoading && (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 lg:items-start">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Day cards */}
      {!logsLoading && (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 lg:items-start">
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
                  completion === 100
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
                    {(day.isRest || day.isRecovery) && day.exercises.length === 0 && completion === 100 && (
                      <p className="text-[10px] font-bold text-secondary mt-1">Checked off ✓</p>
                    )}
                  </div>
                  {completion === 100 ? (
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
                              }}
                              onReset={() => {
                                resetPersonalDay.mutate(dayIdx);
                                setEditingDay(null);
                                toast({ description: "Reset to default exercises", duration: 1500 });
                              }}
                              onClose={() => setEditingDay(null)}
                            />
                          )}
                        </AnimatePresence>

                        {editingDay !== dayIdx && (day.isRest || day.isRecovery) && day.exercises.length === 0 && (
                          <div className="p-4 rounded-xl bg-muted/50 text-center space-y-3">
                            <p className="text-3xl mb-1">{day.isRecovery ? "🌿" : "😴"}</p>
                            {day.restNote && (
                              <p className="font-bold text-foreground text-sm">{day.restNote}</p>
                            )}
                            {(() => {
                              const restKey = getExKey(dayIdx, 0);
                              const restDone = localCompleted[restKey] || false;
                              return (
                                <button
                                  onClick={() => {
                                    const newVal = !restDone;
                                    setLocalCompleted((prev) => ({ ...prev, [restKey]: newVal }));
                                    const restLabel = day.isRecovery ? "Recovery Day" : "Rest Day";
                                    saveExercise(dayIdx, 0, restLabel, "", newVal);
                                    if (newVal) {
                                      confetti({
                                        particleCount: 40,
                                        spread: 60,
                                        colors: ["#FF2D87", "#00F5D4", "#FFE600", "#5271FF"],
                                        origin: { y: 0.7 },
                                        gravity: 1.2,
                                      });
                                      toast({ title: day.isRecovery ? "Recovery done! 🌿" : "Rest day logged! 😴" });
                                    }
                                  }}
                                  className={cn(
                                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all",
                                    restDone
                                      ? "bg-secondary/10 border-secondary text-foreground"
                                      : "border-primary/30 text-muted-foreground hover:border-primary"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                                      restDone ? "bg-secondary border-secondary text-secondary-foreground" : "border-primary/40"
                                    )}
                                  >
                                    {restDone && <Check className="w-3 h-3" />}
                                  </div>
                                  {restDone ? "Done ✓" : "Mark as done"}
                                </button>
                              );
                            })()}
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
                                  bodyWeight={bodyWeight}
                                  isDone={isDone}
                                  weight={localWeights[key] || ""}
                                  lastWeekWeight={lastWeekWeight}
                                  prevPrevWeekWeight={prevPrevWeightMap[key]}
                                  onWeightChange={(val) => handleWeightChange(dayIdx, exIdx, ex.name, val)}
                                  onWeightBlur={() => handleWeightBlur(dayIdx, exIdx, ex.name)}
                                  onToggle={() => toggleExercise(dayIdx, exIdx, ex.name)}
                                  onVideoClick={(url) => setVideoModal({ name: ex.name, url })}
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
                            {completion === 100 && (
                              <Button
                                variant="outline"
                                onClick={() => handleUndoDay(dayIdx, day)}
                                className="w-full mt-2 font-bold text-muted-foreground border-2 border-border"
                              >
                                <Undo2 className="w-4 h-4 mr-1" /> Undo Day
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

      <DesktopRightPanel
        weeklyPlan={weeklyPlan}
        getDayCompletion={getDayCompletion}
        todayIndex={todayIndex}
        isCurrentWeek={isCurrentWeek}
        completedDays={completedDays}
        totalWorkoutDays={totalWorkoutDays}
        weeklyScore={weeklyScore}
        localCompleted={localCompleted}
      />
      </div>

      <Dialog open={!!videoModal} onOpenChange={(open) => !open && setVideoModal(null)}>
        <DialogContent
          className={cn(
            "p-0 gap-0 overflow-hidden flex flex-col",
            // Mobile: full-screen (override defaults explicitly so tailwind-merge picks these up)
            "left-0 top-0 right-0 bottom-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none max-h-none rounded-none border-0",
            // sm+: centered modal with rounded corners + dark overlay (overlay comes from DialogOverlay)
            "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:right-auto sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] sm:rounded-lg sm:border"
          )}
        >
          <DialogHeader className="px-5 py-4 border-b border-border shrink-0 pr-12">
            <DialogTitle className="font-display text-xl text-foreground text-left">
              {videoModal?.name ?? ""}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-black shrink-0">
            {embedUrl ? (
              <iframe
                key={videoModal?.name ?? ""}
                src={embedUrl}
                title={videoModal ? `${videoModal.name} tutorial` : "Exercise tutorial"}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70 text-sm font-bold p-4 text-center">
                Saved URL isn't a recognized YouTube link. Edit the exercise to fix it.
              </div>
            )}
          </div>
          {/* Fills remaining vertical space below the video on mobile full-screen */}
          <div className="flex-1 bg-background sm:hidden" />
        </DialogContent>
      </Dialog>
    </div>
  );
};

function DesktopRightPanel({
  weeklyPlan,
  getDayCompletion,
  todayIndex,
  isCurrentWeek,
  completedDays,
  totalWorkoutDays,
  weeklyScore,
  localCompleted,
}: {
  weeklyPlan: WorkoutDay[];
  getDayCompletion: (dayIdx: number, day: WorkoutDay) => number;
  todayIndex: number;
  isCurrentWeek: boolean;
  completedDays: number;
  totalWorkoutDays: number;
  weeklyScore: number;
  localCompleted: Record<string, boolean>;
}) {
  const dayLetters = ["M", "T", "W", "T", "F", "S", "S"];
  const dayCompletion = weeklyPlan.map((d, i) => getDayCompletion(i, d));
  const exercisesDone = Object.values(localCompleted).filter(Boolean).length;
  const daysLeft = Math.max(0, totalWorkoutDays - completedDays);

  const upcoming = weeklyPlan
    .map((d, i) => ({ day: d, idx: i, completion: dayCompletion[i] }))
    .filter(({ idx, completion }) => (!isCurrentWeek || idx >= todayIndex) && completion < 100)
    .slice(0, 4);

  return (
    <aside className="hidden lg:block lg:sticky lg:top-6 space-y-4">
      {/* Stats 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Workouts" value={`${completedDays}/${totalWorkoutDays}`} accent="text-primary" />
        <StatTile label="Progress" value={`${weeklyScore}%`} accent="text-neon-teal" />
        <StatTile label="Exercises" value={String(exercisesDone)} accent="text-neon-yellow" />
        <StatTile label="Days Left" value={String(daysLeft)} accent="text-neon-blue" />
      </div>

      {/* 7-day streak tracker */}
      <div className="p-4 rounded-2xl bg-card border-2 border-border">
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
          7-Day Streak
        </p>
        <div className="flex items-center justify-between">
          {weeklyPlan.map((_, i) => {
            const done = dayCompletion[i] === 100;
            const isToday = isCurrentWeek && i === todayIndex;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all",
                    done
                      ? "bg-secondary text-secondary-foreground"
                      : isToday
                      ? "border-2 border-primary text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : dayLetters[i]}
                </div>
                <span className={cn("text-[9px] font-bold uppercase", isToday ? "text-primary" : "text-muted-foreground")}>
                  {dayLetters[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming workouts */}
      <div className="p-4 rounded-2xl bg-card border-2 border-border">
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
          Upcoming Workouts
        </p>
        {upcoming.length === 0 ? (
          <p className="text-sm font-semibold text-muted-foreground">
            All done — crushed the week! 🔥
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(({ day, idx }) => {
              const isToday = isCurrentWeek && idx === todayIndex;
              return (
                <li key={idx} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0",
                      isToday ? "bg-primary/15" : "bg-muted"
                    )}
                  >
                    {day.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-foreground truncate">
                      {day.day}
                      {isToday && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          Today
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground truncate">{day.label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="p-3 rounded-xl bg-card border-2 border-border">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-display tabular-nums mt-1", accent)}>{value}</p>
    </div>
  );
}

function ExerciseCard({
  exercise,
  bodyWeight,
  isDone,
  weight,
  lastWeekWeight,
  prevPrevWeekWeight,
  onWeightChange,
  onWeightBlur,
  onToggle,
  onVideoClick,
}: {
  exercise: Exercise;
  bodyWeight: number;
  isDone: boolean;
  weight: string;
  lastWeekWeight?: number;
  prevPrevWeekWeight?: number;
  onWeightChange: (val: string) => void;
  onWeightBlur: () => void;
  onToggle: () => void;
  onVideoClick: (url: string) => void;
}) {
  const videoUrl = exercise.videoUrl?.trim();
  const hasVideo = !!videoUrl;
  const isRounds = exercise.isRoundsBased;
  const isTime = exercise.isTimeBased;
  const isAssisted = exercise.isAssisted;
  const isBodyweight = exercise.isBodyweight && !isTime;
  const unit = isAssisted ? "kg" : isRounds ? "reps" : isTime ? "sec" : "kg";
  const defaultThresholds = isAssisted
    ? ASSISTED_FRACTIONS.map((fraction) => Math.round(fraction * bodyWeight))
    : isTime
      ? DEFAULT_TIME_THRESHOLDS
      : isRounds
        ? DEFAULT_REPS_THRESHOLDS
        : DEFAULT_RATIOS.map((ratio) => Math.round(ratio * bodyWeight));
  const thresholds = exercise.levelThresholds || defaultThresholds;
  const parsedIncrement = parseFloat(exercise.progression?.replace(/[^0-9.\-]/g, "") || "0");
  const increment = parsedIncrement !== 0 ? (isAssisted ? -Math.abs(parsedIncrement) : Math.abs(parsedIncrement)) : (isAssisted ? -2 : isRounds ? 1 : isTime ? 5 : 2);

  // Failure logic: if last week was -1 (F), look back further
  const lastWeekFailed = lastWeekWeight === -1;
  const effectiveLastWeight = lastWeekFailed
    ? (prevPrevWeekWeight != null && prevPrevWeekWeight !== -1 ? prevPrevWeekWeight : null)
    : lastWeekWeight;
  const recommendedWeight = effectiveLastWeight != null ? effectiveLastWeight + increment : null;
  // If failed last week, recommend the same weight they would have tried
  const retryWeight = lastWeekFailed && prevPrevWeekWeight != null && prevPrevWeekWeight !== -1
    ? prevPrevWeekWeight + increment
    : null;
  const hasEmojiPrefix = !!exercise.suggestedWeight && LEVEL_EMOJIS.some((emoji) => exercise.suggestedWeight.startsWith(emoji));
  const buildRangeLabel = (index: number) => {
    const value = thresholds[index];
    const prevValue = index > 0 ? thresholds[index - 1] : 0;
    return isAssisted
      ? (index === 0 ? `≥ ${value} ${unit}` : index === LEVEL_EMOJIS.length - 1 ? `${value} ${unit}` : `${value}–${thresholds[index - 1]} ${unit}`)
      : (index === 0 ? `< ${value} ${unit}` : index === LEVEL_EMOJIS.length - 1 ? `≥ ${value} ${unit}` : `${prevValue}–${value} ${unit}`);
  };
  const matchedLevelIndex = exercise.suggestedWeight ? LEVEL_EMOJIS.findIndex((_, index) => buildRangeLabel(index) === exercise.suggestedWeight) : -1;
  const displaySuggestedWeight = exercise.suggestedWeight
    ? hasEmojiPrefix
      ? exercise.suggestedWeight
      : matchedLevelIndex >= 0
        ? `${LEVEL_EMOJIS[matchedLevelIndex]} ${exercise.suggestedWeight}`
        : exercise.suggestedWeight
    : "";


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
          <div className="flex items-center gap-1.5">
            <span className={cn("font-extrabold text-sm text-foreground truncate", isDone && "line-through opacity-50")}>
              {exercise.name}
            </span>
            {hasVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onVideoClick(videoUrl!);
                }}
                aria-label={`Watch tutorial for ${exercise.name}`}
                title="Watch tutorial"
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Play className="w-3 h-3 fill-current" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-xs font-bold text-primary">
              {isRounds ? `${exercise.sets} rounds` : `${exercise.sets} × ${exercise.reps}`}
            </span>
            {displaySuggestedWeight && <span className="text-xs font-semibold text-muted-foreground">{displaySuggestedWeight}</span>}
          </div>

          {/* Last week value + recommendation */}
          {lastWeekFailed && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              <span className="text-[11px] font-bold text-destructive">
                ❌ Failed last week — try again!
              </span>
              {retryWeight != null && (
                <span className="text-[11px] font-bold text-neon-teal">
                  → {retryWeight} {unit} {isTime ? "⏱️" : isRounds ? "🔁" : "💪"}
                </span>
              )}
            </div>
          )}
          {!lastWeekFailed && lastWeekWeight != null && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Last week: {lastWeekWeight} {unit}
              </span>
              {recommendedWeight != null && (
                <span className="text-[11px] font-bold text-neon-teal">
                  {isAssisted
                    ? `→ Decrease to ${Math.max(0, recommendedWeight)} kg assist 🎯`
                    : `→ Try ${recommendedWeight} ${unit} ${isTime ? "⏱️" : isRounds ? "🔁" : "💪"}`}
                </span>
              )}
            </div>
          )}

          {!lastWeekWeight && !lastWeekFailed && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[11px] font-semibold text-neon-teal">
                {isAssisted ? "🎯 Decrease weight assistance" : isTime ? "⏱️ Add time" : isRounds ? "🔁 Add reps" : "💪 Add weight"}
              </span>
            </div>
          )}

          {!lastWeekFailed && lastWeekWeight != null && exercise.progression && (
            <div className="flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3 text-neon-teal shrink-0" />
              <span className="text-[11px] font-semibold text-neon-teal">{exercise.progression}</span>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <Input
            type="text"
            inputMode="text"
            placeholder={lastWeekFailed && retryWeight != null ? `${retryWeight}` : recommendedWeight != null ? `${recommendedWeight}` : unit}
            value={weight}
            onChange={(e) => {
              const v = e.target.value;
              // Allow F/f, numbers, decimals
              if (v === "" || /^[Ff]$/.test(v) || /^\d*\.?\d*$/.test(v)) {
                onWeightChange(v.toUpperCase());
              }
            }}
            onBlur={onWeightBlur}
            className={cn(
              "w-16 h-8 text-center text-xs font-bold border-2 rounded-lg",
              weight === "F" ? "border-destructive/50 text-destructive" : "border-primary/20",
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
