import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Shared admin data for the Dashboard (weekly plan card) and the members table
// (Dashboard + Users page), so both show the same numbers.

export type PlanStatus = "on_plan" | "behind" | "not_started" | "no_plan";

export interface AdminMember {
  user_id: string;
  email: string | null;
  display_name: string;
  avatar_color: string;
  joined_at: string | null;
  last_active_at: string | null;
  /** Distinct days with a finished workout, all time (matches Scorecard). */
  workout_days: number;
  /** Distinct workout days since Monday of this week. */
  week_workouts: number;
  /** Training days per week from the member's plan (null = no plan set). */
  planned_per_week: number | null;
  /** Planned training days that have already come up this week (incl. today). */
  planned_so_far: number;
  plan_type: "default" | "custom";
  status: PlanStatus;
  body_weight: number | null;
  progress_goal: string | null;
  start_date: string | null;
  team_id: string | null;
}

// Rest/recovery check-ins are logged as exercises; they aren't workouts.
export const isRestCheckIn = (name: string | null | undefined) =>
  /^(rest|recovery) day$/i.test((name ?? "").trim());

export const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Monday 00:00 local of the current week. */
export const mondayOfThisWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

const formatSupabaseError = (err: unknown): string => {
  if (!err) return "unknown error";
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint, e.code ? `(code ${e.code})` : null].filter(Boolean);
    if (parts.length) return parts.join(", ");
  }
  return String(err);
};
export { formatSupabaseError };

export const useAdminMembers = () => {
  const { user } = useAuth();

  return useQuery<{ users: AdminMember[]; warnings: string[]; selfOnly?: boolean }>({
    queryKey: ["admin-members", user?.id ?? null],
    queryFn: async () => {
      const warnings: string[] = [];
      const profilesRes = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_color, body_weight, team_id, created_at");
      if (profilesRes.error || !profilesRes.data) throw new Error(formatSupabaseError(profilesRes.error));

      // Best-effort sidecars: each can be empty without breaking the page.
      const [prefsRes, logsRes] = await Promise.all([
        supabase.from("user_preferences" as never).select("user_id, frequency, training_days, progress_goal, start_date, plan_type"),
        supabase.from("exercise_logs").select("user_id, exercise_name, completed_at").eq("completed", true),
      ]);
      if (prefsRes.error) warnings.push(`Preferences: ${formatSupabaseError(prefsRes.error)}`);
      if (logsRes.error) warnings.push(`Workouts: ${formatSupabaseError(logsRes.error)}`);

      const prefsByUser = new Map<string, Record<string, unknown>>();
      for (const p of (prefsRes.data ?? []) as Array<Record<string, unknown>>) prefsByUser.set(p.user_id as string, p);

      const monday = mondayOfThisWeek();
      const todayIdx = (new Date().getDay() + 6) % 7; // 0 = Monday
      const allDays = new Map<string, Set<string>>();
      const weekDays = new Map<string, Set<string>>();
      const lastActive = new Map<string, string>();
      for (const log of (logsRes.data ?? []) as Array<{ user_id: string; exercise_name: string; completed_at: string | null }>) {
        if (!log.completed_at || isRestCheckIn(log.exercise_name)) continue;
        const at = new Date(log.completed_at);
        const day = localDateKey(at);
        if (!allDays.has(log.user_id)) allDays.set(log.user_id, new Set());
        allDays.get(log.user_id)!.add(day);
        if (at >= monday) {
          if (!weekDays.has(log.user_id)) weekDays.set(log.user_id, new Set());
          weekDays.get(log.user_id)!.add(day);
        }
        const prev = lastActive.get(log.user_id);
        if (!prev || log.completed_at > prev) lastActive.set(log.user_id, log.completed_at);
      }

      const users: AdminMember[] = profilesRes.data.map((p) => {
        const prefs = prefsByUser.get(p.user_id) ?? {};
        const trainingIdx = Array.isArray(prefs.training_days) ? (prefs.training_days as unknown[]).map(Number) : [];
        const frequency = typeof prefs.frequency === "number" ? (prefs.frequency as number) : null;
        const planned = trainingIdx.length || frequency || null;
        // Without explicit weekdays, spread the frequency evenly over the week.
        const plannedSoFar = trainingIdx.length
          ? trainingIdx.filter((i) => i <= todayIdx).length
          : planned ? Math.round((planned * (todayIdx + 1)) / 7) : 0;
        const weekWorkouts = weekDays.get(p.user_id)?.size ?? 0;
        const status: PlanStatus = !planned
          ? "no_plan"
          : weekWorkouts === 0
            ? "not_started"
            : weekWorkouts >= plannedSoFar ? "on_plan" : "behind";
        return {
          user_id: p.user_id,
          // Email lives in auth.users, which the browser can't read; we can only
          // fill it in for the signed-in admin.
          email: p.user_id === user?.id ? user?.email ?? null : null,
          display_name: p.display_name ?? "Member",
          avatar_color: p.avatar_color ?? "#E8308C",
          joined_at: p.created_at ?? null,
          last_active_at: lastActive.get(p.user_id) ?? null,
          workout_days: allDays.get(p.user_id)?.size ?? 0,
          week_workouts: weekWorkouts,
          planned_per_week: planned,
          planned_so_far: plannedSoFar,
          plan_type: prefs.plan_type === "custom" ? "custom" : "default",
          status,
          body_weight: (p as { body_weight: number | null }).body_weight ?? null,
          progress_goal: (prefs.progress_goal as string) ?? null,
          start_date: (prefs.start_date as string) ?? null,
          team_id: (p as { team_id: string | null }).team_id ?? null,
        };
      });

      users.sort((a, b) => {
        const av = a.last_active_at ?? a.joined_at ?? "";
        const bv = b.last_active_at ?? b.joined_at ?? "";
        return av !== bv ? bv.localeCompare(av) : a.display_name.localeCompare(b.display_name);
      });
      return { users, warnings };
    },
    staleTime: 60_000,
  });
};
