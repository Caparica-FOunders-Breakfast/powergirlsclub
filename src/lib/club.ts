/**
 * Club feed: post shapes, labels and the rules for what a workout post shows
 * (power-club-club-feed brief).
 */
import type { Exercise } from "@/data/workoutPlan";
import { format } from "date-fns";

export type PostKind = "workout" | "new_best" | "streak" | "joined";
export type Readiness = "ready" | "so_so" | "not_ready";

export interface Lift {
  exercise_id?: string | null;
  name: string;
  sets: number;
  reps_or_time: string;
  /** kg lifted. Missing when the author hides weights (stripped on the server). */
  weight_kg?: number | null;
  /** "bodyweight" | "time" | "kg"; decides how the value reads. */
  unit?: "kg" | "bodyweight" | "time" | "reps";
  /** Seconds or reps for timed / rounds exercises. */
  value?: number | null;
  is_new_best?: boolean;
  previous_best_kg?: number | null;
}

export interface WorkoutPayload { lifts: Lift[]; more_count: number; exercises: number; minutes?: number | null }
export interface StreakPayload { weeks: number; workouts: number }
export interface JoinedPayload { first_day?: string | null }
export interface NewBestPayload { exercise_id?: string | null; name: string; weight_kg?: number | null; previous_kg?: number | null }

export interface FeedPost {
  id: string;
  created_at: string;
  kind: PostKind;
  day_name: string | null;
  week_number: number | null;
  readiness: Readiness | null;
  show_weights: boolean;
  note: string | null;
  payload: WorkoutPayload & StreakPayload & JoinedPayload & NewBestPayload;
  has_best: boolean;
  author_name: string;
  author_color: string;
  cheer_count: number;
  cheered: boolean;
  is_mine: boolean;
}

export const NOTE_MAX = 140;

/** Same cleaning the database does: trim, strip links, max 140. */
export const cleanNote = (raw: string): string | null => {
  const v = raw
    .replace(/(https?:\/\/|www\.)\S*/gi, "")
    .replace(/\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|io|pt|co|app|me|ly|link|gg|xyz|info|biz|site|online|shop|store|tv|uk|es|fr|de|br)\b(\/\S*)?/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NOTE_MAX);
  return v || null;
};

export const READINESS_LABEL: Record<Readiness, string> = {
  ready: "Ready",
  so_so: "So-so",
  not_ready: "Not ready, light version",
};

export const moodToReadiness = (mood: string | undefined): Readiness | null =>
  mood === "Ready" ? "ready" : mood === "So-so" ? "so_so" : mood === "Not ready" ? "not_ready" : null;

