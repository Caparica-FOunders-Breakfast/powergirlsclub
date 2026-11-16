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

/**
 * First number in a free-text value: "14–20 kg" -> "14", "+2 to 2.5 kg/week"
 * -> "2", "10 kg dumbbells" -> "10". Stripping every non-digit instead glued
 * ranges together ("30–40" -> "3040"), so we store one starting weight.
 */
export const firstNumber = (s?: string | null): string => {
  const text = s ?? "";
  // "2 × 10 kg" (two 10 kg dumbbells) means 10 kg per hand, not 2.
  const pair = text.match(/\d+\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*kg/i);
  if (pair) return pair[1].replace(",", ".");
  const m = text.match(/\d+(?:[.,]\d+)?/);
  return m ? m[0].replace(",", ".") : "";
};

/**
 * Sanitise what's typed into a weight/progression field: keep the leading
 * number only, so pasting "30-40" gives "30" while "30." stays typeable.
 */
export const typedNumber = (v: string): string =>
  (v.match(/^\s*(\d*(?:[.,]\d*)?)/)?.[1] ?? "").replace(",", ".");

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

// ── Library lookup by exercise name ──────────────────────────────────────
// Plans store free-text names ("Goblet Squats", "Romanian deadlift", "Pull Ups")
// while the library uses its own spellings ("Goblet squat", "Dumbbell Romanian
// deadlift", "Assisted pull ups"). Match loosely: case, punctuation, bracketed
// notes, leading equipment words and a trailing plural "s" don't matter.
const EQUIPMENT_WORDS = ["dumbbell", "barbell", "assisted", "single-arm", "single arm", "kettlebell"];

export const looseExerciseKey = (name: string): string => {
  let s = name.toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9 -]/g, " ").replace(/\s+/g, " ").trim();
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const w of EQUIPMENT_WORDS) {
      if (s.startsWith(w + " ")) { s = s.slice(w.length + 1); stripped = true; }
    }
  }
  return s.replace(/(\w*[^s])s$/, "$1"); // "pull ups" -> "pull up", keeps "press"
};

/** Find the library row for a plan exercise name, or undefined. */
export const makeLibraryLookup = (library: ExerciseRow[] | undefined) => {
  const byKey = new Map<string, ExerciseRow>();
  for (const row of library ?? []) byKey.set(looseExerciseKey(row.name), row);
  return (name: string | null | undefined): ExerciseRow | undefined =>
    name ? byKey.get(looseExerciseKey(name)) : undefined;
};

/**
 * Power exercises (type "power": jump squats, kettlebell swings, med ball
 * throws...) are highlighted in blue everywhere they appear: This Week, the
 * Profile plan card and plan setup. Label blue is a shade deeper than the
 * border so the small "POWER" text keeps enough contrast on the light blue.
 */
export const POWER_COLORS = { bg: "#E3F0FF", border: "#2563EB", label: "#1D4ED8" } as const;
