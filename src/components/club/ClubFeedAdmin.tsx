import { useAdminPosts, useSetPostHidden } from "@/hooks/useClub";
import { timeAgo } from "@/lib/club";
import { useToast } from "@/hooks/use-toast";

const C = { ink: "#2B1736", body: "#5E4E66", row: "#EFE6F1" };
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;

const KIND: Record<string, string> = { workout: "Workout", new_best: "New best", streak: "Streak", joined: "Joined" };

/** Admin dashboard: the latest club posts, each with Hide / Show. */
export function ClubFeedAdmin({ compact }: { compact: boolean }) {
  const { data: posts } = useAdminPosts();
  const setHidden = useSetPostHidden();
  const { toast } = useToast();

  return (
    <section style={{ background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22, padding: compact ? 18 : 24 }}>
      <h2 style={{ margin: 0, ...bangers, fontSize: compact ? 26 : 30, letterSpacing: 1 }}>Club feed</h2>
      <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: C.body }}>Latest 50 posts. Hiding removes a post from the feed for everyone.</p>
      {!posts?.length ? (
        <p style={{ margin: "14px 0 0", color: C.body }}>No posts yet.</p>
      ) : (
        <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
          {posts.map((p) => (
            <li key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.row}`, opacity: p.hidden ? 0.55 : 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 800 }}>{p.author_name} · {KIND[p.kind] ?? p.kind}{p.day_name ? ` · ${p.day_name}` : ""}{p.hidden ? " · Hidden" : ""}</p>
                <p style={{ margin: 0, fontSize: 13, color: C.body, overflowWrap: "anywhere" }}>{timeAgo(p.created_at)}{p.note ? ` · "${p.note}"` : ""}</p>
              </div>
              <button
                type="button"
                disabled={setHidden.isPending}
                onClick={() => setHidden.mutate({ id: p.id, hidden: !p.hidden }, { onError: () => toast({ title: "Couldn't update the post", variant: "destructive" }) })}
                style={{ flex: "none", minHeight: 40, padding: "0 14px", border: `2px solid ${C.ink}`, borderRadius: 10, background: p.hidden ? "#FFFFFF" : C.ink, color: p.hidden ? C.ink : "#FFFFFF", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
              >
                {p.hidden ? "Show" : "Hide"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