/** "Just now", "12 min ago", "3 h ago", "Yesterday", "Nov 14". */
export const timeAgo = (iso: string, now = new Date()): string => {
  const t = new Date(iso);
  const mins = Math.floor((now.getTime() - t.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (t.getTime() >= startToday) return `${Math.floor(mins / 60)} h ago`;
  if (t.getTime() >= startToday - 86_400_000) return "Yesterday";
  return format(t, "MMM d");
};

/** "{name} finished Lower body" etc. */
export const postAction = (p: Pick<FeedPost, "kind" | "day_name" | "payload">): string => {
  if (p.kind === "workout") return `finished ${p.day_name || "a workout"}`;
  if (p.kind === "streak") return "hit a streak";
  if (p.kind === "joined") return "joined the club";
  return `set a new best`;
};

export const postMeta = (p: Pick<FeedPost, "kind" | "created_at" | "week_number" | "readiness">, now?: Date): string => {
  const parts = [timeAgo(p.created_at, now)];
  if (p.kind === "workout" || p.kind === "new_best") {
    if (p.week_number) parts.push(`Week ${p.week_number}`);
    if (p.readiness) parts.push(READINESS_LABEL[p.readiness]);
  }
  return parts.join(" · ");
};

/** "45 kg", "Bodyweight", "40 sec", "4 rounds"; null when weights are hidden. */
export const liftValue = (l: Lift): string | null => {
  if (l.unit === "bodyweight") return "Bodyweight";
  if (l.unit === "time") return l.value != null ? `${l.value} sec` : null;
  if (l.unit === "reps") return l.value != null ? `${l.value} rounds` : null;
  return l.weight_kg != null ? `${l.weight_kg} kg` : null;
};

export const liftSets = (l: Lift) => `${l.sets} × ${l.reps_or_time}`;

const fmtKg = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Exercises that can set a "New best": weighted lifts (not bodyweight, time, rounds or assisted). */
export const canSetBest = (ex: Exercise) => !ex.isBodyweight && !ex.isTimeBased && !ex.isRoundsBased && !ex.isAssisted;

export interface DoneExercise {
  exercise: Exercise;
  /** What the member typed: kg, seconds or rounds. "F" (failed) is null. */
  value: number | null;
  /** Best earlier weight for this exercise (any earlier log), if any. */
  previousBest: number | null;
}

/**
 * Lifts for a workout post: up to 3 in plan order, but every lift with a new
 * best is always included. Week 1 base sessions never show "New best" (first
 * logs are not bests).
 */
export function buildWorkoutPayload(done: DoneExercise[], opts: { baseSession: boolean; minutes?: number | null }): WorkoutPayload {
  const lifts: (Lift & { _i: number })[] = done.map((d, i) => {
    const ex = d.exercise;
    const unit: Lift["unit"] = ex.isTimeBased ? "time" : ex.isRoundsBased ? "reps" : ex.isBodyweight ? "bodyweight" : "kg";
    const best = !opts.baseSession && canSetBest(ex) && d.value != null && d.previousBest != null && d.value > d.previousBest;
    return {
      _i: i,
      name: ex.name,
      sets: ex.sets,
      reps_or_time: ex.reps,
      unit,
      weight_kg: unit === "kg" ? d.value : null,
      value: unit === "time" || unit === "reps" ? d.value : null,
      is_new_best: best,
      previous_best_kg: best ? d.previousBest : null,
    };
  });
  const bests = lifts.filter((l) => l.is_new_best);
  const rest = lifts.filter((l) => !l.is_new_best);
  const picked = [...bests, ...rest].slice(0, Math.max(3, bests.length)).sort((a, b) => a._i - b._i);
  return {
    lifts: picked.map(({ _i, ...l }) => l),
    more_count: Math.max(0, lifts.length - picked.length),
    exercises: lifts.length,
    minutes: opts.minutes ?? null,
  };
}

/** Headline for a workout post's new best: "New best: Hip thrust 70 kg", "+5 kg since the last best." */
export const bestBadge = (lifts: Lift[]): { title: string; text: string } | null => {
  const b = lifts.find((l) => l.is_new_best);
  if (!b) return null;
  if (b.weight_kg == null) return { title: `New best: ${b.name}`, text: "A new personal best." };
  const diff = b.previous_best_kg != null ? b.weight_kg - b.previous_best_kg : null;
  return {
    title: `New best: ${b.name} ${fmtKg(b.weight_kg)} kg`,
    text: diff && diff > 0 ? `+${fmtKg(diff)} kg since the last best.` : "A new personal best.",
  };
};

/** Value typed in the week view as a number, or null ("F", empty). */
export const parseLogged = (raw: string | undefined): number | null => {
  if (!raw) return null;
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Training week of the member's plan: week 1 is the week the plan started. */
export const planWeekNumber = (startedAt: string | null | undefined, weekStart: string): number | null => {
  if (!startedAt) return null;
  const s = new Date(startedAt);
  const startMonday = new Date(s.getFullYear(), s.getMonth(), s.getDate() - ((s.getDay() + 6) % 7));
  const [y, m, d] = weekStart.split("-").map(Number);
  const wk = new Date(y, m - 1, d);
  const n = Math.round((wk.getTime() - startMonday.getTime()) / (7 * 86_400_000)) + 1;
  return n >= 1 ? n : null;
};

export const STREAK_MILESTONES = [3, 6, 9, 12];
