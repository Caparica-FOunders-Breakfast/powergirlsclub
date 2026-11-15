import { useEffect, useRef, useState } from "react";
import { type Exercise, type WorkoutDay } from "@/data/workoutPlan";
import { useDebouncedCallback } from "@/hooks/useDebounce";

interface ExerciseEditorProps {
  day: WorkoutDay;
  dayIndex: number;
  hasCustom: boolean;
  onSave: (exercises: Exercise[]) => void;
  onReset: () => void;
  onClose: () => void;
}

const C = {
  ink: "#2B1736",
  sub: "#77677E",
  body: "#5E4E66",
  pink: "#C21C70",
  border: "#E4DAE7",
  lilac: "#F1E9FE",
  purple: "#5B21B6",
};

const TYPES = ["Weights", "Bodyweight", "Time", "Rounds", "Assisted"] as const;
type ExType = (typeof TYPES)[number];

const typeOf = (ex: Exercise): ExType =>
  ex.isAssisted ? "Assisted" : ex.isTimeBased ? "Time" : ex.isRoundsBased ? "Rounds" : ex.isBodyweight ? "Bodyweight" : "Weights";

const CFG: Record<ExType, { amountLabel: string; amountUnit: string; showLoad: boolean; loadLabel: string; progLabel: string; progSign: string; progUnit: string }> = {
  Weights: { amountLabel: "Reps", amountUnit: "reps", showLoad: true, loadLabel: "Starting weight", progLabel: "Add each week", progSign: "+", progUnit: "kg" },
  Bodyweight: { amountLabel: "Reps", amountUnit: "reps", showLoad: false, loadLabel: "", progLabel: "Add each week", progSign: "+", progUnit: "reps" },
  Time: { amountLabel: "Hold for", amountUnit: "sec", showLoad: false, loadLabel: "", progLabel: "Add each week", progSign: "+", progUnit: "sec" },
  Rounds: { amountLabel: "Reps / round", amountUnit: "reps", showLoad: false, loadLabel: "", progLabel: "Add each week", progSign: "+", progUnit: "reps" },
  Assisted: { amountLabel: "Reps", amountUnit: "reps", showLoad: true, loadLabel: "Assistance", progLabel: "Less help each week", progSign: "−", progUnit: "kg" },
};

const field: React.CSSProperties = { height: 44, border: `2px solid ${C.ink}`, borderRadius: 12, padding: "0 12px", fontWeight: 800, fontSize: 16, color: C.ink, boxSizing: "border-box", width: "100%", background: "#FFFFFF" };
const fieldLabel: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: C.body };

