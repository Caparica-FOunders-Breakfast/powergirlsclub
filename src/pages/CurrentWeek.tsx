import { useState, useEffect, useCallback, useMemo } from "react";
import { useExerciseLogs, useSaveExerciseLog, usePriorExerciseWeights } from "@/hooks/useExerciseLogs";
import { useProfile } from "@/hooks/useProfile";
import {
  usePersonalWorkoutPlan,
  useSavePersonalDay,
  useResetPersonalDay,
  useSaveTravelDay,
  useResetTravelDay,
} from "@/hooks/usePersonalWorkoutPlan";
import ExerciseEditor from "@/components/ExerciseEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { type WorkoutDay, type Exercise } from "@/data/workoutPlan";
import { startOfWeek, addWeeks, addDays, format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { PageViewToggle } from "@/components/ViewModeToggle";
import { firstNumber, makeLibraryLookup, looseExerciseKey, POWER_COLORS } from "@/lib/plan";
import { useExerciseLibrary } from "@/hooks/usePlan";

// Accepts the common YouTube URL shapes and returns a clean /embed/ URL.
function toYouTubeEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const patterns = [
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /[?&]v=([A-Za-z0-9_-]{6,})/i,
  ];
  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

/** Bodyweight moves have no input box, so ticking them off needs no value. */
const needsValue = (ex: { isBodyweight?: boolean; isTimeBased?: boolean }) => !(ex.isBodyweight && !ex.isTimeBased);

const getWeekStart = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");

const C = {
  bg: "#FBF9FB",
  ink: "#2B1736",
  grad: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)",
  sub: "#77677E",
  body: "#5E4E66",
  pink: "#C21C70",
  magenta: "#E8308C",
  tile: "#F6F1F7",
  lilac: "#F1E9FE",
  border: "#E4DAE7",
  purple: "#6B2FB3",
};
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const card: React.CSSProperties = { background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22 };

// Body-part colour for the compact mobile week dots (Lower=pink, Upper=purple, Core=ink).
const dayDotColor = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("upper")) return C.purple;
  if (l.includes("core")) return C.ink;
  return C.magenta;
};
// Matching light tint for a training day's tile.
const dayTint = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("upper")) return "#F4EDFE";
  if (l.includes("core")) return "#F3EEF4";
  return "#FFF0F7";
};

type Mood = "Ready" | "So-so" | "Not ready";
const MOODS: { label: Mood; hint: string }[] = [
  { label: "Ready", hint: "Push hard, go heavier" },
  { label: "So-so", hint: "Same weight as last time" },
  { label: "Not ready", hint: "Lighter version" },
];
const MOOD_TAG: Record<Mood, { text: string; bg: string; fg: string }> = {
  "Ready": { text: "Go heavier", bg: "#FCE4F0", fg: "#A3165E" },
  "So-so": { text: "Same as last time", bg: "#F1E9FE", fg: "#5B21B6" },
  "Not ready": { text: "Light version", bg: "#F3EDF4", fg: "#5E4E66" },
};

