import { useEffect, useRef, useState } from "react";
import { bestBadge, liftSets, liftValue, postAction, postMeta, type FeedPost } from "@/lib/club";

const C = { ink: "#2B1736", body: "#5E4E66", sub: "#77677E", pink: "#C21C70", magenta: "#E8308C", border: "#E4DAE7", row: "#EFE6F1", foot: "#F3EEF4", yellow: "#FFE14D" };

const ICON = {
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4",
  fire: "M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z",
  wave: "M5 12h14M12 5l7 7-7 7",
};

export const NewBestTag = () => (
  <span style={{ padding: "1px 8px", borderRadius: 999, background: C.yellow, border: `1.5px solid ${C.ink}`, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>New best</span>
);

function Badge({ icon, title, text, bg, iconBg }: { icon: string; title: string; text: string; bg: string; iconBg: string }) {
  return (
    <div style={{ margin: "12px 16px 0", padding: "12px 14px", borderRadius: 14, background: bg, display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ flex: "none", width: 36, height: 36, borderRadius: 10, background: iconBg, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block" }}><path d={icon} /></svg>
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 800 }}>{title}</p>
        <p style={{ margin: 0, fontSize: 14, color: C.body }}>{text}</p>
      </div>
    </div>
  );
}

/**
 * One post in the club feed (design: club-feed.dc.html). `preview` is the
 * "Preview of your post" on the Workout done sheet: the same card without the
 * cheer row.
 */
export function PostCard({ post, preview = false, onCheer, onDelete }: {
  post: FeedPost;
  preview?: boolean;
  onCheer?: () => void;
  onDelete?: () => void;
}) {
  const p = post.payload ?? ({} as FeedPost["payload"]);
  const lifts = post.kind === "workout" && Array.isArray(p.lifts) ? p.lifts : [];
  const welcome = post.kind === "joined";
  const word = welcome ? "Welcome" : "Cheer";
  const best = post.kind === "workout" ? bestBadge(lifts) : null;
  const initial = (post.author_name?.[0] ?? "?").toUpperCase();

  let badge: { icon: string; title: string; text: string; bg: string; iconBg: string } | null = null;
  if (post.kind === "streak") {
    badge = { icon: ICON.fire, title: `${p.weeks} weeks in a row`, text: `${p.workouts} workouts, every planned day.`, bg: "#FFF0F7", iconBg: C.magenta };
  } else if (post.kind === "joined") {
    badge = { icon: ICON.wave, title: `Say hi to ${post.author_name}`, text: p.first_day ? `First workout on ${p.first_day}.` : "Just getting started.", bg: "#F4EDFE", iconBg: "#6B2FB3" };
  } else if (post.kind === "new_best") {
    badge = { icon: ICON.trophy, title: p.weight_kg != null ? `New best: ${p.name} ${p.weight_kg} kg` : `New best: ${p.name}`, text: p.weight_kg != null && p.previous_kg != null ? `+${p.weight_kg - p.previous_kg} kg since the last best.` : "A new personal best.", bg: "#FFF8D1", iconBg: C.ink };
  } else if (best && post.show_weights) {
    badge = { icon: ICON.trophy, ...best, bg: "#FFF8D1", iconBg: C.ink };
  }

  return (
    <article style={{ background: "#FFFFFF", border: `2px solid ${post.has_best ? C.ink : C.border}`, borderRadius: 20, overflow: preview ? "hidden" : "visible" }}>
      <div style={{ padding: "14px 16px 0", display: "flex", gap: 12, alignItems: "center" }}>
        <span aria-hidden="true" style={{ flex: "none", width: 44, height: 44, borderRadius: 999, background: post.author_color || C.magenta, color: "#FFFFFF", fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.ink}` }}>{initial}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 800, lineHeight: 1.3 }}>{post.author_name} <span style={{ fontWeight: 600, color: C.body }}>{postAction(post)}</span></p>
          <p style={{ margin: 0, fontSize: 13, color: C.sub }}>{postMeta(post)}</p>
        </div>
        {post.is_mine && !preview && onDelete && <PostMenu onDelete={onDelete} />}
      </div>

      {badge && <Badge {...badge} />}

      {lifts.length > 0 && (
        <>
          <ul style={{ margin: "12px 16px 0", padding: 0, listStyle: "none", border: `2px solid ${C.row}`, borderRadius: 14, overflow: "hidden" }}>
            {lifts.map((l, i) => {
              const value = post.show_weights || l.unit === "bodyweight" ? liftValue(l) : null;
              return (
                <li key={`${l.name}-${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 12px", borderTop: i ? `1px solid ${C.row}` : 0, fontSize: 15 }}>
                  <span style={{ minWidth: 0 }}><span style={{ fontWeight: 800 }}>{l.name}</span> <span style={{ color: C.sub, whiteSpace: "nowrap" }}>{liftSets(l)}</span></span>
                  <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 6 }}>
                    {value && <span style={{ fontWeight: 800 }}>{value}</span>}
                    {l.is_new_best && <NewBestTag />}
                  </span>
                </li>
              );
            })}
          </ul>
          {p.more_count > 0 && (
            <p style={{ margin: "6px 16px 0", fontSize: 13, fontWeight: 700, color: C.sub }}>+ {p.more_count} more {p.more_count === 1 ? "exercise" : "exercises"}</p>
          )}
        </>
      )}

      {post.note && <p style={{ margin: "12px 16px 0", fontSize: 15, overflowWrap: "anywhere" }}>{post.note}</p>}

      {preview ? (
        <div style={{ height: 14 }} />
      ) : (
        <div style={{ marginTop: 12, padding: "10px 12px", borderTop: `2px solid ${C.foot}`, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={onCheer}
            aria-pressed={post.cheered}
            aria-label={`${post.cheered ? (welcome ? "Welcomed" : "Cheered") : word} ${post.author_name}`}
            style={{ minHeight: 40, padding: "0 14px", border: `2px solid ${C.ink}`, borderRadius: 12, background: post.cheered ? C.magenta : "#FFFFFF", color: post.cheered ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={post.cheered ? "#FFFFFF" : "none"} stroke="currentColor" strokeWidth={2.4} strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block" }}><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
            {post.cheered ? (welcome ? "Welcomed" : "Cheered") : word}
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.body }}>
            {post.cheer_count} {welcome ? (post.cheer_count === 1 ? "welcome" : "welcomes") : post.cheer_count === 1 ? "cheer" : "cheers"}
          </span>
        </div>
      )}
    </article>
  );
}

