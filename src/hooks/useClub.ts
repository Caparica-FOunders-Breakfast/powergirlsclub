import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { cleanNote, type FeedPost, type PostKind, type Readiness } from "@/lib/club";

// The club tables and functions are new; the generated types don't know them yet.
const db = supabase as any;
const PAGE = 20;

/** The member's feed choices (profiles.feed_share / feed_show_weights, default on). */
export const useFeedSettings = () => {
  const { data: profile } = useProfile();
  const p = profile as { feed_share?: boolean | null; feed_show_weights?: boolean | null } | null | undefined;
  return {
    loaded: profile !== undefined,
    share: p?.feed_share !== false,
    showWeights: p?.feed_show_weights !== false,
  };
};

export const useUpdateFeedSettings = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (updates: { feed_share?: boolean; feed_show_weights?: boolean }) => {
      const { error } = await db.from("profiles").update(updates).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
};

// ── Feed ───────────────────────────────────────────────────────────────────
export const useClubFeed = (bestsOnly: boolean) => {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ["club-feed", bestsOnly],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<FeedPost[]> => {
      const { data, error } = await db.rpc("club_feed", { _before: pageParam, _limit: PAGE, _bests_only: bestsOnly });
      if (error) throw error;
      return (data ?? []) as FeedPost[];
    },
    getNextPageParam: (last) => (last.length < PAGE ? undefined : last[last.length - 1].created_at),
    enabled: !!user,
  });
};

type FeedData = InfiniteData<FeedPost[], string | null>;
const patchPosts = (qc: ReturnType<typeof useQueryClient>, fn: (p: FeedPost) => FeedPost | null) => {
  qc.getQueriesData<FeedData>({ queryKey: ["club-feed"] }).forEach(([key, data]) => {
    if (!data) return;
    qc.setQueryData<FeedData>(key, {
      ...data,
      pages: data.pages.map((page) => page.map(fn).filter((p): p is FeedPost => p !== null)),
    });
  });
};

/** Cheer / un-cheer with an optimistic update. */
export const useToggleCheer = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ postId, cheer }: { postId: string; cheer: boolean }) => {
      const res = cheer
        ? await db.from("feed_cheers").insert({ post_id: postId, user_id: user!.id })
        : await db.from("feed_cheers").delete().eq("post_id", postId).eq("user_id", user!.id);
      // A double tap can insert twice; the cheer is already there.
      if (res.error && res.error.code !== "23505") throw res.error;
    },
    onMutate: async ({ postId, cheer }) => {
      await qc.cancelQueries({ queryKey: ["club-feed"] });
      const snapshot = qc.getQueriesData<FeedData>({ queryKey: ["club-feed"] });
      patchPosts(qc, (p) => (p.id === postId && p.cheered !== cheer ? { ...p, cheered: cheer, cheer_count: Math.max(0, p.cheer_count + (cheer ? 1 : -1)) } : p));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data)),
  });
};

export const useDeletePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await db.from("feed_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onMutate: (postId) => patchPosts(qc, (p) => (p.id === postId ? null : p)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["club-feed"] });
      qc.invalidateQueries({ queryKey: ["club-stats"] });
      qc.invalidateQueries({ queryKey: ["my-workout-post"] });
    },
  });
};

export const useDeleteMyPosts = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      const { error } = await db.from("feed_posts").delete().eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-feed"] });
      qc.invalidateQueries({ queryKey: ["club-stats"] });
      qc.invalidateQueries({ queryKey: ["my-workout-post"] });
    },
  });
};

export interface ClubStats {
  workouts: number;
  members: number;
  bests: number;
  top_bests: { first_name: string; exercise: string; weight_kg: number | null }[];
}

export const useClubStats = (weekStart: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["club-stats", weekStart],
    queryFn: async (): Promise<ClubStats | null> => {
      const { data, error } = await db.rpc("club_week_stats", { _week_start: weekStart });
      if (error) throw error;
      return (data as ClubStats) ?? null;
    },
    enabled: !!user,
  });
};

export interface TeamWeek {
  team: { id: string; name: string; code: string | null };
  standings: { team_id: string; name: string; points: number; is_mine: boolean }[];
  members: { first_name: string; done: number; planned: number; is_me: boolean }[];
}

export const useTeamWeek = (weekStart: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["club-team-week", weekStart, user?.id],
    queryFn: async (): Promise<TeamWeek | null> => {
      const { data, error } = await db.rpc("club_team_week", { _week_start: weekStart });
      if (error) throw error;
      return (data as TeamWeek) ?? null;
    },
    enabled: !!user,
  });
};

