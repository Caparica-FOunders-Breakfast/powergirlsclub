import { describe, expect, it } from "vitest";
import { bestBadge, buildWorkoutPayload, cleanNote, liftValue, planWeekNumber, postMeta, timeAgo, type DoneExercise } from "@/lib/club";
import type { Exercise } from "@/data/workoutPlan";

const ex = (name: string, extra: Partial<Exercise> = {}): Exercise => ({ name, sets: 3, reps: "10", suggestedWeight: "", progression: "", ...extra });
const done = (e: Exercise, value: number | null, previousBest: number | null = null): DoneExercise => ({ exercise: e, value, previousBest });

describe("buildWorkoutPayload", () => {
  const day = [
    done(ex("Barbell squat"), 40, 40),
    done(ex("Hip thrust"), 60, 55),
    done(ex("Push ups", { isBodyweight: true }), null),
    done(ex("Plank", { isBodyweight: true, isTimeBased: true }), 40),
    done(ex("Dumbbell row"), 14, 16),
  ];

  it("picks 3 lifts in plan order and counts the rest", () => {
    const p = buildWorkoutPayload(day, { baseSession: false });
    expect(p.lifts.map((l) => l.name)).toEqual(["Barbell squat", "Hip thrust", "Push ups"]);
    expect(p.more_count).toBe(2);
    expect(p.exercises).toBe(5);
  });

  it("marks a new best only for a higher weight than before", () => {
    const p = buildWorkoutPayload(day, { baseSession: false });
    expect(p.lifts.find((l) => l.name === "Hip thrust")?.is_new_best).toBe(true);
    expect(p.lifts.find((l) => l.name === "Barbell squat")?.is_new_best).toBe(false); // equal is not a best
  });

  it("always includes lifts with a new best, even past the first 3", () => {
    const late = [...day.slice(0, 4), done(ex("Goblet squat"), 20, 16)];
    const p = buildWorkoutPayload(late, { baseSession: false });
    expect(p.lifts.map((l) => l.name)).toContain("Goblet squat");
    expect(p.lifts).toHaveLength(3);
    expect(p.lifts.map((l) => l.name)).toEqual(["Barbell squat", "Hip thrust", "Goblet squat"]); // plan order kept
  });

  it("never shows new bests in a week 1 base session", () => {
    const p = buildWorkoutPayload(day, { baseSession: true });
    expect(p.lifts.some((l) => l.is_new_best)).toBe(false);
  });

  it("first log of an exercise is not a best", () => {
    const p = buildWorkoutPayload([done(ex("Hip thrust"), 60, null)], { baseSession: false });
    expect(p.lifts[0].is_new_best).toBe(false);
  });

  it("assisted and bodyweight moves can't set a best", () => {
    const p = buildWorkoutPayload([done(ex("Assisted pull ups", { isAssisted: true }), 20, 30)], { baseSession: false });
    expect(p.lifts[0].is_new_best).toBe(false);
  });
});

describe("liftValue", () => {
  it("reads kg, bodyweight and time", () => {
    const p = buildWorkoutPayload([
      done(ex("Squat"), 45),
      done(ex("Push ups", { isBodyweight: true }), null),
      done(ex("Plank", { isBodyweight: true, isTimeBased: true }), 40),
    ], { baseSession: false });
    expect(p.lifts.map(liftValue)).toEqual(["45 kg", "Bodyweight", "40 sec"]);
  });

  it("shows no kg when the server stripped the weight", () => {
    expect(liftValue({ name: "Squat", sets: 3, reps_or_time: "10", unit: "kg" })).toBeNull();
  });
});

describe("bestBadge", () => {
  it("says how much heavier than the last best", () => {
    expect(bestBadge([{ name: "Hip thrust", sets: 3, reps_or_time: "10", weight_kg: 70, is_new_best: true, previous_best_kg: 65 }]))
      .toEqual({ title: "New best: Hip thrust 70 kg", text: "+5 kg since the last best." });
  });
});

describe("cleanNote", () => {
  it("trims, strips links and caps at 140", () => {
    expect(cleanNote("  Slept 4 hours.   Did it anyway  ")).toBe("Slept 4 hours. Did it anyway");
    expect(cleanNote("see https://spam.example/x and www.bad.com now")).toBe("see and now");
    expect(cleanNote("buy at cheap-pills.com today")).toBe("buy at today");
    expect(cleanNote("x".repeat(200))).toHaveLength(140);
    expect(cleanNote("   ")).toBeNull();
  });

  it("keeps normal sentences with dots", () => {
    expect(cleanNote("Felt good. Next week 2.5 kg more.")).toBe("Felt good. Next week 2.5 kg more.");
  });
});

describe("meta line", () => {
  const now = new Date(2026, 10, 18, 12, 0);
  it("formats time ago", () => {
    expect(timeAgo(new Date(2026, 10, 18, 11, 48).toISOString(), now)).toBe("12 min ago");
    expect(timeAgo(new Date(2026, 10, 18, 9, 0).toISOString(), now)).toBe("3 h ago");
    expect(timeAgo(new Date(2026, 10, 17, 20, 0).toISOString(), now)).toBe("Yesterday");
    expect(timeAgo(new Date(2026, 10, 14, 20, 0).toISOString(), now)).toBe("Nov 14");
  });

  it("joins time, week and readiness", () => {
    expect(postMeta({ kind: "workout", created_at: new Date(2026, 10, 18, 10, 0).toISOString(), week_number: 2, readiness: "not_ready" }, now))
      .toBe("2 h ago · Week 2 · Not ready, light version");
    expect(postMeta({ kind: "streak", created_at: new Date(2026, 10, 18, 9, 0).toISOString(), week_number: 2, readiness: "ready" }, now)).toBe("3 h ago");
  });

  it("counts plan weeks from the week the plan started", () => {
    expect(planWeekNumber("2026-11-04T10:00:00Z", "2026-11-02")).toBe(1);
    expect(planWeekNumber("2026-11-04T10:00:00Z", "2026-11-16")).toBe(3);
    expect(planWeekNumber(null, "2026-11-16")).toBeNull();
  });
});
