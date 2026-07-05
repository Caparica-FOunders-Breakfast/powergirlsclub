import { type Exercise } from "@/data/workoutPlan";

/**
 * Travel-mode workouts: bodyweight / calisthenics-park routines used to overlay
 * the user's normal plan while they're away from a gym. Nothing here is stored
 * — `usePersonalWorkoutPlan` swaps these in at read time when travel mode is on,
 * matching each training day's theme (from its label) to a fitting routine.
 *
 * Every move is a simple bodyweight 3 × 10 so there's no weight to track.
 */

const bw = (name: string): Exercise => ({
  name,
  sets: 3,
  reps: "10",
  suggestedWeight: "Bodyweight",
  progression: "Add reps or slow the tempo",
  isBodyweight: true,
});

const LOWER: Exercise[] = [
  "Bodyweight Squats",
  "Reverse Lunges",
  "Glute Bridges",
  "Bulgarian Split Squats",
  "Calf Raises",
  "Squat Pulses",
].map(bw);

const UPPER: Exercise[] = [
  "Push Ups",
  "Pike Push Ups",
  "Bench / Park Dips",
  "Pull Ups (park bar)",
  "Inverted Rows (low bar)",
  "Superman",
].map(bw);

const CORE: Exercise[] = [
  "Crunches",
  "Leg Raises",
  "Dead Bug",
  "Bicycle Crunches",
  "Russian Twists",
  "Sit Ups",
].map(bw);

const CONDITIONING: Exercise[] = [
  "Burpees",
  "Jump Squats",
  "Mountain Climbers",
  "High Knees",
  "Plank to Push Up",
  "Squat Thrusts",
].map(bw);

const FULL_BODY: Exercise[] = [
  "Push Ups",
  "Bodyweight Squats",
  "Reverse Lunges",
  "Park Dips",
  "Sit Ups",
  "Burpees",
].map(bw);

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
