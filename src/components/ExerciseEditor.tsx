import { useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { type Exercise, type WorkoutDay } from "@/data/workoutPlan";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";

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

const TYPES = ["Weights", "Bodyweight", "Time", "Assisted"] as const;
type ExType = (typeof TYPES)[number];

// Short labels so the four types fit the segmented control on a phone.
const TYPE_SHORT: Record<ExType, string> = { Weights: "Weights", Bodyweight: "Body", Time: "Time", Assisted: "Assist" };

const typeOf = (ex: Exercise): ExType =>
  ex.isAssisted ? "Assisted" : ex.isTimeBased ? "Time" : ex.isBodyweight ? "Bodyweight" : "Weights";

// Progression unit follows the tracking type (bodyweight never shows kg).
const CFG: Record<ExType, { amountLabel: string; amountUnit: string; showLoad: boolean; loadLabel: string; progLabel: string; progSign: string; progUnit: string }> = {
  Weights: { amountLabel: "Reps", amountUnit: "reps", showLoad: true, loadLabel: "Starting weight", progLabel: "Add each week", progSign: "+", progUnit: "kg" },
  Bodyweight: { amountLabel: "Reps", amountUnit: "reps", showLoad: false, loadLabel: "", progLabel: "Add each week", progSign: "+", progUnit: "reps" },
  Time: { amountLabel: "Hold for", amountUnit: "sec", showLoad: false, loadLabel: "", progLabel: "Add each week", progSign: "+", progUnit: "sec" },
  Assisted: { amountLabel: "Reps", amountUnit: "reps", showLoad: true, loadLabel: "Assistance", progLabel: "Less help each week", progSign: "−", progUnit: "kg" },
};

const field: React.CSSProperties = { height: 44, border: `2px solid ${C.ink}`, borderRadius: 12, padding: "0 12px", fontWeight: 800, fontSize: 16, color: C.ink, boxSizing: "border-box", width: "100%", background: "#FFFFFF" };
const fieldLabel: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: C.body };

// Each row carries a stable uid so drag-to-reorder can track it.
interface Row { uid: number; ex: Exercise; }

