import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useExerciseLibrary, useRecommendedPlan, useSaveMemberPlan } from "@/hooks/usePlan";
import { useAuth } from "@/contexts/AuthContext";
import { readOnboarding } from "@/lib/onboarding";
import {
  type PlanDayDraft,
  type PlanItemDraft,
  type PlanSource,
  type BaseMode,
  type Tracking,
  WEEKDAYS,
  WEEKDAY_FULL,
  DEFAULT_TRAINING_DAYS,
  weekdayIndex,
  firstNumber,
  typedNumber,
  POWER_COLORS,
} from "@/lib/plan";

const C = {
  bg: "#FBF9FB", ink: "#2B1736", sub: "#77677E", body: "#5E4E66",
  pink: "#C21C70", magenta: "#E8308C", purple: "#6B2FB3", purpleText: "#5B21B6",
  lilac: "#F1E9FE", tile: "#F6F1F7", border: "#E4DAE7",
  grad: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)",
};
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const PlayIcon = ({ color = C.pink }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
);
const youTube = (url?: string | null) => url || "";

const STEP_LABELS = ["Days", "Plan", "Check", "Start"];
const TITLES: Record<number, [string, string]> = {
  1: ["When do you train?", "Power Club works best with 3 sessions a week. Busy? Pick 2. Want more power? Pick 4."],
  2: ["Choose your plan", "Start with ours, bring your own, or build one from scratch."],
  4: ["Find your starting weights", "Heavy enough to be a challenge, light enough to keep good form."],
  5: ["All set!", "Your new plan starts this week."],
};

