// Training-plan domain types + the bridge that projects a chosen plan into the
// existing per-day `user_workout_plans` JSONB, so This Week and Scorecard keep
// working unchanged while the new plan tables hold the library + templates.
import type { Exercise, WorkoutDay } from "@/data/workoutPlan";

export type Tracking = "weights" | "bodyweight" | "time" | "assisted" | "rounds";
export type ExerciseType = "power" | "strength" | "core" | "sprint";
export type PlanSource = "recommended" | "ai_import" | "custom";
export type BaseMode = "auto" | "manual";

// Rows from the new tables.
export interface ExerciseRow {
  id: string;
  name: string;
  type: ExerciseType;
  muscles: string | null;
  tracking: Tracking;
  easier_option: string | null;
  video_url: string | null;
}

export interface MemberPlanRow {
  id: string;
  user_id: string;
  source: PlanSource;
  days_per_week: number;
  training_days: string[];
  base_mode: BaseMode;
  started_at: string;
}

// In-memory shape the setup wizard builds and the saver consumes. One entry per
// training day, in order; the power exercise (if any) is the first item.
export interface PlanItemDraft {
  name: string;
  tracking: Tracking;
  sets: number;
  repsOrTime: string; // "6", "10", "40 sec", "8 each leg", "rounds"
  videoUrl?: string | null;
  isPower?: boolean;
  startWeight?: string; // optional manual starting weight
}
export interface PlanDayDraft {
  name: string; // "Lower body"
  items: PlanItemDraft[];
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_FULL: Record<Weekday, string> = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};
// This Week uses Monday = day_index 0.
export const weekdayIndex = (d: string) => WEEKDAYS.indexOf(d as Weekday);

export const DEFAULT_TRAINING_DAYS: Record<number, Weekday[]> = {
  2: ["Mon", "Thu"],
  3: ["Mon", "Wed", "Fri"],
  4: ["Mon", "Tue", "Wed", "Fri"],
};

// Progression copy per tracking type (fixes the "bodyweight shows +1 kg" bug —
// the unit now follows the tracking type).
const PROGRESSION: Record<Tracking, string> = {
  weights: "+1 kg/week",
  assisted: "−1 kg/week",
  bodyweight: "+1 rep/week",
  time: "+5 sec/week",
  rounds: "+1 round/week",
};

// Pull a leading round count out of "4 rounds" / "6–8 rounds" for the This Week
// "{sets} rounds" renderer.
const roundsCount = (repsOrTime: string, sets: number) => {
  const m = repsOrTime.match(/(\d+)/);
  return m ? Number(m[1]) : sets || 1;
};

// Map one plan item (+ its tracking type) to the legacy Exercise shape.
export function itemToExercise(it: PlanItemDraft): Exercise {
  const base: Exercise = {
    name: it.name,
    sets: it.sets,
    reps: it.repsOrTime,
    suggestedWeight: it.startWeight ?? "",
    progression: PROGRESSION[it.tracking],
    videoUrl: it.videoUrl ?? undefined,
  };
  switch (it.tracking) {
    case "bodyweight":
      return { ...base, isBodyweight: true, suggestedWeight: it.startWeight ?? "Bodyweight" };
    case "time":
      return { ...base, isTimeBased: true };
    case "assisted":
      return { ...base, isAssisted: true };
    case "rounds":
      return { ...base, isRoundsBased: true, sets: roundsCount(it.repsOrTime, it.sets) };
    default:
      return base;
  }
}

/**
 * Build the per-day writes for `user_workout_plans` from the chosen plan.
 * Returns one entry per *training* day (mapped to its weekday index); the saver
 * also clears the other day_indices and sets training_days so This Week's
 * existing overlay blanks non-training days to Rest.
 */
export function buildPlanDayWrites(
  trainingDays: string[],
  days: PlanDayDraft[],
): { dayIndex: number; label: string; exercises: Exercise[] }[] {
  const ordered = [...trainingDays].sort((a, b) => weekdayIndex(a) - weekdayIndex(b));
  return ordered.map((d, i) => {
    const day = days[i] ?? { name: "Training", items: [] };
    return {
      dayIndex: weekdayIndex(d),
      label: day.name,
      exercises: day.items.map(itemToExercise),
    };
  });
}

// A rest WorkoutDay for the non-training indices.
export const restDay = (dayIndex: number): Omit<WorkoutDay, "day"> & { dayIndex: number } => ({
  dayIndex,
  label: "Rest",
  emoji: "",
  isRest: true,
  exercises: [],
});
