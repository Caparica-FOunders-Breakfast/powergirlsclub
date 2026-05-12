// Thresholds for non-kg exercises: [Beginner→Leveling Up, →Strong, →Very Strong, →Elite]
export const NON_KG_THRESHOLDS: Record<string, number[]> = {
  "Plank": [30, 60, 90, 120],
  "Side Plank": [15, 30, 45, 60],
  "Battle Ropes": [20, 40, 60, 90],
  "Farmer Carry": [20, 40, 60, 90],
  "Push Ups": [10, 20, 35, 50],
  "Dead Bug": [8, 15, 25, 40],
  "Bird Dog": [8, 15, 25, 40],
  "Hanging Knee Raises": [5, 12, 20, 30],
  "Box Jumps": [5, 12, 20, 30],
  "Bike Sprint (20s all-in + 3min rest)": [1, 2, 4, 6],
  "Sprint / Jump Rope": [1, 2, 4, 6],
};

// Assisted exercises: lower assistance = stronger (inverted scale)
// Thresholds are assistance kg values going DOWN: [Beginner+, Early Int, Int, Int+, Advanced, Goal]
export const ASSISTED_EXERCISE_THRESHOLDS: Record<string, { thresholds: number[]; labels: string[]; icons: string[] }> = {
  "Pull Ups": {
    // thresholds: assistance weight boundaries (descending — lower is better)
    thresholds: [60, 50, 40, 30, 15, 0],
    labels: ["🌱 Beginner", "🌿 Beginner+", "🌼 Early Intermediate", "🌻 Intermediate", "🔥 Intermediate+", "⚡ Advanced", "👑 Goal"],
    icons: ["🌱", "🌿", "🌼", "🌻", "🔥", "⚡", "👑"],
  },
};

export function getAssistedLevel(name: string, assistanceKg: number) {
  const config = ASSISTED_EXERCISE_THRESHOLDS[name];
  if (!config) return LEVEL_DEFS[0];
  const { thresholds, labels, icons } = config;
  // Walk thresholds descending — first one the value is <= determines level
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (assistanceKg <= thresholds[i]) {
      return { label: labels[i + 1] || labels[labels.length - 1], icon: icons[i + 1] || icons[icons.length - 1], index: i + 1 };
    }
  }
  return { label: labels[0], icon: icons[0], index: 0 };
}

export function getAssistedProgress(name: string, assistanceKg: number) {
  const config = ASSISTED_EXERCISE_THRESHOLDS[name];
  if (!config) return 0;
  const max = config.thresholds[0]; // highest assistance (worst)
  if (assistanceKg >= max) return 0;
  if (assistanceKg <= 0) return 100;
  return ((max - assistanceKg) / max) * 100;
}

export const ASSISTED_EXERCISES = new Set(Object.keys(ASSISTED_EXERCISE_THRESHOLDS));

export const LEVEL_DEFS = [
  { label: "Beginner" as const, icon: "🌱", index: 0 },
  { label: "Leveling Up" as const, icon: "⚡", index: 1 },
  { label: "Strong" as const, icon: "💪", index: 2 },
  { label: "Very Strong" as const, icon: "🔥", index: 3 },
  { label: "Elite" as const, icon: "👑", index: 4 },
];

export function getNonKgLevel(name: string, value: number) {
  const thresholds = NON_KG_THRESHOLDS[name];
  if (!thresholds) return LEVEL_DEFS[0];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return LEVEL_DEFS[i + 1] || LEVEL_DEFS[4];
  }
  return LEVEL_DEFS[0];
}

export function getNonKgProgress(name: string, value: number) {
  const thresholds = [0, ...(NON_KG_THRESHOLDS[name] || [10, 20, 30, 50])];
  for (let i = 1; i < thresholds.length; i++) {
    if (value < thresholds[i]) {
      const segProg = (value - thresholds[i - 1]) / (thresholds[i] - thresholds[i - 1]);
      return ((i - 1) / (thresholds.length - 1)) * 100 + (segProg / (thresholds.length - 1)) * 100;
    }
  }
  return 100;
}
