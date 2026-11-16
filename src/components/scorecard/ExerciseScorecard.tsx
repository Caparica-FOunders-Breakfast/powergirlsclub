import { useState, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useExerciseScorecard, getLevel } from "@/hooks/useExerciseScorecard";
import { useActivityData } from "@/hooks/useActivityData";
import { useStreaks } from "@/hooks/useActivityData";
import { useProfile } from "@/hooks/useProfile";
import { useScorecardVisibility } from "@/hooks/useScorecardVisibility";
import { Button } from "@/components/ui/button";
import { ExerciseDetail } from "./ExerciseDetail";
import { AddExerciseModal } from "./AddExerciseModal";
import {
  NON_KG_THRESHOLDS,
  getNonKgLevel,
  ASSISTED_EXERCISES,
  getAssistedLevel,
} from "./exerciseLevels";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  differenceInDays,
  format,
  isAfter,
  isSameDay,
} from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageViewToggle } from "@/components/ViewModeToggle";
import { usePersonalWorkoutPlan } from "@/hooks/usePersonalWorkoutPlan";

// ── Palette (ported from the "Harley" scorecard design) ──
const C = {
  ink: "#2B1736",
  grad: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)",
  sub: "#77677E",
  body: "#5E4E66",
  pink: "#C21C70",
  magenta: "#E8308C",
  tile: "#F6F1F7",
  lilac: "#F1E9FE",
  seg: "#EFE6F1",
  yellow: "#FFE14D",
  purple: "#6B2FB3",
};
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const card: React.CSSProperties = { background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22 };
const LEVEL_COLORS = ["#6B2FB3", "#A3165E", "#C21C70", "#5B21B6", "#2B1736"];
const HEAT_COLORS = ["#F3EDF4", "#F9C3DC", "#EE6FAA", "#C21C70"];

const FailBadge = ({ count }: { count: number }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 999, background: "#FCE4F0", color: "#A3165E", fontSize: 11, fontWeight: 800, cursor: "help", whiteSpace: "nowrap" }}>
        {count}F
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[220px] text-center">
      {count} failed attempt{count > 1 ? "s" : ""}, week{count > 1 ? "s" : ""} you logged
      an “F” because you couldn’t finish the set at that weight.
    </TooltipContent>
  </Tooltip>
);

// Unit mapping: exercises not measured in kg.
const EXERCISE_UNITS: Record<string, string> = {
  "Plank": "sec", "Side Plank": "sec", "Battle Ropes": "sec", "Farmer Carry": "sec",
  "Push Ups": "reps", "Dead Bug": "reps", "Bird Dog": "reps", "Hanging Knee Raises": "reps", "Box Jumps": "reps",
  "Bike Sprint (20s all-in + 3min rest)": "rounds", "Sprint / Jump Rope": "rounds",
  "Recovery Day": "—", "Rest Day": "—", "Pull Ups": "kg assist", "Glute Bridges": "reps",
};
const getUnit = (name: string) => EXERCISE_UNITS[name] || "kg";

const EXERCISE_CATEGORIES: Record<string, string> = {
  "Goblet Squat": "Legs", "Barbell Squat": "Legs", "Smith Machine Lunges": "Legs", "Step Ups": "Legs",
  "Box Jumps": "Legs", "Leg Extension": "Legs", "Reverse Lunges": "Legs",
  "Hip Thrust": "Glutes", "Cable Kickbacks": "Glutes", "Romanian Deadlift": "Glutes", "Glute Bridges": "Glutes",
  "Lat Pulldown": "Upper body", "Dumbbell Shoulder Press": "Upper body", "Seated Row": "Upper body",
  "Cable Row": "Upper body", "Push Ups": "Upper body", "Pull Ups": "Upper body", "Back Extension": "Upper body",
  "Plank": "Core", "Dead Bug": "Core", "Russian Twists": "Core", "Side Plank": "Core", "Bird Dog": "Core",
  "Hanging Knee Raises": "Core",
  "Kettlebell Swings": "Cardio and power", "Battle Ropes": "Cardio and power", "Sprint / Jump Rope": "Cardio and power",
  "Bike Sprint (20s all-in + 3min rest)": "Cardio and power", "Farmer Carry": "Cardio and power",
};
// Category → filter group.
const GROUP_OF: Record<string, string> = {
  "Legs": "Lower body", "Glutes": "Lower body", "Upper body": "Upper body",
  "Core": "Core", "Cardio and power": "Cardio and power", "Other": "Other",
};
const FILTERS = ["All", "Lower body", "Upper body", "Core", "Cardio and power"];
const SORTS = ["Level", "Sessions", "A–Z"] as const;
const RANGES = ["Year", "90 days", "30 days", "7 days"] as const;

