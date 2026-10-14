// Canonical exercise names + a normalizer.
//
// Logs are written with whatever name was typed/imported, so the same movement
// shows up as "Goblet Squat" / "Goblet Squats", "Romanian Deadlift" /
// "deadlift", "Pull Up" / "Pull Ups", etc. That splits the Scorecard into
// duplicate cards and makes category/unit/strength lookups (which are keyed on
// the canonical name) silently fall through to "Other" / the kg scale.
//
// `canonicalExerciseName` collapses casing, whitespace and known aliases to one
// canonical spelling. Unknown names are returned trimmed but otherwise intact
// (so we never mangle a name we don't recognise).

// The canonical spellings used by the category / unit / level maps.
const CANONICAL_NAMES = [
  // Legs
  "Goblet Squat",
  "Barbell Squat",
  "Smith Machine Lunges",
  "Step Ups",
  "Box Jumps",
  "Leg Extension",
  "Reverse Lunges",
  // Glutes
  "Hip Thrust",
  "Cable Kickbacks",
  "Romanian Deadlift",
  "Glute Bridges",
  // Upper body
  "Lat Pulldown",
  "Dumbbell Shoulder Press",
  "Seated Row",
  "Cable Row",
  "Push Ups",
  "Pull Ups",
  "Back Extension",
  // Core
  "Plank",
  "Dead Bug",
  "Russian Twists",
  "Side Plank",
  "Bird Dog",
  "Hanging Knee Raises",
  // Cardio & power
  "Kettlebell Swings",
  "Battle Ropes",
  "Sprint / Jump Rope",
  "Bike Sprint (20s all-in + 3min rest)",
  "Farmer Carry",
  // Non-exercise
  "Recovery Day",
  "Rest Day",
];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// Known canonical names, looked up case-insensitively.
const CANONICAL_BY_KEY = new Map(CANONICAL_NAMES.map((n) => [norm(n), n]));

// Extra spellings/plurals/short forms → canonical. Keys are normalized.
const ALIASES: Record<string, string> = {
  // Romanian Deadlift
  "deadlift": "Romanian Deadlift",
  "deadlifts": "Romanian Deadlift",
  "romanian deadlifts": "Romanian Deadlift",
  "rdl": "Romanian Deadlift",
  "rdls": "Romanian Deadlift",
  // Goblet Squat
  "squat": "Goblet Squat",
  "squats": "Goblet Squat",
  "goblet squats": "Goblet Squat",
  // Bike Sprint
  "sprint": "Bike Sprint (20s all-in + 3min rest)",
  "sprints": "Bike Sprint (20s all-in + 3min rest)",
  "bike sprint": "Bike Sprint (20s all-in + 3min rest)",
  "bike sprints": "Bike Sprint (20s all-in + 3min rest)",
  // Pull Ups
  "pull up": "Pull Ups",
  "pullup": "Pull Ups",
  "pullups": "Pull Ups",
  // Push Ups
  "push up": "Push Ups",
  "pushup": "Push Ups",
  "pushups": "Push Ups",
  "push-ups": "Push Ups",
  // Glute Bridges
  "glute bridge": "Glute Bridges",
  // Leg Extension
  "leg extensions": "Leg Extension",
  // Reverse Lunges
  "reverse lunge": "Reverse Lunges",
};

/** Collapse casing/whitespace/aliases/plurals to one canonical exercise name. */
export function canonicalExerciseName(raw: string): string {
  if (!raw) return raw;
  const key = norm(raw);
  const known = CANONICAL_BY_KEY.get(key);
  if (known) return known;
  if (ALIASES[key]) return ALIASES[key];
  // Try a naive singularisation ("box jumps" is canonical, but "goblet squatss"
  // → "goblet squats" → alias). Only used as a fallback.
  const singular = key.replace(/s$/, "");
  if (CANONICAL_BY_KEY.get(singular)) return CANONICAL_BY_KEY.get(singular)!;
  if (ALIASES[singular]) return ALIASES[singular];
  // Unknown exercise — keep what the user typed (trimmed, whitespace-collapsed).
  return raw.trim().replace(/\s+/g, " ");
}