// ── Posting ────────────────────────────────────────────────────────────────
export interface NewPost {
  kind: PostKind;
  dedupeKey: string;
  weekStart?: string | null;
  dayIndex?: number | null;
  dayName?: string | null;
  weekNumber?: number | null;
  readiness?: Readiness | null;
  showWeights: boolean;
  note?: string | null;
  payload: Record<string, unknown>;
  workoutId?: string | null;
}

/** Create a post. Posting the same workout / streak / sign-up twice is a no-op. */
export const useCreatePost = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: NewPost) => {
      const { error } = await db.from("feed_posts").upsert(
        {
          user_id: user!.id,
          kind: p.kind,
          dedupe_key: p.dedupeKey,
          week_start: p.weekStart ?? null,
          day_index: p.dayIndex ?? null,
          day_name: p.dayName ?? null,
          week_number: p.weekNumber ?? null,
          readiness: p.readiness ?? null,
          show_weights: p.showWeights,
          note: p.note ? cleanNote(p.note) : null,
          payload: p.payload,
          workout_id: p.workoutId ?? null,
        },
        { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-feed"] });
      qc.invalidateQueries({ queryKey: ["club-stats"] });
      qc.invalidateQueries({ queryKey: ["my-workout-post"] });
    },
  });
};

export const workoutDedupeKey = (weekStart: string, dayIndex: number) => `workout:${weekStart}:${dayIndex}`;

/** Did I already post this workout? (Shows "Share with the club" again if not.) */
export const useMyWorkoutPost = (weekStart: string, dayIndex: number) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-workout-post", user?.id, weekStart, dayIndex],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await db
        .from("feed_posts")
        .select("id")
        .eq("user_id", user!.id)
        .eq("dedupe_key", workoutDedupeKey(weekStart, dayIndex))
        .maybeSingle();
      if (error) return false; // table not migrated yet
      return !!data;
    },
    enabled: !!user,
  });
};

// ── Finished workouts (team points, club stats) ─────────────────────────────
export const useRecordSession = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (s: { weekStart: string; dayIndex: number; dayName: string; minutes: number | null }): Promise<string | null> => {
      const { data, error } = await db
        .from("workout_sessions")
        .upsert(
          { user_id: user!.id, week_start: s.weekStart, day_index: s.dayIndex, day_name: s.dayName, minutes: s.minutes, finished_at: new Date().toISOString() },
          { onConflict: "user_id,week_start,day_index" },
        )
        .select("id")
        .maybeSingle();
      if (error) return null; // never block finishing a workout on this
      return (data?.id as string) ?? null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-stats"] });
      qc.invalidateQueries({ queryKey: ["club-team-week"] });
    },
  });
};

/** Un-ticking an exercise on a finished day takes the workout back off the board. */
export const useRemoveSession = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (s: { weekStart: string; dayIndex: number }) => {
      await db.from("workout_sessions").delete().eq("user_id", user!.id).eq("week_start", s.weekStart).eq("day_index", s.dayIndex);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-stats"] });
      qc.invalidateQueries({ queryKey: ["club-team-week"] });
    },
  });
};

/** My finished workouts per week, newest week first (for streak posts). */
export const fetchMySessionWeeks = async (userId: string, sinceWeek: string): Promise<Record<string, number>> => {
  const { data, error } = await db.from("workout_sessions").select("week_start").eq("user_id", userId).gte("week_start", sinceWeek);
  if (error || !data) return {};
  const out: Record<string, number> = {};
  (data as { week_start: string }[]).forEach((r) => { out[r.week_start] = (out[r.week_start] ?? 0) + 1; });
  return out;
};

// ── Admin ──────────────────────────────────────────────────────────────────
export interface AdminPost { id: string; created_at: string; kind: PostKind; day_name: string | null; note: string | null; hidden: boolean; author_name: string }

export const useAdminPosts = () =>
  useQuery({
    queryKey: ["club-admin-posts"],
    queryFn: async (): Promise<AdminPost[]> => {
      const { data, error } = await db.rpc("club_admin_posts", { _limit: 50 });
      if (error) return [];
      return (data ?? []) as AdminPost[];
    },
  });

export const useSetPostHidden = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await db.from("feed_posts").update({ hidden }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["club-admin-posts"] });
      qc.invalidateQueries({ queryKey: ["club-feed"] });
      qc.invalidateQueries({ queryKey: ["club-stats"] });
    },
  });
};