const segsFor = (n: number) =>
  [0, 1, 2, 3, 4].map((i) => ({ bg: i < n ? C.magenta : C.seg }));

const formatHour = (h: number) => {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
};

// Pink pill section label.
const Label = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: 1, color: C.sub }}>{children}</p>
);

export function ExerciseScorecard() {
  const { data: grouped, isLoading } = useExerciseScorecard();
  const { data: activityEntries } = useActivityData();
  const { data: profile } = useProfile();
  const { hiddenExercises, hideExercise, unhideExercise } = useScorecardVisibility();
  const streaks = useStreaks();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { plan } = usePersonalWorkoutPlan();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Level");
  const [range, setRange] = useState<(typeof RANGES)[number]>("Year");
  const [showAll, setShowAll] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  void undoTimerRef;

  const bw = profile?.body_weight ? Number(profile.body_weight) : null;

  const handleRemoveExercise = useCallback((exerciseName: string) => {
    hideExercise.mutate(exerciseName);
    const { dismiss } = toast({
      description: "Exercise removed from Scorecard",
      action: (
        <Button variant="outline" size="sm" className="h-7 text-xs font-bold" onClick={() => { unhideExercise.mutate(exerciseName); dismiss(); }}>
          Undo
        </Button>
      ),
      duration: 4000,
    });
  }, [hideExercise, unhideExercise, toast]);

  // ── Exercise cards (same derivation as before) ──
  const exercises = useMemo(() => {
    if (!grouped) return [];
    return Array.from(grouped.entries())
      .filter(([name]) => !hiddenExercises.includes(name))
      .map(([name, entries]) => {
        const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestNonFailed = sorted.find((e) => !e.failed);
        const currentWeight = latestNonFailed?.weight ?? 0;
        const isAssisted = ASSISTED_EXERCISES.has(name);
        const nonFailed = entries.filter((e) => !e.failed);
        const bestWeight = nonFailed.length === 0 ? 0 : isAssisted ? Math.min(...nonFailed.map((e) => e.weight)) : Math.max(...nonFailed.map((e) => e.weight));
        const failCount = entries.filter((e) => e.failed).length;
        const unit = getUnit(name);
        const useRatio = unit === "kg" && !!bw;
        const ratio = useRatio ? currentWeight / bw! : 0;
        const hasThresholds = !useRatio && !isAssisted && NON_KG_THRESHOLDS[name] != null;
        const level = isAssisted ? getAssistedLevel(name, currentWeight) : useRatio ? getLevel(ratio) : hasThresholds ? getNonKgLevel(name, currentWeight) : { label: "—" as const, icon: "📈", index: -1 };
        const category = EXERCISE_CATEGORIES[name] || "Other";
        const group = GROUP_OF[category] || "Other";
        const sessions = sorted.length;
        const isPR = sessions > 1 && currentWeight === bestWeight;
        const bwLabel = useRatio && ratio > 0 ? `${ratio.toFixed(2)}× BW` : isAssisted ? "assisted" : "";
        return { name, entries: sorted, currentWeight, bestWeight, ratio, level, category, group, unit, useRatio, hasThresholds, isAssisted, failCount, sessions, isPR, bwLabel };
      });
  }, [grouped, hiddenExercises, bw]);

  // ── Overall strength (avg ratio of kg lifts) ──
  const strength = useMemo(() => {
    const weightBased = exercises.filter((e) => e.useRatio && e.ratio > 0);
    if (weightBased.length === 0) return null;
    const avgRatio = weightBased.reduce((s, e) => s + e.ratio, 0) / weightBased.length;
    const overall = getLevel(avgRatio);
    const top3 = [...weightBased].sort((a, b) => b.ratio - a.ratio).slice(0, 3);
    return { avgRatio, overall, top3 };
  }, [exercises]);

  // ── Activity stats (range-filtered) + heatmap (full year) ──
  const activity = useMemo(() => {
    const entries = activityEntries ?? [];
    const now = new Date();
    const rangeDays = range === "7 days" ? 7 : range === "30 days" ? 30 : range === "90 days" ? 90 : null;
    const cutoff = rangeDays ? subDays(now, rangeDays) : null;
    const filtered = cutoff ? entries.filter((e) => new Date(e.date + "T00:00:00") >= cutoff) : entries;
    const daySet = new Set(filtered.map((e) => e.date));
    const workouts = daySet.size;
    const exercisesLogged = filtered.length;
    const hourBuckets = new Map<number, number>();
    for (const e of filtered) hourBuckets.set(e.hour, (hourBuckets.get(e.hour) ?? 0) + 1);
    let peakHour: number | null = null, peakCount = 0;
    for (const [h, c] of hourBuckets) if (c > peakCount) { peakHour = h; peakCount = c; }
    let windowDays = rangeDays ?? 365;
    if (!rangeDays && entries.length) windowDays = Math.max(1, differenceInDays(now, new Date(entries[0].date + "T00:00:00")) + 1);
    const daysActivePct = windowDays ? Math.round((workouts / windowDays) * 100) : 0;

    // Heatmap over the current calendar year.
    const dayCounts = new Map<string, number>();
    for (const e of entries) dayCounts.set(e.date, (dayCounts.get(e.date) ?? 0) + 1);
    const year = now.getFullYear();
    const gridStart = startOfWeek(new Date(year, 0, 1), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(new Date(year, 11, 31), { weekStartsOn: 1 });
    const cols: { days: { bg: string; ring: string; title: string }[] }[] = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      const days: { bg: string; ring: string; title: string }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = addDays(cursor, d);
        const key = format(day, "yyyy-MM-dd");
        const inYear = day.getFullYear() === year;
        const future = isAfter(day, now) && !isSameDay(day, now);
        const count = dayCounts.get(key) ?? 0;
        let bg = "transparent", ring = "none";
        if (!inYear) { bg = "transparent"; ring = "none"; }
        else if (isSameDay(day, now)) { bg = C.pink; ring = `2px solid ${C.ink}`; }
        else if (future) { bg = "#FFFFFF"; ring = "1px solid #EFE6F1"; }
        else { bg = count === 0 ? HEAT_COLORS[0] : count === 1 ? HEAT_COLORS[1] : count <= 3 ? HEAT_COLORS[2] : HEAT_COLORS[3]; }
        days.push({ bg, ring, title: inYear ? `${format(day, "MMM d, yyyy")}, ${count} exercise${count === 1 ? "" : "s"}` : "" });
      }
      cols.push({ days });
      cursor = addDays(cursor, 7);
    }
    return { workouts, exercisesLogged, peakHour, daysActivePct, cols };
  }, [activityEntries, range]);

  // ── This month: workouts done vs. the member's planned training days ──
  // Targets come from the live plan's training weekdays, clipped to days inside
  // the month, so a partial first/last week never asks for impossible sessions.
  // Rest/recovery check-ins are logged as exercises too, so they don't count.
  const month = useMemo(() => {
    const now = new Date();
    const trainingIdx = (plan ?? [])
      .map((d, i) => (!d.isRest && !d.isRecovery && d.exercises.length > 0 ? i : -1))
      .filter((i) => i >= 0);
    const workoutDays = new Set(
      (activityEntries ?? [])
        .filter((e) => !/^(rest|recovery) day$/i.test(e.exerciseName.trim()))
        .map((e) => e.date),
    );
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);
    const weeks: { label: string; planned: number; done: number; status: string }[] = [];
    let monthDone = 0, monthTarget = 0, leftThisWeek = 0;
    for (let wk = startOfWeek(mStart, { weekStartsOn: 1 }); wk <= mEnd; wk = addDays(wk, 7)) {
      let planned = 0, done = 0, fullPlanned = 0, fullDone = 0;
      for (let i = 0; i < 7; i++) {
        const day = addDays(wk, i);
        const inMonth = day >= mStart && day <= mEnd;
        const isTraining = trainingIdx.includes(i); // day_index 0 = Monday
        const did = workoutDays.has(format(day, "yyyy-MM-dd"));
        if (isTraining) fullPlanned++;
        if (did) fullDone++;
        if (inMonth && isTraining) planned++;
        if (inMonth && did) done++;
      }
      const isThisWeek = wk <= now && now < addDays(wk, 7);
      if (isThisWeek) leftThisWeek = Math.max(0, fullPlanned - fullDone);
      monthDone += done;
      monthTarget += planned;
      if (planned === 0 && done === 0) continue; // a sliver of a week with no training days
      const status = wk > now ? "Coming up" : isThisWeek ? `${done} of ${planned}, this week` : `${done} of ${planned}`;
      weeks.push({ label: `Week ${weeks.length + 1}`, planned, done, status });
    }
    return { name: format(now, "MMMM").toUpperCase(), weeks, monthDone, monthTarget, leftThisWeek, hasPlan: trainingIdx.length > 0 };
  }, [plan, activityEntries]);

  if (isLoading) {
    return (
      <div style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 120, background: C.tile, borderRadius: 22 }} className="animate-pulse" />
        ))}
      </div>
    );
  }

  // Detail drill-down keeps the existing component.
  if (selectedExercise) {
    const ex = exercises.find((e) => e.name === selectedExercise);
    if (ex) {
      return (
        <ExerciseDetail
          exercise={ex}
          bodyWeight={bw}
          onBack={() => setSelectedExercise(null)}
          onRemove={(name) => { handleRemoveExercise(name); setSelectedExercise(null); }}
        />
      );
    }
  }

  const hasData = grouped && grouped.size > 0;
  const filtered = exercises.filter((e) => filter === "All" || e.group === filter);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "Sessions") return b.sessions - a.sessions;
    if (sort === "A–Z") return a.name.localeCompare(b.name);
    return b.level.index - a.level.index || b.sessions - a.sessions;
  });
  const rows = showAll ? sorted : sorted.slice(0, 8);
  const hasHidden = hiddenExercises.length > 0;

  return (
    <div style={{ color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5, display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>
        <h1 style={{ margin: 0, ...bangers, fontSize: isMobile ? 40 : 52, letterSpacing: 1, lineHeight: 1 }}>Scorecard</h1>
        <PageViewToggle />
      </div>

      {/* Row 1: This month + Streak */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 16 : 24 }}>
        <section style={{ flex: "2 1 520px", minWidth: 0, background: C.grad, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22, boxShadow: isMobile ? `4px 4px 0 ${C.ink}` : `6px 6px 0 ${C.ink}`, padding: isMobile ? 18 : 28 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, fontWeight: 800, letterSpacing: 1, color: "rgba(255,255,255,0.88)" }}>THIS MONTH · {month.name}</p>
              <h2 style={{ margin: "6px 0 0", ...bangers, fontSize: isMobile ? 34 : 40, letterSpacing: 1, lineHeight: 1 }}>
                {month.hasPlan ? `${month.monthDone} of ${month.monthTarget} workouts` : `${month.monthDone} ${month.monthDone === 1 ? "workout" : "workouts"}`}
              </h2>
              <p style={{ margin: "8px 0 0", fontSize: isMobile ? 14 : 16, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
                {!month.hasPlan
                  ? "Set up your plan to track each week."
                  : month.leftThisWeek > 0
                    ? `${month.leftThisWeek} more this week to stay on plan.`
                    : "You're on plan this week. Nice work."}
              </p>
            </div>
            {/* The page's single yellow call to action (per the brief). */}
            <Link to={month.hasPlan ? "/week" : "/plan-setup"} style={{ display: isMobile ? "block" : "inline-block", width: isMobile ? "100%" : undefined, textAlign: "center", boxSizing: "border-box", background: C.yellow, color: C.ink, fontWeight: 800, textDecoration: "none", padding: isMobile ? 13 : "14px 22px", borderRadius: 14, border: `2px solid ${C.ink}`, boxShadow: `${isMobile ? 3 : 4}px ${isMobile ? 3 : 4}px 0 ${C.ink}`, whiteSpace: "nowrap" }}>
              {month.hasPlan ? "Start today's workout" : "Set up your plan"}
            </Link>
          </div>
          {!isMobile && month.hasPlan && month.weeks.length > 0 && (
            <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: `repeat(${month.weeks.length}, minmax(0, 1fr))`, gap: 12 }}>
              {month.weeks.map((wk) => (
                <div key={wk.label} style={{ background: "rgba(255,255,255,0.14)", borderRadius: 14, padding: "12px 14px" }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>{wk.label}</p>
                  <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                    {Array.from({ length: Math.max(wk.planned, wk.done) }).map((_, k) => (
                      <span key={k} style={{ flex: 1, height: 10, borderRadius: 999, background: k < wk.done ? "#FFFFFF" : "rgba(255,255,255,0.28)" }} />
                    ))}
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{wk.status}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ flex: "1 1 260px", minWidth: 0, ...card, padding: isMobile ? 18 : 24, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 16 }}>
          <div>
            <Label>CURRENT STREAK</Label>
            <p style={{ margin: "4px 0 0", ...bangers, fontSize: isMobile ? 48 : 64, lineHeight: 1, color: C.pink }}>{streaks.current} {streaks.current === 1 ? "day" : "days"}</p>
            <p style={{ margin: "8px 0 0", fontWeight: 700, color: C.body }}>
              {streaks.current > 0 ? "Keep it going, train again today." : "Train today to start a new streak."}
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: C.lilac, fontWeight: 800 }}>
            <span>Best streak</span>
            <span style={{ color: C.purple }}>{streaks.longest} {streaks.longest === 1 ? "day" : "days"}</span>
          </div>
        </section>
      </div>

      {/* Row 2: Activity */}
      {hasData && (
        <section style={{ ...card, padding: isMobile ? 18 : 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 26 : 32, letterSpacing: 1 }}>Activity this year</h2>
            <div style={{ display: "flex", border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden" }}>
              {RANGES.map((r) => (
                <button key={r} type="button" onClick={() => setRange(r)} style={{ minHeight: 40, padding: "0 14px", border: 0, background: r === range ? C.ink : "#FFFFFF", color: r === range ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{r}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[
              { label: "Workouts", value: String(activity.workouts) },
              { label: "Days active", value: `${activity.daysActivePct}%`, suffix: " of days" },
              { label: "Exercises logged", value: String(activity.exercisesLogged) },
              { label: "You train most at", value: activity.peakHour != null ? formatHour(activity.peakHour) : "—" },
            ].map((s) => (
              <div key={s.label} style={{ padding: "14px 16px", borderRadius: 14, background: C.tile }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.sub }}>{s.label}</p>
                <p style={{ margin: "2px 0 0", ...bangers, fontSize: 34, lineHeight: 1.1 }}>
                  {s.value}
                  {s.suffix && <span style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, fontWeight: 700, color: C.sub }}>{s.suffix}</span>}
                </p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 3, minWidth: 760 }}>
              {activity.cols.map((col, ci) => (
                <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
                  {col.days.map((cell, di) => (
                    <span key={di} title={cell.title} style={{ display: "block", aspectRatio: "1", borderRadius: 3, background: cell.bg, outline: cell.ring, outlineOffset: 1 }} />
                  ))}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", minWidth: 760, fontSize: 12, fontWeight: 700, color: C.sub }}>
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => <span key={m}>{m}</span>)}
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: C.sub }}>
            Less
            {HEAT_COLORS.map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />)}
            More
          </div>
        </section>
      )}

      {/* Row 3: Strength + Exercise progress */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 16 : 24, alignItems: "flex-start" }}>
        <section style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>
          {strength && (
            <div style={{ ...card, padding: isMobile ? 18 : 24 }}>
              <Label>OVERALL STRENGTH</Label>
              <p style={{ margin: "4px 0 0", ...bangers, fontSize: isMobile ? 30 : 36, letterSpacing: 1, lineHeight: 1.1 }}>{strength.overall.label}</p>
              <p style={{ margin: "6px 0 0", color: C.body }}>On average you lift <strong style={{ color: C.ink }}>{strength.avgRatio.toFixed(2)}×</strong> your bodyweight.</p>
              <p style={{ margin: "20px 0 8px", fontSize: 13, fontWeight: 800, letterSpacing: 1, color: C.sub }}>STRONGEST LIFTS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {strength.top3.map((ex) => (
                  <div key={ex.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 12, background: C.tile, fontWeight: 700 }}>
                    <span>{ex.name}</span>
                    <span>{ex.currentWeight} {ex.unit} <span style={{ color: C.pink }}>{ex.ratio.toFixed(2)}×</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ ...card, padding: isMobile ? 18 : 24 }}>
            <Label>STRENGTH LEVELS</Label>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {["Very strong", "Advanced", "Strong", "Leveling up", "Beginner"].map((name, i) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", gap: 3, width: 80 }}>
                    {segsFor(5 - i).map((sg, j) => <span key={j} style={{ flex: 1, height: 8, borderRadius: 999, background: sg.bg }} />)}
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{name}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: "14px 0 0", fontSize: 14, color: C.body }}>Levels compare your best weight to your bodyweight for each exercise.</p>
          </div>
        </section>

        <section style={{ flex: "2 1 520px", minWidth: 0, ...card, padding: isMobile ? 18 : 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 26 : 32, letterSpacing: 1 }}>Exercise progress</h2>
            <button type="button" onClick={() => setAddModalOpen(true)} disabled={!hasHidden} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", border: `2px solid ${C.ink}`, borderRadius: 12, background: hasHidden ? C.pink : "#EDE7EF", color: hasHidden ? "#FFFFFF" : C.sub, fontWeight: 800, fontSize: 15, cursor: hasHidden ? "pointer" : "not-allowed" }}>
              <Plus className="w-4 h-4" /> Add exercise
            </button>
          </div>

          <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {FILTERS.map((f) => (
                <button key={f} type="button" onClick={() => { setFilter(f); setShowAll(false); }} style={{ minHeight: 40, padding: "0 14px", borderRadius: 999, border: `2px solid ${C.ink}`, background: f === filter ? C.ink : "#FFFFFF", color: f === filter ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", cursor: "pointer" }}>{f}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.sub }}>Sort</span>
              {SORTS.map((s) => (
                <button key={s} type="button" onClick={() => setSort(s)} style={{ minHeight: 40, padding: "0 12px", borderRadius: 10, border: 0, background: s === sort ? C.lilac : "transparent", color: s === sort ? "#5B21B6" : C.body, fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>

          {rows.length === 0 ? (
            <p style={{ margin: "24px 0 0", textAlign: "center", color: C.sub, fontWeight: 600 }}>No exercises in this category yet.</p>
          ) : (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column" }}>
              {rows.map((ex) => (
                <button key={ex.name} type="button" onClick={() => setSelectedExercise(ex.name)} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 20px", padding: "14px 4px", borderTop: "1px solid #EFE6F1", border: 0, borderTopWidth: 1, background: "transparent", color: C.ink, textAlign: "left", cursor: "pointer", width: "100%" }}>
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>
                      {ex.name}
                      {ex.isPR && <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 999, background: C.yellow, border: `1.5px solid ${C.ink}`, fontSize: 11, fontWeight: 800, verticalAlign: 2 }}>PR</span>}
                      {ex.failCount > 0 && <FailBadge count={ex.failCount} />}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 600, color: C.sub }}>{ex.group} · {ex.sessions} session{ex.sessions === 1 ? "" : "s"}</p>
                  </div>
                  <div style={{ flex: "0 1 190px", minWidth: 150 }}>
                    <div style={{ display: "flex", gap: 3 }}>
                      {segsFor(ex.level.index + 1).map((sg, j) => <span key={j} style={{ flex: 1, height: 8, borderRadius: 999, background: ex.level.index < 0 ? C.seg : sg.bg }} />)}
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 800, color: ex.level.index < 0 ? C.sub : LEVEL_COLORS[ex.level.index] }}>{ex.level.label}</p>
                  </div>
                  <div style={{ flex: "0 0 110px", textAlign: "right" }}>
                    <p style={{ margin: 0, ...bangers, fontSize: 26, lineHeight: 1 }}>{ex.currentWeight}<span style={{ fontFamily: "Nunito, sans-serif", fontSize: 14, fontWeight: 700, color: C.sub }}> {ex.unit}</span></p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 700, color: C.sub }}>{ex.bwLabel}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d="M9 6l6 6-6 6" /></svg>
                </button>
              ))}
            </div>
          )}

          {sorted.length > 8 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} style={{ marginTop: 8, width: "100%", minHeight: 48, border: "2px dashed #B79BF2", borderRadius: 14, background: "#FBF9FB", color: C.purple, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              {showAll ? "Show fewer" : `Show all ${sorted.length} exercises`}
            </button>
          )}
        </section>
      </div>

      <AddExerciseModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        allExercises={grouped ? Array.from(grouped.keys()) : []}
        hiddenExercises={hiddenExercises}
        onAdd={(name) => unhideExercise.mutate(name)}
      />
    </div>
  );
}