const ExerciseEditor = ({ day, hasCustom, onSave, onReset, onClose }: ExerciseEditorProps) => {
  const [exercises, setExercises] = useState<Exercise[]>([...day.exercises]);
  const [videoOpen, setVideoOpen] = useState<Record<number, boolean>>({});

  const hydrated = useRef(false);
  const dirty = useRef(false);
  const latestExercises = useRef(exercises);
  latestExercises.current = exercises;

  const autosave = useDebouncedCallback((next: Exercise[]) => {
    onSave(next.filter((ex) => ex.name.trim()));
  }, 800);

  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    dirty.current = true;
    autosave(exercises);
  }, [exercises, autosave]);

  useEffect(() => () => { if (dirty.current) autosave.flush(latestExercises.current); }, [autosave]);

  const addExercise = () => setExercises([...exercises, { name: "", sets: 3, reps: "10", suggestedWeight: "", progression: "" }]);
  const removeExercise = (idx: number) => setExercises(exercises.filter((_, i) => i !== idx));
  const update = (idx: number, patch: Partial<Exercise>) => setExercises(exercises.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)));
  const setType = (idx: number, t: ExType) => update(idx, { isBodyweight: t === "Bodyweight", isTimeBased: t === "Time", isRoundsBased: t === "Rounds", isAssisted: t === "Assisted" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "Nunito, system-ui, sans-serif", color: C.ink }}>
      <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: C.body }}>
        <span style={{ color: C.pink, fontWeight: 900 }}>✓</span> Changes save automatically
      </p>

      {exercises.map((ex, idx) => {
        const t = typeOf(ex);
        const cfg = CFG[t];
        const loadValue = ex.suggestedWeight ? ex.suggestedWeight.replace(/[^0-9.]/g, "") : "";
        const progValue = ex.progression ? ex.progression.replace(/[^0-9.]/g, "") : "";
        return (
          <div key={idx} style={{ background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 18, padding: "18px 20px", boxShadow: `4px 4px 0 ${C.border}` }}>
            {/* Name row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: "none", width: 28, height: 28, borderRadius: 999, background: C.ink, color: "#FFFFFF", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</span>
              <input value={ex.name} onChange={(e) => update(idx, { name: e.target.value })} placeholder="Exercise name" aria-label="Exercise name" style={{ flex: 1, minWidth: 0, height: 44, border: 0, borderBottom: `2px solid ${C.border}`, background: "transparent", fontWeight: 800, fontSize: 19, color: C.ink, padding: "0 4px" }} />
              <button type="button" onClick={() => removeExercise(idx)} aria-label={`Remove ${ex.name || "exercise"}`} style={{ flex: "none", width: 44, height: 44, border: `2px solid ${C.border}`, borderRadius: 12, background: "#FFFFFF", cursor: "pointer", color: "#A3165E", fontSize: 16 }}>🗑</button>
            </div>

            {/* Type */}
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.sub, marginRight: 4 }}>Type</span>
              {TYPES.map((ty) => {
                const on = ty === t;
                return (
                  <button key={ty} type="button" aria-pressed={on} onClick={() => setType(idx, ty)} style={{ minHeight: 40, padding: "0 14px", borderRadius: 999, border: `2px solid ${on ? C.ink : C.border}`, background: on ? C.ink : "#FFFFFF", color: on ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>{ty}</button>
                );
              })}
            </div>

            {/* Fields */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={fieldLabel}>Sets</span>
                <input type="text" inputMode="numeric" value={ex.sets} onChange={(e) => update(idx, { sets: parseInt(e.target.value) || 0 })} style={field} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={fieldLabel}>{cfg.amountLabel}</span>
                <span style={{ display: "flex", alignItems: "center", height: 44, border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden" }}>
                  <input type="text" inputMode="numeric" value={ex.reps} onChange={(e) => update(idx, { reps: e.target.value })} placeholder="10" style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 12px", fontWeight: 800, fontSize: 16, color: C.ink }} />
                  <span style={{ padding: "0 12px", fontSize: 14, fontWeight: 700, color: C.sub }}>{cfg.amountUnit}</span>
                </span>
              </label>
              {cfg.showLoad && (
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={fieldLabel}>{cfg.loadLabel}</span>
                  <span style={{ display: "flex", alignItems: "center", height: 44, border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden" }}>
                    <input type="text" inputMode="decimal" value={loadValue} onChange={(e) => update(idx, { suggestedWeight: e.target.value ? `${e.target.value} kg` : "" })} placeholder="20" style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 12px", fontWeight: 800, fontSize: 16, color: C.ink }} />
                    <span style={{ padding: "0 12px", fontSize: 14, fontWeight: 700, color: C.sub }}>kg</span>
                  </span>
                </label>
              )}
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={fieldLabel}>{cfg.progLabel}</span>
                <span style={{ display: "flex", alignItems: "center", height: 44, border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden", background: C.lilac }}>
                  <span style={{ padding: "0 0 0 12px", fontWeight: 800, color: C.purple }}>{cfg.progSign}</span>
                  <input type="text" inputMode="decimal" value={progValue} onChange={(e) => update(idx, { progression: e.target.value ? `${cfg.progSign}${e.target.value} ${cfg.progUnit}/week` : "" })} placeholder={cfg.progUnit === "kg" ? "1" : cfg.progUnit === "sec" ? "5" : "2"} style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 6px", fontWeight: 800, fontSize: 16, color: C.ink, background: "transparent" }} />
                  <span style={{ padding: "0 12px", fontSize: 14, fontWeight: 700, color: C.purple }}>{cfg.progUnit}</span>
                </span>
              </label>
            </div>

            {/* Video */}
            <div style={{ marginTop: 12 }}>
              {videoOpen[idx] || ex.videoUrl ? (
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={fieldLabel}>How-to video (YouTube link)</span>
                  <input type="url" value={ex.videoUrl ?? ""} onChange={(e) => update(idx, { videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." style={{ ...field, fontWeight: 600, fontSize: 15 }} />
                </label>
              ) : (
                <button type="button" onClick={() => setVideoOpen((v) => ({ ...v, [idx]: true }))} style={{ minHeight: 40, padding: 0, border: 0, background: "transparent", color: C.pink, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>▶ Add how-to video</button>
              )}
            </div>
          </div>
        );
      })}

      <button type="button" onClick={addExercise} style={{ width: "100%", minHeight: 56, border: `2px dashed ${C.pink}`, borderRadius: 16, background: "#FFFFFF", color: C.pink, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>＋ Add exercise</button>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        {hasCustom ? (
          <button type="button" onClick={onReset} style={{ minHeight: 44, padding: "0 4px", border: 0, background: "transparent", color: C.body, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>↺ Reset to default</button>
        ) : <span />}
        <button type="button" onClick={onClose} style={{ minHeight: 52, padding: "0 32px", background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 17, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );
};

export default ExerciseEditor;
