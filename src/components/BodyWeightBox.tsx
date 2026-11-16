import { useState } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { parseBodyWeight } from "@/lib/onboarding";

const C = { ink: "#2B1736", sub: "#77677E", body: "#5E4E66", pink: "#C21C70", magenta: "#E8308C", border: "#E4DAE7" };

/**
 * Body weight for strength levels (scorecard-new-member.dc.html). Missing:
 * the pink "What's your body weight?" box. Set: a "Body weight 63 kg · Edit"
 * row. Accepts 25 to 300 kg, with a comma or a dot.
 */
export function BodyWeightBox({ startEditing = false, onSaved }: { startEditing?: boolean; onSaved?: () => void }) {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const bw = profile?.body_weight != null ? Number(profile.body_weight) : null;
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const v = parseBodyWeight(draft);
    if (v === null) { setError("Enter a weight between 25 and 300 kg."); return; }
    setError(null);
    try {
      await updateProfile.mutateAsync({ body_weight: v });
      setEditing(false);
      setDraft("");
      onSaved?.();
    } catch (e) {
      setError((e as Error)?.message || "Couldn't save. Try again.");
    }
  };

  if (bw && !editing) {
    return (
      <p style={{ margin: "12px 0 0", padding: "10px 14px", borderRadius: 12, background: "#FBF9FB", border: `2px solid ${C.border}`, fontWeight: 700, display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span>Body weight</span>
        <span>
          {bw} kg ·{" "}
          <button type="button" onClick={() => { setDraft(String(bw)); setEditing(true); }} style={{ border: 0, padding: 0, background: "none", color: C.pink, fontWeight: 800, textDecoration: "underline", cursor: "pointer", font: "inherit" }}>Edit</button>
        </span>
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void save(); }}
      style={{ marginTop: 12, padding: 14, borderRadius: 14, background: "#FFF0F7", border: `2px solid ${C.magenta}` }}
    >
      <label htmlFor="bw-in" style={{ display: "block", fontWeight: 800 }}>What's your body weight?</label>
      <p style={{ margin: "2px 0 10px", fontSize: 14, color: C.body }}>We need your body weight to calculate your strength level. Only you can see it.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 110px", display: "flex", alignItems: "center", height: 48, border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", overflow: "hidden" }}>
          <input
            id="bw-in"
            type="text"
            inputMode="decimal"
            placeholder="63"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(null); }}
            aria-invalid={!!error}
            style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 0 0 14px", fontSize: 18, fontWeight: 800, color: C.ink, background: "transparent", fontFamily: "inherit" }}
          />
          <span style={{ padding: "0 14px 0 4px", fontWeight: 700, color: C.sub }}>kg</span>
        </div>
        <button type="submit" disabled={updateProfile.isPending} style={{ flex: "none", minHeight: 48, padding: "0 18px", border: `2px solid ${C.ink}`, borderRadius: 12, background: C.ink, color: "#FFFFFF", fontWeight: 800, cursor: updateProfile.isPending ? "wait" : "pointer", fontFamily: "inherit" }}>
          {updateProfile.isPending ? "Saving..." : "Save"}
        </button>
      </div>
      {error && <p role="alert" style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 700, color: "#A3165E" }}>{error}</p>}
    </form>
  );
}