/** "..." menu on your own post: Delete, with a confirm step. */
function PostMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) { setOpen(false); setConfirm(false); }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flex: "none" }}>
      <button type="button" aria-label="Post options" aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen((o) => !o); setConfirm(false); }} style={{ width: 40, height: 40, borderRadius: 12, border: 0, background: "transparent", color: C.body, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ display: "inline-block" }}><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </button>
      {open && (
        <div role="menu" style={{ position: "absolute", right: 0, top: 44, zIndex: 20, minWidth: 200, padding: 8, background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}` }}>
          {confirm ? (
            <>
              <p style={{ margin: "4px 6px 8px", fontSize: 14, fontWeight: 700 }}>Delete this post? Cheers on it go too.</p>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" role="menuitem" onClick={() => { setOpen(false); onDelete(); }} style={{ flex: 1, minHeight: 40, border: `2px solid #A3165E`, borderRadius: 10, background: "#A3165E", color: "#FFFFFF", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                <button type="button" role="menuitem" onClick={() => setConfirm(false)} style={{ flex: 1, minHeight: 40, border: `2px solid ${C.ink}`, borderRadius: 10, background: "#FFFFFF", color: C.ink, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Keep</button>
              </div>
            </>
          ) : (
            <button type="button" role="menuitem" onClick={() => setConfirm(true)} style={{ width: "100%", minHeight: 40, padding: "0 10px", textAlign: "left", border: 0, borderRadius: 10, background: "transparent", color: "#A3165E", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Delete post</button>
          )}
        </div>
      )}
    </div>
  );
}
