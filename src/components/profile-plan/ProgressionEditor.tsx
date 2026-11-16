import { useState } from "react";
import { track } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import {
  PROGRESSION_DEFAULT,
  PROGRESSION_MAX,
  PROGRESSION_MIN,
  PROGRESSION_STEP,
  PROGRESSION_WARN_AT,
  progressionPreset,
  useSetProgression,
  useUserPreferences,
} from "@/hooks/useUserPreferences";

const C = { ink: "#2B1736", sub: "#77677E", body: "#5E4E66", pink: "#C21C70", magenta: "#E8308C", purple: "#6B2FB3", lilac: "#F1E9FE", border: "#E4DAE7" };
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;

/** Example lift used in the projection line (kg). */
const PROJECTION_BASE = 30;
const PROJECTION_WEEKS = 12;

const clamp = (n: number) =>
  Math.min(PROGRESSION_MAX, Math.max(PROGRESSION_MIN, Math.round(n / PROGRESSION_STEP) * PROGRESSION_STEP));

/**
 * "Weekly progression" editor for the Profile dialog. Replaces the old
 * onboarding wizard's progression step; it saves only progression_kg_per_week.
 */
export function ProgressionEditor({ onSaved }: { onSaved?: () => void }) {
  const { data: prefs } = useUserPreferences();
  const setProgression = useSetProgression();
  const { toast } = useToast();
  const initial = prefs?.progression_kg_per_week ?? PROGRESSION_DEFAULT;
  const [kg, setKg] = useState(initial);
  // The custom stepper remembers its value even while a preset is selected.
  const [customKg, setCustomKg] = useState(progressionPreset(initial) === "custom" ? initial : 1.5);
  const preset = progressionPreset(kg);

  const chooseCustom = (n: number) => {
    const v = clamp(n);
    setCustomKg(v);
    setKg(v);
  };

  const save = async () => {
    try {
      await setProgression.mutateAsync(kg);
      track("progression_selected", { kg_per_week: kg, preset: progressionPreset(kg) });
      onSaved?.();
    } catch (e) {
      toast({ title: "Couldn't save progression", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const option = (active: boolean, onClick: () => void, title: string, rate?: string, badge?: string, extra?: React.ReactNode) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{ textAlign: "left", width: "100%", padding: 16, borderRadius: 16, border: `2px solid ${active ? C.ink : C.border}`, background: active ? "#FFF5FA" : "#FFFFFF", boxShadow: active ? `3px 3px 0 ${C.magenta}` : "none", cursor: "pointer", color: C.ink, fontFamily: "inherit" }}
    >
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 17 }}>{title}</span>
        {badge && <span style={{ padding: "2px 10px", borderRadius: 999, background: "#FCE4F0", color: "#A3165E", fontSize: 12, fontWeight: 800 }}>{badge}</span>}
      </span>
      {rate && <span style={{ display: "block", marginTop: 2, fontWeight: 800, fontSize: 15, color: C.pink }}>{rate}</span>}
      {extra}
    </button>
  );

  const stepBtn = (label: string, delta: number, path: string) => (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); chooseCustom(customKg + delta); }}
      style={{ width: 44, height: 44, borderRadius: 999, border: `2px solid ${C.ink}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" aria-hidden="true"><path d={path} /></svg>
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif" }}>
      <div>
        <h2 style={{ margin: 0, ...bangers, fontSize: 30, letterSpacing: 1, lineHeight: 1.05 }}>How hard do you want to push?</h2>
        <p style={{ margin: "6px 0 0", fontSize: 15, color: C.body }}>
          Muscles grow by adding a little weight every week. Pick how much we add to your working weights each week. It applies to your whole plan, and on days you're not ready you get a lighter version.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {option(preset === "healthy", () => setKg(1), "Healthy", "+1 kg a week", "Recommended")}
        {option(preset === "aggressive", () => setKg(2), "Aggressive", "+2 kg a week")}
        {option(
          preset === "custom",
          () => chooseCustom(customKg),
          "Custom",
          undefined,
          undefined,
          <span style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {stepBtn("Decrease", -PROGRESSION_STEP, "M5 12h14")}
            <span style={{ ...bangers, fontSize: 26, minWidth: 92, textAlign: "center" }}>+{customKg.toFixed(1)} kg</span>
            {stepBtn("Increase", PROGRESSION_STEP, "M12 5v14M5 12h14")}
            <span style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>{PROGRESSION_MIN} to {PROGRESSION_MAX} kg a week</span>
          </span>,
        )}
      </div>

      <p style={{ margin: 0, padding: "12px 14px", borderRadius: 14, background: C.lilac, fontSize: 15, fontWeight: 700 }}>
        At +{kg} kg a week, a {PROJECTION_BASE} kg squat becomes <strong style={{ color: C.pink }}>{PROJECTION_BASE + kg * PROJECTION_WEEKS} kg</strong> in {PROJECTION_WEEKS} weeks.
      </p>

      {kg >= PROGRESSION_WARN_AT && (
        <p role="note" style={{ margin: 0, padding: "12px 14px", borderRadius: 14, background: "#FFF5FA", border: `2px solid ${C.magenta}`, fontSize: 15, fontWeight: 700 }}>
          +{kg} kg a week is a lot. Make sure sleep and food keep up, or you'll stall in a few weeks.
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={setProgression.isPending}
        style={{ minHeight: 52, border: `2px solid ${C.ink}`, borderRadius: 14, background: C.pink, color: "#FFFFFF", boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 17, cursor: setProgression.isPending ? "wait" : "pointer" }}
      >
        {setProgression.isPending ? "Saving..." : "Save progression"}
      </button>
    </div>
  );
}