const ExerciseEditor = ({ day, hasCustom, onSave, onReset, onClose }: ExerciseEditorProps) => {
  const isMobile = useIsMobile();
  const nextUid = useRef(0);
  const [rows, setRows] = useState<Row[]>(() => day.exercises.map((ex) => ({ uid: nextUid.current++, ex })));
  const [videoOpen, setVideoOpen] = useState<Record<number, boolean>>({});

  const hydrated = useRef(false);
  const dirty = useRef(false);
  const latestRows = useRef(rows);
  latestRows.current = rows;

  const autosave = useDebouncedCallback((next: Row[]) => {
    onSave(next.map((r) => r.ex).filter((ex) => ex.name.trim()));
  }, 800);

  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    dirty.current = true;
    autosave(rows);
  }, [rows, autosave]);

  useEffect(() => () => { if (dirty.current) autosave.flush(latestRows.current); }, [autosave]);

  const addExercise = () => setRows((prev) => [...prev, { uid: nextUid.current++, ex: { name: "", sets: 3, reps: "10", suggestedWeight: "", progression: "" } }]);
  const removeExercise = (uid: number) => setRows((prev) => prev.filter((r) => r.uid !== uid));
  const update = (uid: number, patch: Partial<Exercise>) => setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ex: { ...r.ex, ...patch } } : r)));
  const setType = (uid: number, t: ExType) => update(uid, { isBodyweight: t === "Bodyweight", isTimeBased: t === "Time", isRoundsBased: false, isAssisted: t === "Assisted" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "Nunito, system-ui, sans-serif", color: C.ink }}>
      <p style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: C.body }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
        Changes save automatically
      </p>

      <Reorder.Group as="div" axis="y" values={rows} onReorder={setRows} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((row, idx) => (
          <ExerciseCard
            key={row.uid}
            row={row}
            num={idx + 1}
            isMobile={isMobile}
            videoOpen={!!videoOpen[row.uid]}
            onOpenVideo={() => setVideoOpen((v) => ({ ...v, [row.uid]: true }))}
            onUpdate={(patch) => update(row.uid, patch)}
            onSetType={(t) => setType(row.uid, t)}
            onRemove={() => removeExercise(row.uid)}
          />
        ))}
      </Reorder.Group>

      <button type="button" onClick={addExercise} style={{ width: "100%", minHeight: 56, border: `2px dashed ${C.pink}`, borderRadius: 16, background: "#FFFFFF", color: C.pink, fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        Add exercise
      </button>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        {hasCustom ? (
          <button type="button" onClick={onReset} style={{ minHeight: 44, padding: "0 4px", border: 0, background: "transparent", color: C.body, fontWeight: 800, fontSize: 15, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>
            Reset to default
          </button>
        ) : <span />}
        <button type="button" onClick={onClose} style={{ minHeight: 52, padding: "0 32px", background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 17, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );
};

// One exercise card. Lives in its own component so it can own drag controls:
// only the grip handle starts a drag, so typing in the inputs never reorders.
function ExerciseCard({ row, num, isMobile, videoOpen, onOpenVideo, onUpdate, onSetType, onRemove }: {
  row: Row; num: number; isMobile: boolean; videoOpen: boolean;
  onOpenVideo: () => void; onUpdate: (patch: Partial<Exercise>) => void; onSetType: (t: ExType) => void; onRemove: () => void;
}) {
  const controls = useDragControls();
  const ex = row.ex;
  const t = typeOf(ex);
  const cfg = CFG[t];
  const loadValue = ex.suggestedWeight ? ex.suggestedWeight.replace(/[^0-9.]/g, "") : "";
  const progValue = ex.progression ? ex.progression.replace(/[^0-9.]/g, "") : "";

  return (
    <Reorder.Item
      as="div"
      value={row}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: `6px 6px 0 ${C.border}`, zIndex: 10 }}
      style={{ background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 18, padding: isMobile ? 14 : "18px 20px", boxShadow: `4px 4px 0 ${C.border}`, position: "relative" }}
    >
      {/* Name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          aria-label={`Reorder ${ex.name || "exercise"}`}
          onPointerDown={(e) => controls.start(e)}
          style={{ flex: "none", width: 32, height: 44, border: 0, background: "transparent", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "none" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={C.sub} aria-hidden="true"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
        </button>
        <span style={{ flex: "none", width: 28, height: 28, borderRadius: 999, background: C.ink, color: "#FFFFFF", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{num}</span>
        <input value={ex.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="Exercise name" aria-label="Exercise name" style={{ flex: 1, minWidth: 0, height: 44, border: 0, borderBottom: `2px solid ${C.border}`, background: "transparent", fontWeight: 800, fontSize: isMobile ? 17 : 19, color: C.ink, padding: "0 4px" }} />
        <button type="button" onClick={onRemove} aria-label={`Remove ${ex.name || "exercise"}`} style={{ flex: "none", width: 44, height: 44, border: `2px solid ${C.border}`, borderRadius: 12, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A3165E" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
        </button>
      </div>

      {/* Type: pills on desktop, segmented control on mobile */}
      {isMobile ? (
        <div style={{ marginTop: 14 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: C.sub, marginBottom: 6 }}>Type</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 4, padding: 4, borderRadius: 12, background: "#F6F1F7" }}>
            {TYPES.map((ty) => {
              const on = ty === t;
              return (
                <button key={ty} type="button" aria-pressed={on} onClick={() => onSetType(ty)} style={{ minHeight: 40, padding: "0 6px", border: 0, borderRadius: 9, background: on ? C.ink : "transparent", color: on ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>{TYPE_SHORT[ty]}</button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.sub, marginRight: 4 }}>Type</span>
          {TYPES.map((ty) => {
            const on = ty === t;
            return (
              <button key={ty} type="button" aria-pressed={on} onClick={() => onSetType(ty)} style={{ minHeight: 40, padding: "0 14px", borderRadius: 999, border: `2px solid ${on ? C.ink : C.border}`, background: on ? C.ink : "#FFFFFF", color: on ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>{ty}</button>
            );
          })}
        </div>
      )}

      {/* Fields */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={fieldLabel}>Sets</span>
          <input type="text" inputMode="numeric" value={ex.sets} onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || 0 })} style={field} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={fieldLabel}>{cfg.amountLabel}</span>
          <span style={{ display: "flex", alignItems: "center", height: 44, border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden" }}>
            <input type="text" inputMode="numeric" value={ex.reps} onChange={(e) => onUpdate({ reps: e.target.value })} placeholder="10" style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 12px", fontWeight: 800, fontSize: 16, color: C.ink }} />
            <span style={{ padding: "0 12px", fontSize: 14, fontWeight: 700, color: C.sub }}>{cfg.amountUnit}</span>
          </span>
        </label>
        {cfg.showLoad && (
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={fieldLabel}>{cfg.loadLabel}</span>
            <span style={{ display: "flex", alignItems: "center", height: 44, border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden" }}>
              <input type="text" inputMode="decimal" value={loadValue} onChange={(e) => onUpdate({ suggestedWeight: e.target.value ? `${e.target.value} kg` : "" })} placeholder="20" style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 12px", fontWeight: 800, fontSize: 16, color: C.ink }} />
              <span style={{ padding: "0 12px", fontSize: 14, fontWeight: 700, color: C.sub }}>kg</span>
            </span>
          </label>
        )}
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={fieldLabel}>{cfg.progLabel}</span>
          <span style={{ display: "flex", alignItems: "center", height: 44, border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden", background: C.lilac }}>
            <span style={{ padding: "0 0 0 12px", fontWeight: 800, color: C.purple }}>{cfg.progSign}</span>
            <input type="text" inputMode="decimal" value={progValue} onChange={(e) => onUpdate({ progression: e.target.value ? `${cfg.progSign}${e.target.value} ${cfg.progUnit}/week` : "" })} placeholder={cfg.progUnit === "kg" ? "1" : cfg.progUnit === "sec" ? "5" : "1"} style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 6px", fontWeight: 800, fontSize: 16, color: C.ink, background: "transparent" }} />
            <span style={{ padding: "0 12px", fontSize: 14, fontWeight: 700, color: C.purple }}>{cfg.progUnit}</span>
          </span>
        </label>
      </div>

      {/* Video */}
      <div style={{ marginTop: 12 }}>
        {videoOpen || ex.videoUrl ? (
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={fieldLabel}>How-to video (YouTube link)</span>
            <input type="url" value={ex.videoUrl ?? ""} onChange={(e) => onUpdate({ videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." style={{ ...field, fontWeight: 600, fontSize: 15 }} />
          </label>
        ) : (
          <button type="button" onClick={onOpenVideo} style={{ minHeight: 40, padding: 0, border: 0, background: "transparent", color: C.pink, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9l5 3-5 3z" /></svg>
            Add how-to video
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}

export default ExerciseEditor;
