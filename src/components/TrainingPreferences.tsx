import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Target } from "lucide-react";
import {
  FREQUENCY_DEFAULT_DAYS,
  PROGRESS_GOAL_RATE,
  useSaveUserPreferences,
  useUserPreferences,
  type ProgressGoal,
  type UserPreferences,
} from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  const { data: saved } = useUserPreferences();
  const saveMutation = useSaveUserPreferences();
  const { toast } = useToast();

  const [frequency, setFrequency] = useState<number>(5);
  const [trainingDays, setTrainingDays] = useState<number[]>(FREQUENCY_DEFAULT_DAYS[5]);
  const [startDate, setStartDate] = useState<string>(todayKey());
  const [progressGoal, setProgressGoal] = useState<ProgressGoal>("healthy");

  // Hydrate from saved preferences exactly once — after that, user edits and post-save
  // refetches don't clobber local state, so the update is silent and won't fight typing.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!saved || hydratedRef.current) return;
    setFrequency(saved.frequency);
    setTrainingDays([...saved.training_days].sort((a, b) => a - b));
    setStartDate(saved.start_date);
    setProgressGoal(saved.progress_goal);
    hydratedRef.current = true;
  }, [saved]);

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

  const canSave =
    trainingDays.length === frequency &&
    !!startDate &&
    (progressGoal === "healthy" || progressGoal === "aggressive");

  const handleSave = async () => {
    if (trainingDays.length !== frequency) {
      toast({
        title: `Pick exactly ${frequency} days`,
        description: `You've selected ${trainingDays.length}.`,
        variant: "destructive",
      });
      return;
    }
    const payload: UserPreferences = {
      frequency,
      training_days: [...trainingDays].sort((a, b) => a - b),
      start_date: startDate,
      progress_goal: progressGoal,
    };
    try {
      await saveMutation.mutateAsync(payload);
      toast({
        title: isActive ? "Program activated! 🔥" : `Locked in — starts in ${countdownDays} day${countdownDays === 1 ? "" : "s"} ⏳`,
      });
    } catch (e: any) {
      toast({ title: "Couldn't save preferences", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Training Schedule */}
      <motion.section
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border-2 border-border bg-card p-4 lg:p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Training Schedule
            </p>
            <h3 className="font-display text-xl text-foreground lg:text-2xl">When do you train?</h3>
          </div>
        </div>

        {/* Frequency */}
        <div className="mb-4">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Days per week
          </Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {FREQUENCY_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleFrequencyChange(n)}
                className={cn(
                  "h-11 rounded-xl font-extrabold text-sm transition-all border-2 lg:h-12 lg:text-base",
                  frequency === n
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/30",
                )}
              >
                {n} days
              </button>
            ))}
          </div>
        </div>

        {/* Day picker */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Training days
            </Label>
            <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
              {trainingDays.length} / {frequency}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 mt-2 lg:gap-2">
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
                    "aspect-square rounded-full font-extrabold text-sm transition-all border-2 flex items-center justify-center lg:text-base",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary/30",
                  )}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Start date */}
        <div>
          <Label
            htmlFor="program-start-date"
            className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            Program start date
          </Label>
          <Input
            id="program-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 h-11 border-2 border-border lg:h-12"
          />
          <p className="text-[11px] font-bold text-muted-foreground mt-1.5">
            {isActive
              ? "Plan is active — your weekly schedule reflects your selected days."
              : `Program starts in ${countdownDays} day${countdownDays === 1 ? "" : "s"}.`}
          </p>
        </div>
      </motion.section>

      {/* Progress Goal */}
      <motion.section
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border-2 border-border bg-card p-4 lg:p-5"
      >
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Progress Goal
            </p>
            <h3 className="font-display text-xl text-foreground lg:text-2xl">
              How hard do you want to push?
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["healthy", "aggressive"] as const).map((goal) => {
            const isSelected = progressGoal === goal;
            return (
              <button
                key={goal}
                type="button"
                onClick={() => setProgressGoal(goal)}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all lg:p-5",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-background hover:border-primary/30",
                )}
              >
                <p className="font-extrabold text-base text-foreground lg:text-lg">
                  {goal === "healthy" ? "Healthy" : "Aggressive"}
                </p>
                <p className="text-sm font-bold text-primary mt-0.5 lg:text-base">
                  +{PROGRESS_GOAL_RATE[goal]} kg/week
                </p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-1">
                  {goal === "healthy"
                    ? "Sustainable strength gains, low burnout risk."
                    : "Faster progression, higher recovery demand."}
                </p>
              </button>
            );
          })}
        </div>
      </motion.section>

      <Button
        onClick={handleSave}
        disabled={!canSave || saveMutation.isPending}
        className="w-full h-12 gradient-primary text-primary-foreground font-extrabold text-base lg:h-14 lg:text-lg"
      >
        {saveMutation.isPending ? "Saving…" : "Start program"}
      </Button>
    </div>
  );
};

export default TrainingPreferences;