const SOURCES: { id: PlanSource; name: string; desc: string; tag: string; iconBg: string; tagFg: string; icon: JSX.Element }[] = [
  { id: "recommended", name: "Recommended plan", desc: "Our plan: lower body, upper body + core, full body. Swap anything you don't enjoy.", tag: "Best for most people", iconBg: C.magenta, tagFg: "#A3165E",
    icon: <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" /> },
  { id: "ai_import", name: "Upload a screenshot", desc: "Got a plan from a trainer or another app? AI reads it and turns it into your Power Club plan.", tag: "Uses AI", iconBg: C.purple, tagFg: C.purpleText,
    icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></> },
  { id: "custom", name: "Build my own", desc: "Pick your own 5 exercises for each day from the exercise library.", tag: "Full control", iconBg: C.ink, tagFg: C.body,
    icon: <path d="M4 20h4L19 9l-4-4L4 16z" /> },
];

const BASE_OPTS: { id: BaseMode; name: string; desc: string }[] = [
  { id: "auto", name: "Find my base in week 1", desc: "Your first session of each day is a light test. The app suggests your starting weights from how it went." },
  { id: "manual", name: "I know my weights", desc: "Type in the weight you use now for each exercise and start from there." },
];

const DAY_TINTS = ["#FFF0F7", "#F4EDFE", "#F3EEF4", "#FFF7D6"];

// ── AI draft row (from analyze-workout-image) ──
interface AiLine { name: string; sets: string; reps: string; weight: string; unit: string; day: number; unclear: boolean; }

export default function PlanSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { data: library = [] } = useExerciseLibrary();
  const saveMemberPlan = useSaveMemberPlan();

  // A new member arrives with their sign-up answers (days, plan source): start
  // from those instead of the defaults.
  const { user } = useAuth();
  const answers = readOnboarding(user);
  const [step, setStep] = useState(1);
  const [count, setCount] = useState<number>(answers?.days_per_week ?? 3);
  const [days, setDays] = useState<Record<string, boolean>>(() =>
    (answers?.training_days ?? DEFAULT_TRAINING_DAYS[3]).reduce((o, d) => ({ ...o, [d]: true }), {}),
  );
  const [source, setSource] = useState<PlanSource>(answers?.plan_source ?? "recommended");
  const [baseMode, setBaseMode] = useState<BaseMode>("auto");
  const [planDays, setPlanDays] = useState<PlanDayDraft[]>([]);

  const picked = WEEKDAYS.filter((d) => days[d]);
  const trainingDays = picked.length === count ? picked : DEFAULT_TRAINING_DAYS[count];
  const { data: recommended = [] } = useRecommendedPlan(count);

  // ── Step 1 validation ──
  const backToBack = picked.some((d, i) => i > 0 && weekdayIndex(d) - weekdayIndex(picked[i - 1]) === 1);
  const daysOk = picked.length === count;
  const dayNote = !daysOk
    ? `Pick exactly ${count} days. You have ${picked.length} selected.`
    : backToBack
      ? "Two days in a row is fine, but a rest day between helps you recover."
      : `Nice spread: ${picked.join(", ")}, with rest days in between.`;

  const setCountAndDays = (n: number) => {
    setCount(n);
    setDays(DEFAULT_TRAINING_DAYS[n].reduce((o, d) => ({ ...o, [d]: true }), {}));
  };

  // When entering step 3, seed the working draft from the chosen source.
  const enterStep3 = () => {
    if (source === "recommended") {
      setPlanDays(recommended.map((d) => ({ name: d.name, items: d.items.map((it) => ({ ...it })) })));
    } else if (source === "custom") {
      setPlanDays(trainingDays.map((_, i) => ({ name: `Day ${i + 1}`, items: [] })));
    }
    // ai_import seeds planDays when the review is confirmed.
    setStep(3);
  };

  const goNext = () => {
    if (step === 1) { if (!daysOk) return; setStep(2); return; }
    if (step === 2) { enterStep3(); return; }
    if (step === 3) {
      if (source === "ai_import" && planDays.length === 0) { toast({ title: "Upload a plan first, then check the exercises." }); return; }
      setStep(4); return;
    }
    if (step === 4) { void finish(); return; }
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const finish = async () => {
    try {
      await saveMemberPlan.mutateAsync({ source, daysPerWeek: count, trainingDays, baseMode, days: planDays });
      setStep(5);
    } catch (e) {
      toast({ title: "Could not save your plan", description: (e as Error)?.message, variant: "destructive" });
    }
  };

  const nextLabel = step === 4 ? (saveMemberPlan.isPending ? "Saving..." : "Start my plan") : "Continue";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5 }}>
      {/* Safe-area top padding: in the home-screen app the iOS status bar sits on
          top of the page, same fix as the main app header. */}
      <header style={{ background: C.ink, color: "#FFFFFF", paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: isMobile ? "14px 16px" : "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <span style={{ ...bangers, fontSize: 28, letterSpacing: 1, color: "#FF8AC4" }}>Power Club</span>
          <button type="button" onClick={() => navigate("/profile")} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#FFFFFF", fontWeight: 800, fontSize: 15, background: "transparent", border: 0, cursor: "pointer", padding: "10px 0" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>Close
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: isMobile ? "24px 16px 48px" : "36px 24px 64px" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: 1, color: C.sub }}>SET UP YOUR PLAN</p>
        <h1 style={{ margin: "4px 0 0", ...bangers, fontSize: isMobile ? 40 : 52, letterSpacing: 1, lineHeight: 1 }}>{(TITLES[step] ?? titleFor(source))[0]}</h1>
        <p style={{ margin: "8px 0 0", fontSize: isMobile ? 16 : 18, color: C.body, maxWidth: 640 }}>{(TITLES[step] ?? titleFor(source))[1]}</p>

        {/* Stepper */}
        <ol style={{ margin: "28px 0 0", padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
          {STEP_LABELS.map((label, i) => (
            <li key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ height: 6, borderRadius: 999, background: i + 1 <= Math.min(step, 4) ? C.magenta : C.border }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: i + 1 === step ? C.ink : C.sub }}>{label}</span>
            </li>
          ))}
        </ol>

        <section style={{ marginTop: 28, background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22, boxShadow: `6px 6px 0 ${C.border}`, padding: isMobile ? 20 : 28 }}>
          {step === 1 && <StepDays count={count} setCount={setCountAndDays} days={days} setDays={setDays} dayNote={dayNote} good={daysOk && !backToBack} />}
          {step === 2 && <StepSource source={source} setSource={setSource} />}
          {step === 3 && source === "recommended" && <StepRecommended planDays={planDays} setPlanDays={setPlanDays} trainingDays={trainingDays} library={library} />}
          {step === 3 && source === "ai_import" && <StepAi trainingDays={trainingDays} library={library} onDraft={setPlanDays} />}
          {step === 3 && source === "custom" && <StepCustom planDays={planDays} setPlanDays={setPlanDays} trainingDays={trainingDays} library={library} />}
          {step === 4 && <StepBase baseMode={baseMode} setBaseMode={setBaseMode} planDays={planDays} setPlanDays={setPlanDays} />}
          {step === 5 && <StepDone trainingDays={trainingDays} baseMode={baseMode} onSeeWeek={() => navigate("/week")} />}
        </section>

        {step < 5 && (
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <button type="button" onClick={goBack} style={{ minHeight: 52, padding: "0 22px", border: `2px solid ${C.ink}`, borderRadius: 14, background: "#FFFFFF", color: C.ink, fontWeight: 800, fontSize: 16, cursor: "pointer", visibility: step > 1 ? "visible" : "hidden" }}>Back</button>
            <button type="button" onClick={goNext} disabled={saveMemberPlan.isPending} style={{ minHeight: 52, padding: "0 28px", border: `2px solid ${C.ink}`, borderRadius: 14, background: C.pink, color: "#FFFFFF", boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>{nextLabel}</button>
          </div>
        )}
      </main>
    </div>
  );
}