const readMoods = (weekStart: string): Record<number, Mood> => {
  try {
    const raw = window.localStorage.getItem(`powerclub:mood:${weekStart}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const CurrentWeek = () => {
  const { data: profile } = useProfile();
  const bodyWeight = profile?.body_weight ?? 70;
  const { plan: weeklyPlan, hasCustom, hasTravelCustom, travelMode } = usePersonalWorkoutPlan();
  const savePersonalDay = useSavePersonalDay();
  const resetPersonalDay = useResetPersonalDay();
  const saveTravelDay = useSaveTravelDay();
  const resetTravelDay = useResetTravelDay();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  // How-to videos come from the exercise library when the plan row has none
  // (older and custom plans rarely stored links).
  const { data: library } = useExerciseLibrary();
  const findInLibrary = useMemo(() => makeLibraryLookup(library), [library]);

  const now = new Date();
  const currentWeekDate = startOfWeek(now, { weekStartsOn: 1 });
  const [weekOffset, setWeekOffset] = useState(0);

  const selectedWeekDate = addWeeks(currentWeekDate, weekOffset);
  const weekStart = getWeekStart(selectedWeekDate);
  const isCurrentWeek = weekOffset === 0;

  const { data: logs } = useExerciseLogs(weekStart);
  const { data: priorWeights } = usePriorExerciseWeights(weekStart);
  const saveLog = useSaveExerciseLog(weekStart);

  const today = now.getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(isCurrentWeek ? todayIndex : 0);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [localWeights, setLocalWeights] = useState<Record<string, string>>({});
  const [localCompleted, setLocalCompleted] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState(false);
  const [videoModal, setVideoModal] = useState<{ name: string; url: string } | null>(null);
  const [moodByDay, setMoodByDay] = useState<Record<number, Mood>>(() => readMoods(weekStart));
  const embedUrl = toYouTubeEmbedUrl(videoModal?.url);

  // Reset state when the week changes.
  useEffect(() => {
    setInitialized(false);
    setLocalWeights({});
    setLocalCompleted({});
    setEditingDay(null);
    setMoodByDay(readMoods(weekStart));
    // Focus today on the current week, else the first workout day.
    const firstWorkout = weeklyPlan.findIndex((d) => !d.isRest && !d.isRecovery);
    setSelectedDayIndex(isCurrentWeek ? todayIndex : firstWorkout >= 0 ? firstWorkout : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, isCurrentWeek, todayIndex]);

  // Hydrate local state from DB.
  useEffect(() => {
    if (logs && !initialized) {
      const w: Record<string, string> = {};
      const c: Record<string, boolean> = {};
      Object.entries(logs).forEach(([key, log]) => {
        if (log.weight_used != null) {
          w[key] = Number(log.weight_used) === -1 ? "F" : String(log.weight_used);
        }
        c[key] = log.completed;
      });
      setLocalWeights(w);
      setLocalCompleted(c);
      setInitialized(true);
    }
  }, [logs, initialized]);

  const prevWeightMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (priorWeights) Object.entries(priorWeights).forEach(([key, weights]) => { if (weights.length > 0) map[key] = weights[0]; });
    return map;
  }, [priorWeights]);
  const prevPrevWeightMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (priorWeights) Object.entries(priorWeights).forEach(([key, weights]) => { if (weights.length > 1) map[key] = weights[1]; });
    return map;
  }, [priorWeights]);

  const getExKey = (dayIdx: number, exIdx: number) => `${dayIdx}-${exIdx}`;

  const getDayCompletion = (dayIdx: number, day: WorkoutDay) => {
    if ((day.isRest || day.isRecovery) && day.exercises.length === 0) {
      return localCompleted[getExKey(dayIdx, 0)] ? 100 : 0;
    }
    if (day.exercises.length === 0) return 0;
    const done = day.exercises.filter((_, i) => localCompleted[getExKey(dayIdx, i)]).length;
    return Math.round((done / day.exercises.length) * 100);
  };

  const saveExercise = useCallback(
    (dayIdx: number, exIdx: number, exerciseName: string, weight: string, completed: boolean) => {
      const isFailed = weight.trim().toUpperCase() === "F";
      saveLog.mutate({
        dayIndex: dayIdx,
        exerciseIndex: exIdx,
        exerciseName,
        weightUsed: isFailed ? -1 : weight ? Number(weight) : null,
        completed,
      });
    },
    [saveLog],
  );

  const toggleExercise = (dayIdx: number, exIdx: number, exerciseName: string, requiresValue = true) => {
    const key = getExKey(dayIdx, exIdx);
    const newVal = !localCompleted[key];
    if (newVal && requiresValue && !localWeights[key]?.trim()) {
      toast({ title: "Enter a value first", description: "Add weight, reps or time, or F for failed." });
      return;
    }
    setLocalCompleted((prev) => ({ ...prev, [key]: newVal }));
    saveExercise(dayIdx, exIdx, exerciseName, localWeights[key] || "", newVal);
    if (newVal) confetti({ particleCount: 30, spread: 50, colors: ["#FF2D87", "#00F5D4", "#FFE600", "#5271FF"], origin: { y: 0.8 }, gravity: 1.2 });
  };

  const handleWeightChange = (dayIdx: number, exIdx: number, value: string) => {
    setLocalWeights((prev) => ({ ...prev, [getExKey(dayIdx, exIdx)]: value }));
  };
  const handleWeightBlur = (dayIdx: number, exIdx: number, exerciseName: string) => {
    const key = getExKey(dayIdx, exIdx);
    saveExercise(dayIdx, exIdx, exerciseName, localWeights[key] || "", localCompleted[key] || false);
  };

  const handleCompleteDay = (dayIdx: number, day: WorkoutDay) => {
    const missing = day.exercises.filter((ex, i) => needsValue(ex) && !localWeights[getExKey(dayIdx, i)]?.trim());
    if (missing.length > 0) {
      toast({ title: "Fill in all values first", description: `${missing.length} exercise${missing.length > 1 ? "s" : ""} missing weight, reps or time (or F for failed).` });
      return;
    }
    const updates: Record<string, boolean> = {};
    day.exercises.forEach((ex, i) => {
      const key = getExKey(dayIdx, i);
      updates[key] = true;
      saveExercise(dayIdx, i, ex.name, localWeights[key] || "", true);
    });
    setLocalCompleted((prev) => ({ ...prev, ...updates }));
    confetti({ particleCount: 120, spread: 80, colors: ["#FF2D87", "#00F5D4", "#FFE600", "#5271FF"], origin: { y: 0.6 } });
    toast({ title: "Workout complete!" });
  };

  const toggleRestDone = (dayIdx: number, day: WorkoutDay) => {
    const restKey = getExKey(dayIdx, 0);
    const newVal = !localCompleted[restKey];
    setLocalCompleted((prev) => ({ ...prev, [restKey]: newVal }));
    saveExercise(dayIdx, 0, day.isRecovery ? "Recovery Day" : "Rest Day", "", newVal);
    if (newVal) {
      confetti({ particleCount: 40, spread: 60, colors: ["#FF2D87", "#00F5D4", "#FFE600", "#5271FF"], origin: { y: 0.7 }, gravity: 1.2 });
      toast({ title: day.isRecovery ? "Recovery done!" : "Rest day logged!" });
    }
  };

  const setMood = (dayIdx: number, mood: Mood) => {
    setMoodByDay((prev) => {
      const next = { ...prev, [dayIdx]: mood };
      try { window.localStorage.setItem(`powerclub:mood:${weekStart}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  if (!weeklyPlan.length) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: C.pink, borderTopColor: "transparent" }} />
      </div>
    );
  }

  const selectedDay = weeklyPlan[selectedDayIndex] ?? weeklyPlan[0];
  const weekEndDate = addDays(selectedWeekDate, 6);
  const sameMonth = format(selectedWeekDate, "MMM") === format(weekEndDate, "MMM");
  const weekRangeLabel = `${format(selectedWeekDate, "MMM d")} – ${sameMonth ? format(weekEndDate, "d") : format(weekEndDate, "MMM d")}`;

  // Editing takes over the view.
  if (editingDay !== null) {
    const day = weeklyPlan[editingDay];
    return (
      <div style={{ background: C.bg, minHeight: "100%", padding: isMobile ? "20px 16px 28px" : "32px 24px 64px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <button type="button" onClick={() => setEditingDay(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 14, color: C.pink, background: "transparent", border: 0, cursor: "pointer", padding: "6px 0" }}>
            ← Back to this week
          </button>
          <h1 style={{ margin: "6px 0 0", ...bangers, fontSize: isMobile ? 38 : 44, letterSpacing: 1, color: C.ink }}>Edit {day.day}</h1>
          <p style={{ margin: "6px 0 18px", color: C.body, fontWeight: 700 }}>{day.label} · {day.exercises.length} exercises</p>
          <ExerciseEditor
            day={day}
            dayIndex={editingDay}
            hasCustom={travelMode ? hasTravelCustom(editingDay) : hasCustom(editingDay)}
            onSave={(exercises) => {
              if (travelMode) {
                saveTravelDay.mutate({ dayIndex: editingDay, exercises, label: day.label, emoji: day.emoji });
              } else {
                savePersonalDay.mutate({ dayIndex: editingDay, exercises, label: day.label, emoji: day.emoji, isRest: day.isRest, isRecovery: day.isRecovery, restNote: day.restNote });
              }
            }}
            onReset={() => {
              if (travelMode) resetTravelDay.mutate(editingDay);
              else resetPersonalDay.mutate(editingDay);
              setEditingDay(null);
              toast({ description: travelMode ? "Reset to the default travel workout" : "Reset to default exercises", duration: 1500 });
            }}
            onClose={() => setEditingDay(null)}
          />
        </div>
      </div>
    );
  }

  const selDone = getDayCompletion(selectedDayIndex, selectedDay);
  const doneCount = selectedDay.exercises.filter((_, i) => localCompleted[getExKey(selectedDayIndex, i)]).length;
  const total = selectedDay.exercises.length;
  const allDone = total > 0 && doneCount === total;
  const mood: Mood = moodByDay[selectedDayIndex] ?? "Ready";
  const isTodayFocused = isCurrentWeek && selectedDayIndex === todayIndex;

  // Next up: upcoming workout days after the focused one.
  const nextUp = weeklyPlan
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => i > selectedDayIndex && !d.isRest && !d.isRecovery && d.exercises.length > 0)
    .slice(0, 2)
    .map(({ d, i }) => ({ day: d, index: i, rel: i === todayIndex + 1 && isCurrentWeek ? "Tomorrow" : format(addDays(selectedWeekDate, i), "MMM d") }));

  const plannedWorkouts = weeklyPlan
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => !d.isRest && !d.isRecovery && d.exercises.length > 0);
  const plannedCount = plannedWorkouts.length;
  const doneWorkouts = plannedWorkouts.filter(({ d, i }) => getDayCompletion(i, d) === 100).length;
  // "Left this week" = planned workouts still ahead (today onward) and not done.
  // Missed past days aren't "left", so Sunday no longer reports the whole week;
  // past weeks have nothing left, future weeks have everything left.
  const leftCount = weekOffset < 0
    ? 0
    : plannedWorkouts.filter(({ d, i }) => getDayCompletion(i, d) < 100 && (weekOffset > 0 || i >= todayIndex)).length;

  return (
    <div style={{ background: C.bg, minHeight: "100%", color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5, padding: isMobile ? "20px 16px 28px" : "32px 24px 64px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>
        {/* Header */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: isMobile ? 10 : 20 }}>
          <h1 style={{ margin: 0, ...bangers, fontSize: isMobile ? 40 : 52, letterSpacing: 1, lineHeight: 1 }}>This week</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 4, border: `2px solid ${C.ink}`, borderRadius: 999, background: "#FFFFFF" }}>
            <button type="button" aria-label="Previous week" onClick={() => setWeekOffset((o) => o - 1)} style={{ width: 44, height: 40, border: 0, background: "transparent", cursor: "pointer", fontSize: 18, fontWeight: 800 }}>‹</button>
            <span style={{ fontWeight: 800, fontSize: 15, padding: "0 4px", whiteSpace: "nowrap" }}>{weekRangeLabel}</span>
            <button type="button" aria-label="Next week" onClick={() => setWeekOffset((o) => o + 1)} style={{ width: 44, height: 40, border: 0, background: "transparent", cursor: "pointer", fontSize: 18, fontWeight: 800 }}>›</button>
          </div>
          {!isCurrentWeek && (
            <button type="button" onClick={() => setWeekOffset(0)} style={{ fontWeight: 800, fontSize: 14, color: C.pink, background: "transparent", border: 0, cursor: "pointer" }}>Go to this week</button>
          )}
          <PageViewToggle />
        </div>

        {/* Week overview */}
        {isMobile ? (
          <div>
            <section aria-label="Week overview" style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5 }}>
              {weeklyPlan.map((d, i) => {
                const isSel = i === selectedDayIndex;
                const isToday = isCurrentWeek && i === todayIndex;
                const isRest = (d.isRest || d.isRecovery) && d.exercises.length === 0;
                const dot = isToday ? "#FFFFFF" : isRest ? "#E4DAE7" : dayDotColor(d.label);
                const bg = isToday ? C.ink : isRest ? C.tile : "#FFFFFF";
                const fg = isToday ? "#FFFFFF" : isRest ? C.sub : C.ink;
                const baseBorder = isToday ? C.ink : isRest ? C.tile : C.border;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDayIndex(i)}
                    aria-pressed={isSel}
                    style={{ padding: "8px 2px 10px", borderRadius: 14, background: bg, color: fg, border: `2px solid ${isSel && !isToday ? C.magenta : baseBorder}`, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800 }}>{d.day.slice(0, 3)}</span>
                    <span style={{ ...bangers, fontSize: 20, lineHeight: 1 }}>{format(addDays(selectedWeekDate, i), "d")}</span>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: dot }} />
                  </button>
                );
              })}
            </section>
            <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: C.body }}>
              {plannedCount} workout{plannedCount === 1 ? "" : "s"} planned · {leftCount} left this week
            </p>
          </div>
        ) : (
        <section style={{ ...card }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "18px 22px", borderBottom: `2px solid ${C.ink}` }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>
              {plannedCount} workout{plannedCount === 1 ? "" : "s"} planned
              <span style={{ color: C.sub }}> · {leftCount} left this week</span>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {[
                { label: "Lower body", color: C.magenta },
                { label: "Upper body", color: C.purple },
                { label: "Core", color: C.ink },
              ].map((l) => (
                <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: C.body }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, padding: "18px 18px 22px", overflowX: "auto" }}>
            {weeklyPlan.map((d, i) => {
              const isSel = i === selectedDayIndex;
              const isToday = isCurrentWeek && i === todayIndex;
              const isRest = (d.isRest || d.isRecovery) && d.exercises.length === 0;
              const total = d.exercises.length;
              const done = d.exercises.filter((_, k) => localCompleted[getExKey(i, k)]).length;
              const fullyDone = total > 0 ? done === total : getDayCompletion(i, d) === 100;
              const status = isToday
                ? isRest ? "Today · recover" : fullyDone ? "Done" : `Today · ${done} of ${total}`
                : isRest ? "Recover"
                : fullyDone ? "Done"
                : done > 0 ? `${done} of ${total}`
                : "Not logged";
              const accent = dayDotColor(d.label);
              const bg = isToday ? C.grad : isRest ? C.bg : dayTint(d.label);
              const fg = isToday ? "#FFFFFF" : isRest ? C.body : C.ink;
              const dateFg = isToday ? "rgba(255,255,255,0.82)" : C.sub;
              const border = isToday ? C.ink : isSel ? C.magenta : isRest ? "#EFE6F1" : C.border;
              // Today is the widest tile, training days next, rest days narrowest.
              const flex = isToday ? "1.6 1 0" : isRest ? "1 1 0" : "1.4 1 0";
              const minW = isToday ? 150 : isRest ? 92 : 136;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDayIndex(i)}
                  style={{ flex, minWidth: minW, minHeight: 132, textAlign: "left", background: bg, color: fg, border: `2px solid ${border}`, borderRadius: 18, padding: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10, boxShadow: isToday ? `4px 4px 0 ${C.ink}` : isSel ? `3px 3px 0 ${C.magenta}` : "none" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{d.day.slice(0, 3)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: dateFg }}>{format(addDays(selectedWeekDate, i), "MMM d")}</span>
                  </div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{isRest ? (d.isRecovery ? "Recovery" : "Rest") : d.label}</p>
                  <div style={{ marginTop: "auto" }}>
                    {!isRest && total > 0 && (
                      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                        {Array.from({ length: total }).map((_, k) => {
                          const filled = !!localCompleted[getExKey(i, k)];
                          const dashBg = isToday ? (filled ? "#FFFFFF" : "rgba(255,255,255,0.3)") : filled ? accent : C.border;
                          return <span key={k} style={{ flex: 1, height: 8, borderRadius: 999, background: dashBg }} />;
                        })}
                      </div>
                    )}
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", background: isToday ? "#FFFFFF" : isRest ? "#EFE6F1" : fullyDone ? accent : "#FFFFFF", color: isToday ? C.ink : isRest ? C.body : fullyDone ? "#FFFFFF" : C.body }}>{status}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 16 : 24, alignItems: "flex-start" }}>
          {/* Focused day */}
          <section style={{ flex: "2 1 560px", minWidth: 0, ...card, boxShadow: `6px 6px 0 ${C.magenta}`, overflow: "hidden" }}>
            {(selectedDay.isRest || selectedDay.isRecovery) && total === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <span style={{ margin: "0 auto", width: 64, height: 64, borderRadius: 999, background: C.lilac, border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>
                </span>
                <h2 style={{ margin: "8px 0 0", ...bangers, fontSize: 36, letterSpacing: 1 }}>{selectedDay.isRecovery ? "Recovery day" : "Rest day"}</h2>
                {selectedDay.restNote && <p style={{ margin: "8px 0 0", color: C.body, fontWeight: 700 }}>{selectedDay.restNote}</p>}
                <button type="button" onClick={() => toggleRestDone(selectedDayIndex, selectedDay)} style={{ marginTop: 20, minHeight: 52, padding: "0 28px", background: selDone ? "#FFF5FA" : C.pink, color: selDone ? C.ink : "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 17, cursor: "pointer" }}>
                  {selDone ? "Done" : "Mark as done"}
                </button>
              </div>
            ) : (
              <>
                <div style={{ background: C.grad, color: "#FFFFFF", padding: isMobile ? "18px" : "24px 28px", borderBottom: `2px solid ${C.ink}` }}>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, fontWeight: 800, letterSpacing: 1, color: "rgba(255,255,255,0.88)" }}>{isTodayFocused ? "TODAY · " : ""}{selectedDay.day.toUpperCase()}</p>
                      <h2 style={{ margin: "4px 0 0", ...bangers, fontSize: isMobile ? 34 : 44, letterSpacing: 1, lineHeight: 1 }}>{selectedDay.label}</h2>
                      <p style={{ margin: "6px 0 0", fontSize: isMobile ? 14 : 16, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>{total} exercises{isMobile ? "" : " · 3 rounds"} · about 30 min{isMobile ? "" : "utes"}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, ...bangers, fontSize: isMobile ? 34 : 40, lineHeight: 1 }}>{doneCount}/{total}</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>done</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 16, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.28)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${total ? (doneCount / total) * 100 : 0}%`, background: "#FFFFFF", borderRadius: 999 }} />
                  </div>
                </div>

                {/* Readiness */}
                <div style={{ padding: isMobile ? "18px 18px 6px" : "22px 28px 6px" }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>How do you feel today?</p>
                  {isMobile ? (
                    <>
                      <div style={{ marginTop: 10, display: "flex", border: `2px solid ${C.ink}`, borderRadius: 14, overflow: "hidden" }}>
                        {MOODS.map((r) => {
                          const on = r.label === mood;
                          return (
                            <button key={r.label} type="button" aria-pressed={on} onClick={() => setMood(selectedDayIndex, r.label)} style={{ flex: 1, minHeight: 48, border: 0, background: on ? C.ink : "#FFFFFF", color: on ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{r.label}</button>
                          );
                        })}
                      </div>
                      <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: C.body }}>{MOODS.find((m) => m.label === mood)?.hint}</p>
                    </>
                  ) : (
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                      {MOODS.map((r) => {
                        const on = r.label === mood;
                        return (
                          <button key={r.label} type="button" aria-pressed={on} onClick={() => setMood(selectedDayIndex, r.label)} style={{ minHeight: 64, padding: "10px 12px", border: `2px solid ${C.ink}`, borderRadius: 14, background: on ? C.ink : "#FFFFFF", color: on ? "#FFFFFF" : C.ink, textAlign: "left", cursor: "pointer", boxShadow: on ? `3px 3px 0 ${C.magenta}` : "none" }}>
                            <span style={{ display: "block", fontWeight: 800, fontSize: 16 }}>{r.label}</span>
                            <span style={{ display: "block", fontSize: 13, fontWeight: 600, opacity: 0.9 }}>{r.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Exercises */}
                <div style={{ padding: isMobile ? "14px 18px 8px" : "16px 28px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: 1, color: C.sub }}>EXERCISES</p>
                  <button type="button" onClick={() => setEditingDay(selectedDayIndex)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 14, color: C.pink, background: "transparent", border: 0, cursor: "pointer", padding: "8px 0" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
                    Edit exercises
                  </button>
                </div>
                <div style={{ padding: isMobile ? "0 18px" : "0 28px", display: "flex", flexDirection: "column", gap: isMobile ? 8 : 10 }}>
                  {selectedDay.exercises.map((ex, i) => {
                    const key = getExKey(selectedDayIndex, i);
                    return (
                      <FocusedExerciseRow
                        key={i}
                        exercise={ex}
                        mood={mood}
                        compact={isMobile}
                        fallbackVideoUrl={findInLibrary(ex.name)?.video_url ?? undefined}
                        isPower={findInLibrary(ex.name)?.type === "power"}
                        isDone={!!localCompleted[key]}
                        weight={localWeights[key] || ""}
                        lastWeekWeight={prevWeightMap[looseExerciseKey(ex.name)]}
                        prevPrevWeekWeight={prevPrevWeightMap[looseExerciseKey(ex.name)]}
                        onWeightChange={(v) => handleWeightChange(selectedDayIndex, i, v)}
                        onWeightBlur={() => handleWeightBlur(selectedDayIndex, i, ex.name)}
                        onToggle={() => toggleExercise(selectedDayIndex, i, ex.name, needsValue(ex))}
                        onVideoClick={(url) => setVideoModal({ name: ex.name, url })}
                      />
                    );
                  })}
                </div>
                <div style={{ padding: isMobile ? "16px 18px 20px" : "20px 28px 28px" }}>
                  {allDone ? (
                    <div role="status" style={{ width: "100%", minHeight: 56, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 18 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block" }}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      Workout complete!
                    </div>
                  ) : (
                    <button type="button" onClick={() => handleCompleteDay(selectedDayIndex, selectedDay)} style={{ width: "100%", minHeight: 56, background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 18, cursor: "pointer" }}>
                      Finish workout
                    </button>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Right column */}
          <aside style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>
            {/* Your week: progress counted against the planned training days, not 7. */}
            {plannedCount > 0 && (
              <section style={{ ...card, padding: 22 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: 1, color: C.sub }}>YOUR WEEK</p>
                <p style={{ margin: "4px 0 0", ...bangers, fontSize: isMobile ? 30 : 34, letterSpacing: 0.5, lineHeight: 1.1 }}>{doneWorkouts} of {plannedCount} workouts</p>
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  {Array.from({ length: plannedCount }).map((_, k) => (
                    <span key={k} style={{ flex: 1, height: 12, borderRadius: 999, background: k < doneWorkouts ? C.magenta : "#FFFFFF", border: `2px solid ${C.ink}` }} />
                  ))}
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 15, fontWeight: 600, color: C.body }}>
                  {doneWorkouts >= plannedCount
                    ? "Week complete. Nice work."
                    : leftCount === 0
                      ? "Nothing left this week. Next week is a fresh start."
                      : `${leftCount} to go this week. Every session counts.`}
                </p>
              </section>
            )}

            <section style={{ ...card, padding: 22 }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, letterSpacing: 1, color: C.sub }}>NEXT UP</p>
              {nextUp.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {nextUp.map((n) => (
                    <button key={n.index} type="button" onClick={() => setSelectedDayIndex(n.index)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: C.tile, border: 0, cursor: "pointer", textAlign: "left", width: "100%" }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800 }}>{n.day.day}</p>
                        <p style={{ margin: 0, fontSize: 14, color: C.body }}>{n.day.label} · {n.day.exercises.length} exercises</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: n.rel === "Tomorrow" ? C.purple : C.sub }}>{n.rel}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: C.body }}>No more workouts this week.</p>
              )}
              <button type="button" onClick={() => navigate("/plan-setup")} style={{ marginTop: 14, padding: "6px 0", border: 0, background: "transparent", color: C.pink, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Change my training days</button>
            </section>

            <section style={{ background: C.lilac, border: `2px solid ${C.ink}`, borderRadius: 22, padding: 22 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>Tip for today</p>
              <p style={{ margin: "6px 0 0", fontSize: 15, color: C.body }}>Not feeling it? Pick “Not ready” and do the light version. A short session still counts, showing up is what builds the habit.</p>
            </section>
          </aside>
        </div>
      </div>

      <Dialog open={!!videoModal} onOpenChange={(o) => !o && setVideoModal(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>{videoModal?.name}</DialogTitle>
          </DialogHeader>
          <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%" }}>
            {embedUrl ? (
              <iframe src={embedUrl} title={videoModal?.name} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub }}>Couldn't load this video.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Per-exercise row inside the focused day card ──
function FocusedExerciseRow({
  exercise, mood, isDone, weight, lastWeekWeight, prevPrevWeekWeight, compact = false, fallbackVideoUrl, isPower = false,
  onWeightChange, onWeightBlur, onToggle, onVideoClick,
}: {
  exercise: Exercise;
  mood: Mood;
  compact?: boolean;
  fallbackVideoUrl?: string;
  /** Power exercise (library type "power"): blue card with a POWER label. */
  isPower?: boolean;
  isDone: boolean;
  weight: string;
  lastWeekWeight?: number;
  prevPrevWeekWeight?: number;
  onWeightChange: (val: string) => void;
  onWeightBlur: () => void;
  onToggle: () => void;
  onVideoClick: (url: string) => void;
}) {
  const videoUrl = exercise.videoUrl?.trim() || fallbackVideoUrl;
  const isRounds = exercise.isRoundsBased;
  const isTime = exercise.isTimeBased;
  const isAssisted = exercise.isAssisted;
  const isBodyweight = exercise.isBodyweight && !isTime;
  const unit = isAssisted ? "kg" : isRounds ? "reps" : isTime ? "sec" : "kg";

  // First number only: "+2 to 2.5 kg/week" is +2, not +22.5. Sign comes from
  // the exercise type below, so the number is read unsigned.
  const parsedIncrement = parseFloat(firstNumber(exercise.progression) || "0");
  const increment = parsedIncrement !== 0 ? (isAssisted ? -Math.abs(parsedIncrement) : Math.abs(parsedIncrement)) : (isAssisted ? -2 : isRounds ? 1 : isTime ? 5 : 2);

  const lastWeekFailed = lastWeekWeight === -1;
  const effectiveLast = lastWeekFailed
    ? (prevPrevWeekWeight != null && prevPrevWeekWeight !== -1 ? prevPrevWeekWeight : null)
    : (lastWeekWeight != null ? lastWeekWeight : null);

  // Readiness adjusts the SUGGESTED target (shown as placeholder/hint). The
  // input still starts empty and only persists what the user enters, so no
  // weight is ever logged that the user didn't lift.
  let target: number | null = null;
  if (effectiveLast != null) {
    if (mood === "Ready") target = effectiveLast + increment;
    else if (mood === "So-so") target = effectiveLast;
    else target = isAssisted ? Math.round(effectiveLast * 1.2 * 2) / 2 : unit === "reps" ? Math.max(1, effectiveLast - 4) : Math.round(effectiveLast * 0.8 * 2) / 2;
  }
  const tag = MOOD_TAG[mood];
  const lastLabel = lastWeekFailed ? "Failed last time" : effectiveLast != null ? `Last time ${effectiveLast} ${unit}` : "First time";

  return (
    <div style={{ display: "flex", flexWrap: compact ? "nowrap" : "wrap", alignItems: "center", gap: compact ? "8px 10px" : "12px 16px", padding: compact ? "10px 12px" : "14px 16px", border: `2px solid ${isDone ? C.magenta : isPower ? POWER_COLORS.border : C.border}`, borderRadius: 16, background: isDone ? "#FFF5FA" : isPower ? POWER_COLORS.bg : "#FFFFFF" }}>
      <button type="button" onClick={onToggle} aria-pressed={isDone} aria-label={`${isDone ? "Mark not done" : "Mark done"}: ${exercise.name}`} style={{ flex: "none", width: 44, height: 44, borderRadius: 999, border: `2px solid ${C.ink}`, background: isDone ? C.magenta : "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDone ? "#FFFFFF" : C.border} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
      </button>
      <div style={{ flex: compact ? "1 1 0%" : "1 1 200px", minWidth: 0 }}>
        {isPower && <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 800, letterSpacing: 1, color: POWER_COLORS.label }}>POWER</p>}
        <p style={{ margin: 0, fontWeight: 800, fontSize: compact ? 15 : 17, textDecoration: isDone ? "line-through" : "none", display: "flex", alignItems: "center", gap: 8 }}>
          {exercise.name}
          {videoUrl && (
            <button type="button" onClick={() => onVideoClick(videoUrl)} aria-label={`Watch tutorial for ${exercise.name}`} style={{ flex: "none", width: 24, height: 24, borderRadius: 999, border: 0, background: "rgba(194,28,112,0.1)", color: C.pink, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg></button>
          )}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: compact ? 12 : 14, fontWeight: 700, color: C.body }}>
          <span style={{ color: C.pink }}>{isRounds ? `${exercise.sets} rounds` : exercise.reps ? `${exercise.sets} × ${exercise.reps}` : `${exercise.sets} sets`}</span> · {lastLabel}
        </p>
      </div>
      {isBodyweight ? (
        <span style={{ flex: "none", padding: "4px 10px", borderRadius: 999, background: C.tile, color: C.body, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>Bodyweight</span>
      ) : (
        <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          {!compact && <span style={{ padding: "4px 10px", borderRadius: 999, background: tag.bg, color: tag.fg, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>{tag.text}</span>}
          <label style={{ display: "flex", alignItems: "center", height: 44, border: `2px solid ${weight === "F" ? "#C0244E" : C.ink}`, borderRadius: 12, background: "#FFFFFF", overflow: "hidden", opacity: isDone ? 0.5 : 1 }}>
            <input
              type="text"
              inputMode="text"
              aria-label={`${exercise.name} today`}
              placeholder={target != null ? String(target) : unit}
              value={weight}
              disabled={isDone}
              onChange={(e) => { const v = e.target.value; if (v === "" || /^[Ff]$/.test(v) || /^\d*\.?\d*$/.test(v)) onWeightChange(v.toUpperCase()); }}
              onBlur={onWeightBlur}
              style={{ width: compact ? 44 : 56, height: "100%", border: 0, padding: compact ? "0 6px" : "0 8px", textAlign: "right", fontWeight: 800, fontSize: compact ? 16 : 17, color: weight === "F" ? "#C0244E" : C.ink, background: "transparent" }}
            />
            <span style={{ padding: compact ? "0 8px 0 2px" : "0 12px 0 4px", fontSize: compact ? 13 : 14, fontWeight: 700, color: C.sub }}>{unit}</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default CurrentWeek;
