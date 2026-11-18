import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { format, startOfWeek } from "date-fns";
import { useMyTeam } from "@/hooks/useTeams";
import { useClubFeed, useClubStats, useDeletePost, useFeedSettings, useTeamWeek, useToggleCheer } from "@/hooks/useClub";
import { PostCard } from "@/components/club/PostCard";
import ChallengesTab from "@/components/club/ChallengesTab";
import { daysLeftLabel, ordinal, useTeamChallengeWeek } from "@/components/club/teamWeek";
import { PageViewToggle } from "@/components/ViewModeToggle";
import { useToast } from "@/hooks/use-toast";

const C = { bg: "#FBF9FB", ink: "#2B1736", body: "#5E4E66", sub: "#77677E", pink: "#C21C70", grad: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)", lilac: "#F4EDFE", border: "#E4DAE7" };
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const box: React.CSSProperties = { padding: 18, background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 20 };
const label: React.CSSProperties = { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.body };

const useWide = (min: number) => {
  const query = `(min-width: ${min}px)`;
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return wide;
};

/**
 * The club (design: club-feed.dc.html). /club is the Feed, /club/challenges
 * the 4-week team challenge.
 */
export default function Club() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tab: "feed" | "challenges" = pathname.startsWith("/club/challenges") ? "challenges" : "feed";
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const wide = useWide(900);

  const tabBtn = (k: "feed" | "challenges", text: string) => {
    const on = tab === k;
    return (
      <button key={k} type="button" role="tab" id={`club-tab-${k}`} aria-selected={on} aria-controls="club-panel" tabIndex={on ? 0 : -1}
        onClick={() => navigate(k === "feed" ? "/club" : "/club/challenges")}
        onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); navigate(k === "feed" ? "/club/challenges" : "/club"); } }}
        style={{ flex: 1, minHeight: 46, border: 0, background: on ? C.ink : "#FFFFFF", color: on ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>
        {text}
      </button>
    );
  };

  return (
    <div style={{ background: C.bg, minHeight: "100%", color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5 }}>
      <div style={{ width: "100%", maxWidth: 1040, margin: "0 auto", padding: wide ? "32px 24px 64px" : "20px 16px 40px", boxSizing: "border-box", display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
        <section style={{ flex: "999 1 520px", minWidth: 0, maxWidth: 640, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, ...bangers, fontSize: 48, letterSpacing: 1, lineHeight: 1 }}>The club</h1>
              <p style={{ margin: "4px 0 0", color: C.body }}>{tab === "feed" ? "See who trained today. Cheer them on." : "Team up with friends. A winner every week."}</p>
            </div>
            <PageViewToggle />
          </div>

          <div role="tablist" aria-label="Club" style={{ display: "flex", border: `2px solid ${C.ink}`, borderRadius: 14, overflow: "hidden", background: "#FFFFFF" }}>
            {tabBtn("feed", "Feed")}
            {tabBtn("challenges", "Challenges")}
          </div>

          <div id="club-panel" role="tabpanel" aria-labelledby={`club-tab-${tab}`} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tab === "feed" ? <FeedTab weekStart={weekStart} /> : <ChallengesTab weekStart={weekStart} />}
          </div>
        </section>

        {tab === "feed" && wide && <SideColumn weekStart={weekStart} />}
      </div>
    </div>
  );
}

