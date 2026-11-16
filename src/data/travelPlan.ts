import { type Exercise } from "@/data/workoutPlan";
import { looseExerciseKey } from "@/lib/plan";

/**
 * Travel-mode workouts: bodyweight / calisthenics-park routines used to overlay
 * the user's normal plan while they're away from a gym. Nothing here is stored
 * — `usePersonalWorkoutPlan` swaps these in at read time when travel mode is on,
 * matching each training day's theme (from its label) to a fitting routine.
 *
 * Every move is a simple bodyweight 3 × 10 so there's no weight to track.
 */

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/**
 * Short "how to" demo for every travel move (checked to exist and allow
 * embedding). Keyed by the exact names below; `travelVideoFor` also matches
 * loosely, so a member's saved travel edits keep their videos.
 */
const TRAVEL_VIDEOS: Record<string, string> = {
  "Bodyweight Squats": yt("l83R5PblSMA"), // PureGym
  "Reverse Lunges": yt("xrPteyQLGAo"), // PureGym
  "Glute Bridges": yt("tqp5XQPpTxY"), // PureGym
  "Bulgarian Split Squats": yt("Ozv-OPuVw6A"), // same as the library
  "Calf Raises": yt("Km0QS46bTEA"), // Balance In Motion
  "Squat Pulses": yt("QV0KBKANprw"), // PureGym
  "Push Ups": yt("WDIpL0pjun0"), // NASM, same as the library
  "Pike Push Ups": yt("XckEEwa1BPI"), // NASM
  "Bench / Park Dips": yt("0326dy_-CzM"), // LIVESTRONG
  "Park Dips": yt("0326dy_-CzM"),
  "Pull Ups (park bar)": yt("6zyx46Vpato"), // nourishmovelove, first pull up
  "Inverted Rows (low bar)": yt("9fItzuh9Iok"), // The Active Life
  "Superman": yt("J9zXkxUAfUA"), // Children's Hospital Colorado
  "Crunches": yt("Xyd_fa5zoEU"), // LIVESTRONG
  "Leg Raises": yt("Zr-PtqcpeWM"), // Nuffield Health
  "Dead Bug": yt("bxn9FBrt4-A"), // NASM, same as the library
  "Bicycle Crunches": yt("eqg47ZuGZXQ"), // UCLA Health
  "Russian Twists": yt("99T1EfpMwPA"), // PureGym
  "Sit Ups": yt("pCX65Mtc_Kk"), // Detroit Medical Center
  "Burpees": yt("NCqbpkoiyXE"), // Nuffield Health
  "Jump Squats": yt("JwCaCql7VpQ"), // Onnit, same as the library
  "Mountain Climbers": yt("cnyTQDSE884"), // Well+Good
  "High Knees": yt("sTvekaq6vOU"), // PureGym
  "Plank to Push Up": yt("56vUOad6Irs"), // PureGym
  "Squat Thrusts": yt("Ny8JWqh4lNg"), // NASM
};

const VIDEO_BY_KEY = new Map(Object.entries(TRAVEL_VIDEOS).map(([n, url]) => [looseExerciseKey(n), url]));

/** Demo video for a travel move, matched loosely by name. */
export const travelVideoFor = (name: string | undefined): string | undefined =>
  name ? TRAVEL_VIDEOS[name] ?? VIDEO_BY_KEY.get(looseExerciseKey(name)) : undefined;

const bw = (name: string): Exercise => ({
  name,
  sets: 3,
  reps: "10",
  suggestedWeight: "Bodyweight",
  progression: "Add reps or slow the tempo",
  isBodyweight: true,
  videoUrl: TRAVEL_VIDEOS[name],
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
