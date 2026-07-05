import { type Exercise } from "@/data/workoutPlan";

/**
 * Travel-mode workouts: bodyweight / calisthenics-park routines used to overlay
 * the user's normal plan while they're away from a gym. Nothing here is stored
 * — `usePersonalWorkoutPlan` swaps these in at read time when travel mode is on,
 * matching each training day's theme (from its label) to a fitting routine.
 */

const bw = (
  name: string,
  reps: string,
  opts: Partial<Exercise> = {},
): Exercise => ({
  name,
  sets: 3,
  reps,
  suggestedWeight: "Bodyweight",
  progression: opts.isTimeBased ? "Increase time" : "Add reps or slow the tempo",
  isBodyweight: true,
  ...opts,
});

const LOWER: Exercise[] = [
  bw("Bodyweight Squats", "15–20"),
  bw("Reverse Lunges", "12 each leg"),
  bw("Glute Bridges", "20"),
  bw("Bulgarian Split Squats", "10 each leg"),
  bw("Calf Raises", "20"),
  bw("Wall Sit", "45 sec", { isTimeBased: true }),
];

const UPPER: Exercise[] = [
  bw("Push Ups", "10–15"),
  bw("Pike Push Ups", "8–12"),
  bw("Bench / Park Dips", "10–12"),
  bw("Pull Ups (park bar)", "5–8"),
  bw("Inverted Rows (low bar)", "10"),
  bw("Superman Hold", "30 sec", { isTimeBased: true }),
];

const CORE: Exercise[] = [
  bw("Plank", "45 sec", { isTimeBased: true }),
  bw("Hanging or Lying Leg Raises", "12"),
  bw("Dead Bug", "10 each side"),
  bw("Side Plank", "30 sec each side", { isTimeBased: true }),
  bw("Mountain Climbers", "30 sec", { isTimeBased: true }),
];

const CONDITIONING: Exercise[] = [
  bw("Burpees", "10", { isRoundsBased: true }),
  bw("Jump Squats", "15"),
  bw("High Knees", "40 sec", { isTimeBased: true }),
  bw("Mountain Climbers", "40 sec", { isTimeBased: true }),
  bw("Plank to Push Up", "10"),
];

const FULL_BODY: Exercise[] = [
  bw("Push Ups", "12"),
  bw("Bodyweight Squats", "20"),
  bw("Reverse Lunges", "10 each leg"),
  bw("Park Dips", "10"),
  bw("Plank", "45 sec", { isTimeBased: true }),
  bw("Burpees", "10", { isRoundsBased: true }),
];

/** Pick a bodyweight routine for a training day based on its label/theme. */
export function travelExercisesFor(label: string): Exercise[] {
  const l = label.toLowerCase();
  const hasLower = /lower|leg|glute|squat/.test(l);
  const hasUpper = /upper|push|pull|arm|chest|back|shoulder/.test(l);
  const hasCore = /core|abs/.test(l);

  if (/power|hiit|cardio|condition|metcon/.test(l)) return CONDITIONING;
  if (hasUpper && hasCore) return [...UPPER.slice(0, 4), ...CORE.slice(0, 2)];
  if (hasLower && hasCore) return [...LOWER.slice(0, 4), ...CORE.slice(0, 2)];
  if (hasLower) return LOWER;
  if (hasUpper) return UPPER;
  if (hasCore) return CORE;
  return FULL_BODY;
}
