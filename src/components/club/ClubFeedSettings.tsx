import { useEffect, useRef, useState } from "react";
import { useDeleteMyPosts, useFeedSettings, useUpdateFeedSettings } from "@/hooks/useClub";
import { Switch } from "@/components/club/WorkoutDoneSheet";
import { useToast } from "@/hooks/use-toast";

const C = { ink: "#2B1736", body: "#5E4E66", lilac: "#F4EDFE", row: "#EFE6F1", danger: "#A3165E" };

/**
 * Profile > "CLUB FEED" (design: club-feed.dc.html, Profile setting).
 * Turning sharing off keeps old posts; "Delete my past posts" removes them
 * after a confirm step.
 */
export function ClubFeedSettings() {
  const { share, showWeights } = useFeedSettings();
  const update = useUpdateFeedSettings();
  const deleteAll = useDeleteMyPosts();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // /profile#club-feed (from the club's "Change what I share") scrolls here.
  useEffect(() => {
    if (window.location.hash === "#club-feed") ref.current?.scrollIntoView({ block: "start" });
  }, []);

  const set = (updates: { feed_share?: boolean; feed_show_weights?: boolean }) =>
    update.mutate(updates, { onError: () => toast({ title: "Couldn't save. Try again.", variant: "destructive" }) });

  return (
    <section ref={ref} id="club-feed" style={{ scrollMarginTop: 80 }}>
      <div style={{ padding: 18, background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 20 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.body }}>CLUB FEED</p>
        <p style={{ margin: "4px 0 0", fontSize: 15, color: C.body }}>Choose what other members see when you finish a workout.</p>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column" }}>
          <div style={{ borderTop: `1px solid ${C.row}` }}>
            <Switch on={share} label="Share my workouts" desc="Post to the club feed when I finish a workout." onToggle={() => set({ feed_share: !share })} />
          </div>
          <div style={{ borderTop: `1px solid ${C.row}` }}>
            <Switch on={showWeights} label="Show my weights" desc="Show the kg I lifted. Off shows only exercises and new bests." onToggle={() => set({ feed_show_weights: !showWeights })} />
          </div>
        </div>
        <p style={{ margin: "8px 0 0", padding: "10px 12px", borderRadius: 12, background: C.lilac, fontSize: 14, fontWeight: 700 }}>Never shown in the feed: your body weight, your strength level, and your email.</p>
      </div>
      {confirm ? (
        <div role="alert" style={{ marginTop: 8, padding: "10px 12px", borderRadius: 12, border: `2px solid ${C.danger}`, background: "#FFFFFF" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Delete all your posts from the club feed? This can't be undone.</p>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button type="button" disabled={deleteAll.isPending} onClick={() => deleteAll.mutate(undefined, {
              onSuccess: () => { setConfirm(false); toast({ title: "Your past posts are deleted" }); },
              onError: () => toast({ title: "Couldn't delete your posts. Try again.", variant: "destructive" }),
            })} style={{ minHeight: 40, padding: "0 14px", border: `2px solid ${C.danger}`, borderRadius: 10, background: C.danger, color: "#FFFFFF", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              {deleteAll.isPending ? "Deleting..." : "Delete my posts"}
            </button>
            <button type="button" onClick={() => setConfirm(false)} style={{ minHeight: 40, padding: "0 14px", border: `2px solid ${C.ink}`, borderRadius: 10, background: "#FFFFFF", color: C.ink, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} style={{ marginTop: 6, padding: "6px 0", border: 0, background: "transparent", color: C.danger, fontWeight: 800, fontSize: 14, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}>Delete my past posts</button>
      )}
    </section>
  );
}
