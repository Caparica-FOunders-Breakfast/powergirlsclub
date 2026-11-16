import { useMemo } from "react";
import { format } from "date-fns";
import type { WorkoutDay, Exercise } from "@/data/workoutPlan";
import { useMemberPlan, useExerciseLibrary } from "@/hooks/usePlan";
import { makeLibraryLookup, POWER_COLORS } from "@/lib/plan";
import { ExerciseInfo } from "./ExerciseInfo";

const C = {
  ink: "#2B1736", sub: "#77677E", body: "#5E4E66", pink: "#C21C70", magenta: "#E8308C",
  purple: "#6B2FB3", purpleText: "#5B21B6", lilac: "#F1E9FE", tile: "#F6F1F7", border: "#E4DAE7",
};
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const DAY_TINTS = ["#FFF0F7", "#F4EDFE", "#F3EEF4", "#FFF7D6"];
const SOURCE_LABEL: Record<string, string> = { recommended: "Recommended plan", ai_import: "Imported plan", custom: "Custom plan" };

const PlayIcon = ({ color = C.pink }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
);

const setsLabel = (e: Exercise) =>
  e.isRoundsBased ? `${e.sets} rounds` : e.reps ? `${e.sets} × ${e.reps}` : `${e.sets} sets`;

/**
 * "Your training plan" card for the Profile. Reads the member's live plan (the
 * training days of `plan`) and the member_plans header for the tags. Power
 * exercises are detected against the exercise library. All setup actions route
 * to /plan-setup via `onSetUp`.
 */
export function TrainingPlanCard({ plan, isMobile = false, onSetUp }: {
  plan: WorkoutDay[]; isMobile?: boolean; onSetUp: () => void;
}) {
  const { data: member } = useMemberPlan();
  const { data: library = [] } = useExerciseLibrary();
  // Loose name match, so old/custom plan names still find their library row.
  const findInLibrary = useMemo(() => makeLibraryLookup(library), [library]);

  const trainingDays = plan.filter((d) => !d.isRest && !d.isRecovery && d.exercises.length > 0);
  const count = member?.days_per_week ?? trainingDays.length;

  const card: React.CSSProperties = { background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22, padding: isMobile ? 18 : 24 };

  // ── Empty state ──
  if (trainingDays.length === 0) {
    return (
      <section style={card}>
        <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 26 : 32, letterSpacing: 1 }}>Your training plan</h2>
        <p style={{ margin: "8px 0 0", color: C.body, maxWidth: 520 }}>Choose 2, 3 or 4 days a week. Start from our recommended plan, upload a screenshot of your own, or build it exercise by exercise.</p>
        <button type="button" onClick={onSetUp} style={{ marginTop: 18, minHeight: 52, padding: "0 26px", background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 17, cursor: "pointer" }}>Set up your plan</button>
      </section>
    );
  }

  const tag = (text: string, bg: string, fg: string) => (
    <span style={{ padding: "3px 10px", borderRadius: 999, background: bg, color: fg, fontSize: 13, fontWeight: 800 }}>{text}</span>
  );

  return (
    <section style={card}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 26 : 32, letterSpacing: 1 }}>Your training plan</h2>
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {member && tag(SOURCE_LABEL[member.source] ?? "Your plan", "#FCE4F0", "#A3165E")}
            {tag(`${count} days a week`, C.lilac, C.purpleText)}
            {member?.started_at && tag(`Started ${format(new Date(member.started_at + "T00:00:00"), "MMM d")}`, C.tile, C.body)}
          </div>
        </div>
        <button type="button" onClick={onSetUp} style={{ minHeight: 44, padding: "0 18px", display: "inline-flex", alignItems: "center", gap: 8, background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 12, boxShadow: `3px 3px 0 ${C.ink}`, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>Change plan
        </button>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {trainingDays.map((day, i) => {
          const power = day.exercises.find((e) => findInLibrary(e.name)?.type === "power");
          const rest = day.exercises.filter((e) => e !== power);
          return (
            <div key={i} style={{ border: `2px solid ${C.border}`, borderRadius: 16, overflow: "hidden", background: "#FFFFFF" }}>
              <div style={{ padding: "12px 14px", background: DAY_TINTS[i % DAY_TINTS.length], borderBottom: `2px solid ${C.border}` }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.body }}>{day.day.toUpperCase()}</p>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>{day.label}</p>
              </div>
              <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                {power && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 10, background: POWER_COLORS.bg, border: `2px solid ${POWER_COLORS.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: POWER_COLORS.label }}>POWER START</p>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{power.name}<ExerciseInfo name={power.name} color={POWER_COLORS.label} /> <span style={{ fontWeight: 700, color: C.body }}>· {setsLabel(power)}</span></p>
                    </div>
                    {(power.videoUrl || findInLibrary(power.name)?.video_url) && (
                      <a href={power.videoUrl || findInLibrary(power.name)?.video_url || "#"} target="_blank" rel="noopener noreferrer" aria-label={`Watch how to do ${power.name}`} style={{ flex: "none", width: 36, height: 36, borderRadius: 999, background: "#FFFFFF", border: `2px solid ${POWER_COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><PlayIcon color={POWER_COLORS.border} /></a>
                    )}
                  </div>
                )}
                {rest.map((e, j) => {
                  const video = e.videoUrl || findInLibrary(e.name)?.video_url;
                  return (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderBottom: `1px solid ${C.tile}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{e.name}<ExerciseInfo name={e.name} /></p>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.sub }}>{setsLabel(e)}</p>
                      </div>
                      {video && <a href={video} target="_blank" rel="noopener noreferrer" aria-label={`Watch how to do ${e.name}`} style={{ flex: "none", width: 36, height: 36, borderRadius: 999, background: "#FCE4F0", display: "flex", alignItems: "center", justifyContent: "center" }}><PlayIcon /></a>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 20px", padding: "14px 16px", borderRadius: 14, background: "#FBF9FB", border: `2px dashed ${C.border}` }}>
        <span style={{ fontWeight: 800, fontSize: 15 }}>Got your own plan?</span>
        <button type="button" onClick={onSetUp} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 14, color: C.pink, background: "transparent", border: 0, cursor: "pointer", padding: "6px 0" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-8 8" /></svg>Upload a screenshot
        </button>
        <button type="button" onClick={onSetUp} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 14, color: C.pink, background: "transparent", border: 0, cursor: "pointer", padding: "6px 0" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>Build it yourself
        </button>
      </div>
    </section>
  );
}
