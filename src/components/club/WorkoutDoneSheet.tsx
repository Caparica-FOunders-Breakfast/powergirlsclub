import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PostCard } from "@/components/club/PostCard";
import { NOTE_MAX, type FeedPost, type Readiness, type WorkoutPayload } from "@/lib/club";

const C = { ink: "#2B1736", body: "#5E4E66", magenta: "#E8308C", border: "#E4DAE7", yellow: "#FFE14D" };
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;

export function Switch({ on, label, onToggle, desc }: { on: boolean; label: string; desc?: string; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, padding: "10px 0", border: 0, background: "transparent", color: C.ink, cursor: "pointer", fontFamily: "inherit" }}>
      <span>
        <span style={{ display: "block", fontWeight: 800 }}>{label}</span>
        {desc && <span style={{ display: "block", fontSize: 14, color: C.body }}>{desc}</span>}
      </span>
      <span aria-hidden="true" style={{ flex: "none", width: 52, height: 30, borderRadius: 999, background: on ? C.magenta : C.border, border: `2px solid ${C.ink}`, position: "relative", boxSizing: "border-box" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 24 : 2, width: 22, height: 22, borderRadius: 999, background: "#FFFFFF", border: `2px solid ${C.ink}`, boxSizing: "border-box", transition: "left 0.15s" }} />
      </span>
    </button>
  );
}

/**
 * "Workout done!" (design: club-feed.dc.html, After a workout). Shows the post
 * exactly as others will see it, an optional note and a "Show my weights"
 * switch for this post only. Escape or a tap outside finishes without sharing.
 */
export function WorkoutDoneSheet({ heading, dayName, minutes, payload, weekNumber, readiness, authorName, authorColor, defaultShowWeights, busy, onShare, onSkip }: {
  heading: string; // "WEDNESDAY · UPPER BODY + CORE"
  dayName: string;
  minutes: number | null;
  payload: WorkoutPayload;
  weekNumber: number | null;
  readiness: Readiness | null;
  authorName: string;
  authorColor: string;
  defaultShowWeights: boolean;
  busy: boolean;
  onShare: (note: string, showWeights: boolean) => void;
  onSkip: () => void;
}) {
  const [note, setNote] = useState("");
  const [showWeights, setShowWeights] = useState(defaultShowWeights);
  const shareRef = useRef<HTMLButtonElement>(null);
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    shareRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onSkip(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [onSkip]);

  const bests = payload.lifts.filter((l) => l.is_new_best).length;
  const summary = [
    minutes ? `${minutes} minutes` : null,
    `${payload.exercises} ${payload.exercises === 1 ? "exercise" : "exercises"}`,
    bests ? `${bests} new ${bests === 1 ? "best" : "bests"}` : null,
  ].filter(Boolean).join(" · ");

  const preview: FeedPost = {
    id: "preview",
    created_at: new Date().toISOString(),
    kind: "workout",
    day_name: dayName,
    week_number: weekNumber,
    readiness,
    show_weights: showWeights,
    note: note.trim() || null,
    payload: payload as FeedPost["payload"],
    has_best: bests > 0,
    author_name: authorName,
    author_color: authorColor,
    cheer_count: 0,
    cheered: false,
    is_mine: true,
  };

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(43,23,54,.55)", display: "flex", alignItems: wide ? "center" : "flex-end", justifyContent: "center", padding: wide ? 20 : 0, fontFamily: "Nunito, system-ui, sans-serif", color: C.ink, fontSize: 16, lineHeight: 1.5 }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="wd-title" style={{ width: "100%", maxWidth: 520, maxHeight: wide ? "calc(100dvh - 40px)" : "92dvh", overflowY: "auto", background: "#FFFFFF", border: `2px solid ${C.ink}`, borderBottom: wide ? `2px solid ${C.ink}` : 0, borderRadius: wide ? 28 : "28px 28px 0 0", boxShadow: wide ? `8px 8px 0 ${C.magenta}` : "none", padding: wide ? "24px 24px 28px" : "22px 20px calc(28px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.body }}>{heading}</p>
        <h2 id="wd-title" style={{ margin: "4px 0 0", ...bangers, fontSize: 40, letterSpacing: 1, lineHeight: 1 }}>Workout done!</h2>
        <p style={{ margin: "6px 0 0", color: C.body }}>{summary}</p>

        <div style={{ marginTop: 16, border: `2px solid ${C.ink}`, borderRadius: 18, overflow: "hidden" }}>
          <p style={{ margin: 0, padding: "10px 14px", background: "#FFF0F7", borderBottom: `2px solid ${C.border}`, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.body }}>PREVIEW OF YOUR POST</p>
          <div style={{ padding: 10, background: "#FBF9FB" }}>
            <PostCard post={preview} preview />
          </div>
        </div>

        <label htmlFor="wd-note" style={{ display: "block", marginTop: 14, fontWeight: 800, fontSize: 15 }}>Add a note (optional)</label>
        <input
          id="wd-note"
          type="text"
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How did it go?"
          aria-describedby="wd-note-count"
          style={{ marginTop: 6, width: "100%", height: 48, padding: "0 14px", border: `2px solid ${C.ink}`, borderRadius: 12, fontSize: 16, boxSizing: "border-box", fontFamily: "inherit", color: C.ink }}
        />
        <p id="wd-note-count" style={{ margin: "4px 0 0", fontSize: 12, fontWeight: 700, color: C.body, textAlign: "right" }}>{note.length} / {NOTE_MAX} · links are removed</p>

        <div style={{ marginTop: 4 }}>
          <Switch on={showWeights} label="Show my weights" onToggle={() => setShowWeights((v) => !v)} />
        </div>

        <button ref={shareRef} type="button" disabled={busy} onClick={() => onShare(note, showWeights)} style={{ marginTop: 12, width: "100%", minHeight: 56, border: `2px solid ${C.ink}`, borderRadius: 14, background: C.yellow, color: C.ink, boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 18, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>
          {busy ? "Sharing..." : "Share with the club"}
        </button>
        <button type="button" onClick={onSkip} style={{ marginTop: 10, width: "100%", minHeight: 44, border: 0, background: "transparent", color: C.body, fontWeight: 800, fontSize: 15, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
          Finish without sharing
        </button>
      </div>
    </div>,
    document.body,
  );
}