function TeamCard({ weekStart }: { weekStart: string }) {
  const navigate = useNavigate();
  const { data: team } = useMyTeam();
  const { data: teamWeek } = useTeamWeek(weekStart);
  const tw = useTeamChallengeWeek(weekStart);
  if (!team) return null;
  const done = teamWeek?.members.reduce((n, m) => n + m.done, 0) ?? 0;
  const total = teamWeek?.members.reduce((n, m) => n + m.planned, 0) ?? 0;
  const rank = (teamWeek?.standings.findIndex((s) => s.is_mine) ?? -1) + 1;
  const line = [
    teamWeek ? `${done} of ${total} workouts this week` : null,
    rank > 0 ? `${ordinal(rank)} place` : null,
    daysLeftLabel(tw.daysLeft),
  ].filter(Boolean).join(" · ");
  return (
    <button type="button" onClick={() => navigate("/club/challenges")} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: `2px solid ${C.ink}`, borderRadius: 16, background: "#FFF8D1", color: C.ink, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
      <span style={{ flex: "none", width: 38, height: 38, borderRadius: 10, background: C.ink, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block" }}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 800 }}>Your team: {team.name}</span>
        <span style={{ display: "block", fontSize: 14, color: C.body }}>{line}</span>
      </span>
      <span style={{ flex: "none", fontWeight: 800, fontSize: 14, color: C.pink }}>See</span>
    </button>
  );
}

function FeedTab({ weekStart }: { weekStart: string }) {
  const [bestsOnly, setBestsOnly] = useState(false);
  const { data: stats } = useClubStats(weekStart);
  const feed = useClubFeed(bestsOnly);
  const cheer = useToggleCheer();
  const del = useDeletePost();
  const { toast } = useToast();
  const sentinel = useRef<HTMLDivElement>(null);
  const posts = feed.data?.pages.flat() ?? [];

  // Load the next 20 when the end of the list scrolls into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !feed.hasNextPage) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !feed.isFetchingNextPage) void feed.fetchNextPage();
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [feed.hasNextPage, feed.isFetchingNextPage, feed.fetchNextPage, posts.length]);

  const chip = (on: boolean, text: string, pick: () => void) => (
    <button type="button" aria-pressed={on} onClick={pick} style={{ minHeight: 40, padding: "0 16px", border: `2px solid ${C.ink}`, borderRadius: 999, background: on ? C.ink : "#FFFFFF", color: on ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{text}</button>
  );

  return (
    <>
      <TeamCard weekStart={weekStart} />

      <div style={{ padding: "14px 16px", border: `2px solid ${C.ink}`, borderRadius: 18, background: C.grad, color: "#FFFFFF", display: "flex", gap: 10 }}>
        {[
          { v: stats?.workouts, l: "workouts this week" },
          { v: stats?.members, l: "members trained" },
          { v: stats?.bests, l: "new bests" },
        ].map((s) => (
          <div key={s.l} style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, ...bangers, fontSize: 30, lineHeight: 1 }}>{s.v ?? "0"}</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700 }}>{s.l}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {chip(!bestsOnly, "Everyone", () => setBestsOnly(false))}
        {chip(bestsOnly, "New bests", () => setBestsOnly(true))}
      </div>

      {feed.isLoading ? (
        <p role="status" style={{ margin: 0, color: C.body }}>Loading the club...</p>
      ) : feed.isError ? (
        <div role="alert" style={box}>
          <p style={{ margin: 0, color: C.body }}>The club feed didn't load.</p>
          <button type="button" onClick={() => void feed.refetch()} style={{ marginTop: 10, minHeight: 40, padding: "0 14px", border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", color: C.ink, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Try again</button>
        </div>
      ) : posts.length === 0 ? (
        <div style={{ ...box, textAlign: "center", padding: "28px 18px" }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 18 }}>{bestsOnly ? "No new bests yet." : "No workouts yet this week. Be the first."}</p>
          <Link to="/week" style={{ display: "inline-block", marginTop: 10, fontWeight: 800, color: C.pink }}>Go to this week</Link>
        </div>
      ) : (
        <>
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onCheer={() => cheer.mutate({ postId: p.id, cheer: !p.cheered })}
              onDelete={() => del.mutate(p.id, { onError: () => toast({ title: "Couldn't delete the post", variant: "destructive" }) })}
            />
          ))}
          <div ref={sentinel} />
          {feed.isFetchingNextPage && <p role="status" style={{ margin: 0, textAlign: "center", color: C.body }}>Loading more...</p>}
        </>
      )}
    </>
  );
}

function SideColumn({ weekStart }: { weekStart: string }) {
  const navigate = useNavigate();
  const { data: stats } = useClubStats(weekStart);
  const { share, showWeights } = useFeedSettings();
  const bests = stats?.top_bests ?? [];
  const yourPosts = !share
    ? "Your workouts aren't shared. Your body weight is never shown."
    : showWeights
      ? "Your workouts are shared with weights. Your body weight is never shown."
      : "Your workouts are shared without weights. Your body weight is never shown.";
  return (
    <aside style={{ flex: "1 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16, marginTop: 92 }}>
      <div style={box}>
        <p style={label}>NEW BESTS THIS WEEK</p>
        {bests.length > 0 ? (
          <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {bests.map((b, i) => (
              <li key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 15 }}>
                <span><strong>{b.first_name}</strong> <span style={{ color: C.body }}>{b.exercise}</span></span>
                {b.weight_kg != null && <strong style={{ whiteSpace: "nowrap" }}>{b.weight_kg} kg</strong>}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: "10px 0 0", fontSize: 15, color: C.body }}>None yet this week.</p>
        )}
      </div>
      <div style={{ ...box, background: C.lilac }}>
        <p style={{ margin: 0, fontWeight: 800 }}>Your posts</p>
        <p style={{ margin: "4px 0 0", fontSize: 15, color: C.body }}>{yourPosts}</p>
        <button type="button" onClick={() => navigate("/profile#club-feed")} style={{ marginTop: 12, minHeight: 40, padding: "0 14px", border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", color: C.ink, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Change what I share</button>
      </div>
    </aside>
  );
}
