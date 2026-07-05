import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronDown, ListChecks, Pencil, Sparkles } from "lucide-react";
import {
  FREQUENCY_DEFAULT_DAYS,
  PROGRESSION_DEFAULT,
  useSaveUserPreferences,
  useUserPreferences,
  type UserPreferences,
} from "@/hooks/useUserPreferences";
import {
  usePersonalWorkoutPlan,
  useResetPersonalDay,
  useSavePersonalDay,
} from "@/hooks/usePersonalWorkoutPlan";
import { useAiImportEnabled } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import ExerciseEditor from "@/components/ExerciseEditor";
import ImportWorkoutPlanModal from "@/components/ImportWorkoutPlanModal";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const FREQUENCY_OPTIONS = [3, 4, 5] as const;

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const todayKey = () => {
  const d = today();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseDateKey = (key: string): Date => new Date(key + "T00:00:00");

const daysUntil = (key: string): number => {
  const diffMs = parseDateKey(key).getTime() - today().getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const TrainingPreferences = () => {
  // Render the form with defaults immediately; React Query fills `saved` in the background.
  // This intentionally does not check `isLoading` — the UI is visible from the first paint.
  const { data: saved, isSuccess: prefsLoaded } = useUserPreferences();
  const saveMutation = useSaveUserPreferences();
  const { toast } = useToast();

  const [frequency, setFrequency] = useState<number>(5);
  const [trainingDays, setTrainingDays] = useState<number[]>(FREQUENCY_DEFAULT_DAYS[5]);
  const [startDate, setStartDate] = useState<string>(todayKey());

  // Workout plan expansion state.
  const [planExpanded, setPlanExpanded] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const { mergedPlan, hasCustom } = usePersonalWorkoutPlan();
  const savePersonalDay = useSavePersonalDay();
  const resetPersonalDay = useResetPersonalDay();
  const { data: aiImportEnabled } = useAiImportEnabled();
  const [importOpen, setImportOpen] = useState(false);

  const selectedPlanDays = useMemo(() => {
    const sorted = [...trainingDays].sort((a, b) => a - b);
    return sorted
      .map((idx) => ({ idx, day: mergedPlan[idx] }))
      .filter((entry): entry is { idx: number; day: NonNullable<typeof entry.day> } => !!entry.day);
  }, [trainingDays, mergedPlan]);

  // Hydrate from saved preferences exactly once — after that, user edits and post-save
  // refetches don't clobber local state, so the update is silent and won't fight typing.
  // Important: even when `saved` is null (brand-new user with no row yet) we still
  // mark hydration complete so the autosave effect below can fire the first time
  // the user picks an option — otherwise their choice is never persisted.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!prefsLoaded) return;
    if (saved) {
      setFrequency(saved.frequency);
      setTrainingDays([...saved.training_days].sort((a, b) => a - b));
      setStartDate(saved.start_date);
    }
    hydratedRef.current = true;
  }, [saved, prefsLoaded]);

  const handleFrequencyChange = (newFreq: number) => {
    setFrequency(newFreq);
    // Reset day selection to the canonical preset for the new frequency.
    setTrainingDays([...(FREQUENCY_DEFAULT_DAYS[newFreq] ?? [])]);
  };

  const toggleDay = (idx: number) => {
    setTrainingDays((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((d) => d !== idx);
      }
      if (prev.length >= frequency) {
        // Enforce exact count: must deselect another day first.
        toast({
          title: `Pick exactly ${frequency} days`,
          description: "Deselect another day before adding a new one.",
        });
        return prev;
      }
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const countdownDays = useMemo(() => daysUntil(startDate), [startDate]);
  const isActive = countdownDays <= 0;

  const autosave = useDebouncedCallback(async (payload: UserPreferences) => {
    if (payload.training_days.length !== payload.frequency) return;
    if (!payload.start_date) return;
    try {
      await saveMutation.mutateAsync(payload);
      toast({ description: "Preferences saved", duration: 1500 });
    } catch (e: any) {
      toast({ title: "Couldn't save preferences", description: e?.message, variant: "destructive" });
    }
  }, 500);

  // Autosave whenever a preference changes. Skip until initial hydration is settled
  // so we don't echo the just-loaded values back to the server.
  useEffect(() => {
    if (!hydratedRef.current) return;
    autosave({
      frequency,
      training_days: [...trainingDays].sort((a, b) => a - b),
      start_date: startDate,
      // Progression lives in the setup wizard / More settings now — preserve
      // the saved values here so a schedule autosave doesn't clobber them.
      progress_goal: saved?.progress_goal ?? "healthy",
      progression_kg_per_week: saved?.progression_kg_per_week ?? PROGRESSION_DEFAULT,
    });
  }, [frequency, trainingDays, startDate, saved, autosave]);

  return (
    <div className="mb-6 space-y-4">
      {/* Training Schedule */}
      <motion.section
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border-2 border-border bg-card p-5 lg:p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <h3 className="font-display text-xl text-foreground lg:text-2xl">When do you train?</h3>
        </div>

        {/* Frequency */}
        <div className="mb-7">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Days per week
          </Label>
          <div className="grid grid-cols-3 gap-2.5 mt-3">
            {FREQUENCY_OPTIONS.map((n) => {
              const isSelected = frequency === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleFrequencyChange(n)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-3 rounded-2xl border-2 transition-all",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground shadow-[0_4px_14px_-6px_rgba(255,45,135,0.55)]"
                      : "bg-background border-border hover:border-primary/30",
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-2xl leading-none tabular-nums lg:text-3xl",
                      isSelected ? "text-primary-foreground" : "text-foreground",
                    )}
                  >
                    {n}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      isSelected ? "text-primary-foreground/85" : "text-muted-foreground",
                    )}
                  >
                    days/week
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day picker */}
        <div className="mb-7">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Training days
            </Label>
            <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
              {trainingDays.length} / {frequency}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-3 lg:gap-2">
            {DAY_LETTERS.map((letter, idx) => {
              const isSelected = trainingDays.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  aria-pressed={isSelected}
                  aria-label={DAY_NAMES[idx]}
                  title={DAY_NAMES[idx]}
                  className={cn(
                    "w-10 h-10 shrink-0 rounded-full font-extrabold text-sm transition-all flex items-center justify-center",
                    isSelected
                      ? "bg-primary text-primary-foreground border border-primary shadow-[0_3px_10px_-3px_rgba(255,45,135,0.5)]"
                      : "bg-background text-muted-foreground border border-border hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workout plan (expandable) */}
        <div className="mb-7">
          <button
            type="button"
            onClick={() => setPlanExpanded((v) => !v)}
            aria-expanded={planExpanded}
            className="flex items-center gap-2 w-full text-left group"
          >
            <ListChecks className="w-4 h-4 text-primary shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              Your workout plan
            </span>
            <span className="text-[10px] font-bold text-muted-foreground/70 tabular-nums">
              ({selectedPlanDays.length} day{selectedPlanDays.length === 1 ? "" : "s"})
            </span>
            <ChevronDown
              className={cn(
                "ml-auto w-4 h-4 text-muted-foreground transition-transform",
                planExpanded && "rotate-180",
              )}
            />
          </button>

          <div className="mt-3">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* span keeps the tooltip working while the button is disabled */}
                  <span className="inline-block w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setImportOpen(true)}
                      disabled={aiImportEnabled === false}
                      className="w-full h-10 border-dashed border-2 border-primary/40 text-primary font-bold text-sm"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Import workout plan
                    </Button>
                  </span>
                </TooltipTrigger>
                {aiImportEnabled === false && (
                  <TooltipContent>AI import is temporarily unavailable</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          <AnimatePresence initial={false}>
            {planExpanded && (
              <motion.div
                key="plan-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2">
                  {selectedPlanDays.map(({ idx, day }) => {
                    const isOpen = expandedDay === idx;
                    const isEditing = editingDay === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border-2 border-border bg-background overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const next = isOpen ? null : idx;
                            setExpandedDay(next);
                            if (next === null && editingDay === idx) setEditingDay(null);
                          }}
                          aria-expanded={isOpen}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                        >
                          <span className="text-xl shrink-0">{day.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-extrabold text-foreground leading-tight">
                              {day.day}
                            </p>
                            <p className="text-[11px] font-bold text-muted-foreground leading-tight">
                              {day.label}
                              {!day.isRest && day.exercises.length > 0 && (
                                <> · {day.exercises.length} exercise{day.exercises.length === 1 ? "" : "s"}</>
                              )}
                            </p>
                          </div>
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              key="day-content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-border"
                            >
                              {!isEditing ? (
                                <div className="px-3 pt-3 pb-3 space-y-2">
                                  {day.exercises.length === 0 ? (
                                    <p className="text-xs italic text-muted-foreground">
                                      No exercises for this day.
                                    </p>
                                  ) : (
                                    <ul className="space-y-1.5">
                                      {day.exercises.map((ex, exIdx) => (
                                        <li
                                          key={exIdx}
                                          className="flex items-baseline justify-between gap-3 text-xs"
                                        >
                                          <span className="font-bold text-foreground truncate">
                                            {ex.name}
                                          </span>
                                          <span className="text-muted-foreground tabular-nums shrink-0">
                                            {ex.sets} × {ex.reps}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  <div className="flex justify-end pt-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingDay(idx)}
                                      className="h-7 text-xs font-bold text-muted-foreground hover:text-foreground"
                                    >
                                      <Pencil className="w-3 h-3 mr-1" /> Edit
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <ExerciseEditor
                                  day={day}
                                  dayIndex={idx}
                                  hasCustom={hasCustom(idx)}
                                  onSave={(exercises) => {
                                    savePersonalDay.mutate({
                                      dayIndex: idx,
                                      exercises,
                                      label: day.label,
                                      emoji: day.emoji,
                                      isRest: day.isRest,
                                      isRecovery: day.isRecovery,
                                      restNote: day.restNote,
                                    });
                                  }}
                                  onReset={() => {
                                    resetPersonalDay.mutate(idx);
                                    setEditingDay(null);
                                    toast({ description: "Reset to default exercises", duration: 1500 });
                                  }}
                                  onClose={() => setEditingDay(null)}
                                />
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Start date */}
        <div>
          <Label
            htmlFor="program-start-date"
            className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            Program start date
          </Label>
          <div className="relative mt-3">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none z-10" />
            <Input
              id="program-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cn(
                "h-11 pl-11 pr-4 rounded-full border-2 border-border bg-background font-bold text-sm lg:h-12",
                "[&::-webkit-calendar-picker-indicator]:absolute",
                "[&::-webkit-calendar-picker-indicator]:inset-0",
                "[&::-webkit-calendar-picker-indicator]:w-full",
                "[&::-webkit-calendar-picker-indicator]:h-full",
                "[&::-webkit-calendar-picker-indicator]:opacity-0",
                "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
              )}
            />
          </div>
          <div className="mt-4">
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Plan is active
              </span>
            ) : (
              <p className="text-[11px] font-bold text-muted-foreground">
                Program starts in {countdownDays} day{countdownDays === 1 ? "" : "s"}.
              </p>
            )}
          </div>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className={cn(
          "rounded-2xl border-2 p-4 text-center lg:p-5",
          isActive
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-card",
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Program status
        </p>
        <p className="font-display text-lg text-foreground mt-1 lg:text-xl">
          {isActive
            ? "Active 🔥"
            : `Starts in ${countdownDays} day${countdownDays === 1 ? "" : "s"} ⏳`}
        </p>
      </motion.div>

      <ImportWorkoutPlanModal
        open={importOpen}
        onOpenChange={setImportOpen}
        selectedDayIndices={trainingDays}
        days={selectedPlanDays}
        onImport={async (dayIndex, exercises) => {
          const target = mergedPlan[dayIndex];
          await savePersonalDay.mutateAsync({
            dayIndex,
            exercises,
            label: target?.label,
            emoji: target?.emoji,
            isRest: false,
            isRecovery: target?.isRecovery,
            restNote: target?.restNote,
          });
        }}
      />
    </div>
  );
};

export default TrainingPreferences;