const titleFor = (source: PlanSource): [string, string] =>
  source === "recommended" ? ["Your recommended plan", "Here is your week. Swap any exercise you don't enjoy."]
    : source === "ai_import" ? ["Check what AI found", "Look over the exercises from your screenshot before we save them."]
      : ["Build your plan", "Choose the exercises for each of your training days."];

// ── Step 1: days ──
function StepDays({ count, setCount, days, setDays, dayNote, good }: {
  count: number; setCount: (n: number) => void; days: Record<string, boolean>; setDays: (d: Record<string, boolean>) => void; dayNote: string; good: boolean;
}) {
  // Seven columns on a ~340px phone leave ~40px per day: shrink the type and gaps.
  const isMobile = useIsMobile();
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>How many days a week?</p>
        <div style={{ display: "flex", border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden" }}>
          {[2, 3, 4].map((n) => (
            <button key={n} type="button" aria-pressed={n === count} onClick={() => setCount(n)} style={{ minWidth: 56, minHeight: 44, border: 0, background: n === count ? C.ink : "#FFFFFF", color: n === count ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>{n}</button>
          ))}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.body }}>3 is the Power Club standard</span>
      </div>
      <p style={{ margin: "18px 0 0", fontWeight: 800, fontSize: 18 }}>Pick {count} days</p>
      <p style={{ margin: "2px 0 0", color: C.body }}>Leave a rest day between sessions so your muscles recover.</p>
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: isMobile ? 4 : 10 }}>
        {WEEKDAYS.map((d) => {
          const on = !!days[d];
          return (
            <button key={d} type="button" aria-pressed={on} aria-label={`${WEEKDAY_FULL[d]}: ${on ? "training" : "rest"}`} onClick={() => setDays({ ...days, [d]: !on })} style={{ minHeight: isMobile ? 64 : 88, padding: 0, border: `2px solid ${C.ink}`, borderRadius: isMobile ? 12 : 16, background: on ? C.magenta : "#FFFFFF", color: on ? "#FFFFFF" : C.body, boxShadow: on ? `${isMobile ? 2 : 3}px ${isMobile ? 2 : 3}px 0 ${C.ink}` : "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <span style={{ ...bangers, fontSize: isMobile ? 17 : 24, letterSpacing: isMobile ? 0.5 : 1, lineHeight: 1 }}>{d}</span>
              <span style={{ fontSize: isMobile ? 10 : 12, fontWeight: 800 }}>{on ? "Train" : "Rest"}</span>
            </button>
          );
        })}
      </div>
      <p style={{ margin: "16px 0 0", padding: "12px 14px", borderRadius: 12, background: good ? C.lilac : "#FFF5FA", color: good ? C.purpleText : "#A3165E", fontWeight: 700, fontSize: 15 }}>{dayNote}</p>
    </>
  );
}

// ── Step 2: source ──
function StepSource({ source, setSource }: { source: PlanSource; setSource: (s: PlanSource) => void }) {
  return (
    <>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>Where should your plan come from?</p>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {SOURCES.map((o) => {
          const on = o.id === source;
          return (
            <button key={o.id} type="button" aria-pressed={on} onClick={() => setSource(o.id)} style={{ textAlign: "left", padding: 20, border: `2px solid ${C.ink}`, borderRadius: 18, background: on ? "#FFF5FA" : "#FFFFFF", boxShadow: on ? `4px 4px 0 ${C.magenta}` : "none", color: C.ink, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ width: 48, height: 48, borderRadius: 14, background: o.iconBg, border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{o.icon}</svg>
              </span>
              <span style={{ fontWeight: 800, fontSize: 18 }}>{o.name}</span>
              <span style={{ fontSize: 14, color: C.body }}>{o.desc}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: o.tagFg }}>{o.tag}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── Day card (shared by recommended + custom preview) ──
function DayCard({ day, tint, dayLabel, onSwap, onRemove }: {
  day: PlanDayDraft; tint: string; dayLabel: string; onSwap?: (i: number) => void; onRemove?: (i: number) => void;
}) {
  return (
    <div style={{ border: `2px solid ${C.border}`, borderRadius: 16, overflow: "hidden", background: "#FFFFFF" }}>
      <div style={{ padding: "12px 14px", background: tint, borderBottom: `2px solid ${C.border}` }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.body }}>{dayLabel}</p>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>{day.name}</p>
      </div>
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {day.items.length === 0 && <p style={{ margin: "6px 2px", fontSize: 13, color: C.sub }}>No exercises yet.</p>}
        {day.items.map((e, i) =>
          e.isPower ? (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 10, background: POWER_COLORS.bg, border: `2px solid ${POWER_COLORS.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: POWER_COLORS.label }}>POWER START</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{e.name} <span style={{ fontWeight: 700, color: C.body }}>· {e.sets} × {e.repsOrTime}</span></p>
              </div>
              {e.videoUrl && <a href={youTube(e.videoUrl)} target="_blank" rel="noopener noreferrer" aria-label={`Watch how to do ${e.name}`} style={{ flex: "none", width: 36, height: 36, borderRadius: 999, background: "#FFFFFF", border: `2px solid ${POWER_COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><PlayIcon color={POWER_COLORS.border} /></a>}
            </div>
          ) : (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderBottom: `1px solid ${C.tile}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{e.name}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.sub }}>{e.sets} × {e.repsOrTime}</p>
              </div>
              {onSwap && <button type="button" onClick={() => onSwap(i)} style={{ flex: "none", minHeight: 32, padding: "0 10px", borderRadius: 999, border: `2px solid ${C.border}`, background: "#FFFFFF", color: C.pink, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Swap</button>}
              {onRemove && <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${e.name}`} style={{ flex: "none", width: 30, height: 30, borderRadius: 999, border: `2px solid ${C.border}`, background: "#FFFFFF", color: "#A3165E", cursor: "pointer" }}>×</button>}
              {e.videoUrl && <a href={youTube(e.videoUrl)} target="_blank" rel="noopener noreferrer" aria-label={`Watch how to do ${e.name}`} style={{ flex: "none", width: 36, height: 36, borderRadius: 999, background: "#FCE4F0", display: "flex", alignItems: "center", justifyContent: "center" }}><PlayIcon /></a>}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ── Step 3A: recommended (with swap) ──
function StepRecommended({ planDays, setPlanDays, trainingDays, library }: {
  planDays: PlanDayDraft[]; setPlanDays: (d: PlanDayDraft[]) => void; trainingDays: string[]; library: ReturnType<typeof useExerciseLibrary>["data"];
}) {
  const swap = (dayIdx: number, itemIdx: number) => {
    const item = planDays[dayIdx].items[itemIdx];
    const lib = (library ?? []).filter((x) => x.type === (item.tracking === "assisted" ? "strength" : undefined) || true);
    // Same body area: match on the exercise's library type if we can find it.
    const current = (library ?? []).find((x) => x.name === item.name);
    const pool = (library ?? []).filter((x) => !x.name.startsWith("__") && x.type !== "power" && x.type !== "sprint" && (!current || x.type === current.type) && !planDays[dayIdx].items.some((it) => it.name === x.name));
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? lib[0];
    if (!pick) return;
    const next = planDays.map((d, di) => di !== dayIdx ? d : { ...d, items: d.items.map((it, ii) => ii !== itemIdx ? it : { ...it, name: pick.name, tracking: pick.tracking as Tracking, videoUrl: pick.video_url }) });
    setPlanDays(next);
  };
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>Your recommended week</p>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.body }}>Power start · main lift 4 × 6 · the rest 3 × 10 · free weights first</p>
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {planDays.map((d, i) => (
          <DayCard key={i} day={d} tint={DAY_TINTS[i % DAY_TINTS.length]} dayLabel={(WEEKDAY_FULL[trainingDays[i] as keyof typeof WEEKDAY_FULL] ?? `Day ${i + 1}`).toUpperCase()} onSwap={(ii) => swap(i, ii)} />
        ))}
      </div>
      <p style={{ margin: "14px 0 0", fontSize: 14, color: C.body }}>Tap the play button to watch how each exercise is done. Don't enjoy one? Swap it for one that trains the same muscles.</p>
    </>
  );
}

// ── Step 3C: custom builder ──
function StepCustom({ planDays, setPlanDays, trainingDays, library }: {
  planDays: PlanDayDraft[]; setPlanDays: (d: PlanDayDraft[]) => void; trainingDays: string[]; library: ReturnType<typeof useExerciseLibrary>["data"];
}) {
  const [activeDay, setActiveDay] = useState(0);
  const [query, setQuery] = useState("");
  const results = (library ?? []).filter((x) => x.name.toLowerCase().includes(query.toLowerCase()));
  const add = (name: string) => {
    const lib = (library ?? []).find((x) => x.name === name);
    if (!lib) return;
    setPlanDays(planDays.map((d, i) => {
      if (i !== activeDay) return d;
      if (d.items.length >= 5 || d.items.some((it) => it.name === name)) return d;
      return { ...d, items: [...d.items, { name: lib.name, tracking: lib.tracking as Tracking, sets: 3, repsOrTime: "10", videoUrl: lib.video_url }] };
    }));
  };
  const remove = (dayIdx: number, itemIdx: number) =>
    setPlanDays(planDays.map((d, i) => i !== dayIdx ? d : { ...d, items: d.items.filter((_, ii) => ii !== itemIdx) }));

  return (
    <>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>Build your week</p>
      <p style={{ margin: "2px 0 0", fontSize: 14, color: C.body }}>Pick up to 5 exercises for each day.</p>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        {planDays.map((d, i) => (
          <button key={i} type="button" onClick={() => setActiveDay(i)} style={{ textAlign: "left", border: `2px solid ${i === activeDay ? C.ink : C.border}`, borderRadius: 16, padding: 14, background: "#FFFFFF", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ margin: 0, fontWeight: 800 }}>{(WEEKDAY_FULL[trainingDays[i] as keyof typeof WEEKDAY_FULL] ?? `Day ${i + 1}`)} <span style={{ fontWeight: 700, color: C.sub }}>· {d.items.length} of 5</span></p>
            {d.items.map((e, ii) => (
              <span key={ii} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: C.tile, fontWeight: 700, fontSize: 15 }}>
                {e.name}
                <span role="button" tabIndex={0} onClick={(ev) => { ev.stopPropagation(); remove(i, ii); }} aria-label={`Remove ${e.name}`} style={{ color: "#A3165E", fontWeight: 800, cursor: "pointer" }}>×</span>
              </span>
            ))}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: 14, borderRadius: 14, background: C.bg, border: `2px solid ${C.tile}` }}>
        <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 800 }}>Add to {WEEKDAY_FULL[trainingDays[activeDay] as keyof typeof WEEKDAY_FULL] ?? `Day ${activeDay + 1}`}</p>
        <label style={{ display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 12px", border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${(library ?? []).length} exercises`} style={{ flex: 1, border: 0, height: "100%", fontSize: 15, color: C.ink, background: "transparent", outline: "none" }} />
        </label>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {results.slice(0, 16).map((x) => (
            <button key={x.id} type="button" onClick={() => add(x.name)} style={{ padding: "6px 12px", borderRadius: 999, border: `2px solid ${C.border}`, background: "#FFFFFF", fontSize: 14, fontWeight: 800, color: C.ink, cursor: "pointer" }}>+ {x.name}</button>
          ))}
          {results.length === 0 && <span style={{ fontSize: 14, color: C.sub }}>No matches.</span>}
        </div>
      </div>
    </>
  );
}

// ── Step 3B: AI screenshot (reuses analyze-workout-image) ──
function StepAi({ trainingDays, library, onDraft }: {
  trainingDays: string[]; library: ReturnType<typeof useExerciseLibrary>["data"]; onDraft: (d: PlanDayDraft[]) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<AiLine[]>([]);

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const inferTracking = (name: string, unit: string): Tracking => {
    const lib = (library ?? []).find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (lib) return lib.tracking as Tracking;
    const u = (unit || "").toLowerCase();
    if (u.includes("sec") || u.includes("min")) return "time";
    if (u.includes("round")) return "rounds";
    if (u.includes("kg") || u.includes("lb")) return "weights";
    return "bodyweight";
  };

  const analyze = async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    try {
      const image = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("analyze-workout-image", { body: { image } });
      if (error) throw error;
      const raw = (data as any)?.exercises ?? [];
      const n = trainingDays.length;
      setLines(raw.map((e: any, i: number): AiLine => ({
        name: String(e.name ?? "").trim(),
        sets: String(e.sets ?? "3"),
        reps: String(e.reps ?? ""),
        weight: String(e.weight ?? ""),
        unit: String(e.unit ?? ""),
        day: i % n,
        unclear: !e.name || !e.reps,
      })));
      if (raw.length === 0) toast({ title: "No exercises found", description: "Try a clearer screenshot." });
    } catch (e) {
      toast({ title: "Could not read that image", description: (e as Error)?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Push grouped drafts up whenever the reviewed lines change.
  useEffect(() => {
    if (lines.length === 0) { onDraft([]); return; }
    const byDay: PlanDayDraft[] = trainingDays.map((_, di) => ({
      name: `Day ${di + 1}`,
      items: lines.filter((l) => l.day === di && l.name).map((l): PlanItemDraft => {
        const tracking = inferTracking(l.name, l.unit);
        return { name: l.name, tracking, sets: Number(l.sets) || 3, repsOrTime: l.reps || (tracking === "time" ? "30 sec" : "10"), startWeight: l.weight ? `${l.weight} ${l.unit || "kg"}`.trim() : undefined, videoUrl: (library ?? []).find((x) => x.name.toLowerCase() === l.name.toLowerCase())?.video_url };
      }),
    }));
    onDraft(byDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, trainingDays.join(",")]);

  const update = (i: number, patch: Partial<AiLine>) => setLines((prev) => prev.map((l, ii) => ii === i ? { ...l, ...patch, unclear: false } : l));
  const remove = (i: number) => setLines((prev) => prev.filter((_, ii) => ii !== i));

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 280px", minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>Upload your plan</p>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: C.body }}>A screenshot or photo from a trainer, an app or your notes.</p>
        <div style={{ marginTop: 14, padding: "24px 18px", border: `2px dashed ${C.purple}`, borderRadius: 18, background: C.bg, textAlign: "center" }}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void analyze(f); }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={loading} style={{ minHeight: 48, padding: "0 20px", border: `2px solid ${C.ink}`, borderRadius: 12, background: C.purple, color: "#FFFFFF", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            {loading ? "Reading..." : fileName ? "Upload another" : "Choose a screenshot"}
          </button>
          {fileName && <p style={{ margin: "12px 0 0", fontWeight: 800 }}>{fileName}</p>}
          {lines.length > 0 && <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: C.purple }}>Read by AI · {lines.length} exercises found</p>}
        </div>
      </div>
      <div style={{ flex: "2 1 420px", minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>What AI found</p>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: C.body }}>Check each one. You can change the name, numbers or day.</p>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {lines.length === 0 && <p style={{ margin: "8px 0", fontSize: 14, color: C.sub }}>Upload a screenshot and the exercises show up here.</p>}
          {lines.map((l, i) => (
            <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 10px", padding: "10px 12px", borderRadius: 14, border: `2px solid ${l.unclear ? C.magenta : C.border}`, background: l.unclear ? "#FFF5FA" : "#FFFFFF" }}>
              <span style={{ flex: "none", width: 28, height: 28, borderRadius: 999, background: l.unclear ? C.pink : C.purple, color: "#FFFFFF", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{l.unclear ? "?" : "✓"}</span>
              <input value={l.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Exercise name" style={{ flex: "1 1 160px", minWidth: 0, height: 40, border: `2px solid ${C.border}`, borderRadius: 10, padding: "0 10px", fontWeight: 800, fontSize: 15, color: C.ink }} />
              <input value={l.sets} onChange={(e) => update(i, { sets: e.target.value })} aria-label="sets" style={{ width: 44, height: 40, border: `2px solid ${C.border}`, borderRadius: 10, padding: "0 6px", textAlign: "center", fontWeight: 800, color: C.ink }} />
              <input value={l.reps} onChange={(e) => update(i, { reps: e.target.value })} aria-label="reps" placeholder="reps" style={{ width: 70, height: 40, border: `2px solid ${C.border}`, borderRadius: 10, padding: "0 8px", fontWeight: 800, color: C.ink }} />
              <select value={l.day} onChange={(e) => update(i, { day: Number(e.target.value) })} aria-label="day" style={{ height: 40, border: `2px solid ${C.border}`, borderRadius: 10, padding: "0 8px", fontWeight: 800, color: C.ink, background: "#FFFFFF" }}>
                {trainingDays.map((d, di) => <option key={d} value={di}>{d}</option>)}
              </select>
              <button type="button" onClick={() => remove(i)} aria-label={`Remove ${l.name || "line"}`} style={{ flex: "none", width: 34, height: 34, borderRadius: 999, border: `2px solid ${C.border}`, background: "#FFFFFF", color: "#A3165E", fontWeight: 800, cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: starting weights ──
function StepBase({ baseMode, setBaseMode, planDays, setPlanDays }: {
  baseMode: BaseMode; setBaseMode: (b: BaseMode) => void; planDays: PlanDayDraft[]; setPlanDays: (d: PlanDayDraft[]) => void;
}) {
  const weighted: { di: number; ii: number; item: PlanItemDraft }[] = [];
  planDays.forEach((d, di) => d.items.forEach((item, ii) => { if (item.tracking === "weights" || item.tracking === "assisted") weighted.push({ di, ii, item }); }));
  const setWeight = (di: number, ii: number, val: string) =>
    setPlanDays(planDays.map((d, i) => i !== di ? d : { ...d, items: d.items.map((it, j) => j !== ii ? it : { ...it, startWeight: val ? `${val} kg` : "" }) }));

  return (
    <>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>How should we set your starting weights?</p>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {BASE_OPTS.map((b) => {
          const on = b.id === baseMode;
          return (
            <button key={b.id} type="button" aria-pressed={on} onClick={() => setBaseMode(b.id)} style={{ textAlign: "left", padding: 18, border: `2px solid ${C.ink}`, borderRadius: 18, background: on ? "#FFF5FA" : "#FFFFFF", boxShadow: on ? `4px 4px 0 ${C.magenta}` : "none", color: C.ink, cursor: "pointer" }}>
              <span style={{ display: "block", fontWeight: 800, fontSize: 17 }}>{b.name}</span>
              <span style={{ display: "block", marginTop: 4, fontSize: 14, color: C.body }}>{b.desc}</span>
            </button>
          );
        })}
      </div>
      {baseMode === "manual" && weighted.length > 0 && (
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: 1, color: C.sub }}>YOUR STARTING WEIGHTS</p>
          {weighted.map(({ di, ii, item }) => (
            <div key={`${di}-${ii}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 12, background: C.tile }}>
              <span style={{ flex: 1, fontWeight: 800 }}>{item.name}</span>
              <label style={{ display: "flex", alignItems: "center", height: 40, border: `2px solid ${C.ink}`, borderRadius: 10, background: "#FFFFFF", overflow: "hidden" }}>
                <input inputMode="decimal" value={firstNumber(item.startWeight)} onChange={(e) => setWeight(di, ii, typedNumber(e.target.value))} style={{ width: 56, height: "100%", border: 0, padding: "0 8px", textAlign: "right", fontWeight: 800, color: C.ink }} />
                <span style={{ padding: "0 10px 0 2px", fontSize: 13, fontWeight: 700, color: C.sub }}>kg</span>
              </label>
            </div>
          ))}
        </div>
      )}
      <p style={{ margin: "16px 0 0", fontSize: 14, color: C.body }}>After that, the plan adds weight each week. On days you're not ready, it gives you a lighter version.</p>
    </>
  );
}

// ── Step 5: done ──
function StepDone({ trainingDays, baseMode, onSeeWeek }: { trainingDays: string[]; baseMode: BaseMode; onSeeWeek: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <span style={{ margin: "0 auto", width: 72, height: 72, borderRadius: 999, background: C.magenta, border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
      </span>
      <p style={{ margin: "16px 0 0", ...bangers, fontSize: 40, letterSpacing: 1, lineHeight: 1 }}>Your plan is live</p>
      <p style={{ margin: "8px auto 0", maxWidth: 460, color: C.body }}>You train {trainingDays.join(", ")}. {baseMode === "auto" ? "Week 1 finds your starting weights." : "We start from the weights you entered."}</p>
      <button type="button" onClick={onSeeWeek} style={{ marginTop: 20, minHeight: 52, padding: "0 28px", background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 17, cursor: "pointer" }}>See this week</button>
    </div>
  );
}
