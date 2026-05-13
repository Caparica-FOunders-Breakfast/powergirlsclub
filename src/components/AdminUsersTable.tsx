import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronRight,
  ListChecks,
  Mail,
  Scale,
  Search,
  Target,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface AdminUserRow {
  user_id: string;
  email: string | null;
  display_name: string;
  avatar_color: string;
  joined_at: string | null;
  last_active_at: string | null;
  workouts_this_month: number;
  training_days_per_week: number | null;
  plan_type: "default" | "custom";
  body_weight: number | null;
  progress_goal: string | null;
  start_date: string | null;
  team_id: string | null;
}

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatRelative = (iso: string | null) => {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(iso);
};

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase() || "?";
};

// Supabase's PostgrestError is a plain object, not an Error instance.
// Format it for both the console and the UI without losing fields.
const formatSupabaseError = (err: unknown): string => {
  if (!err) return "unknown error";
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint, e.code ? `(code ${e.code})` : null].filter(Boolean);
    if (parts.length > 0) return parts.join(" — ");
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
};

const AdminUsersTable = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{
    users: AdminUserRow[];
    fallback?: "self-only";
    warnings: string[];
  }>({
    queryKey: ["admin-users-direct", user?.id ?? null],
    queryFn: async () => {
      const warnings: string[] = [];
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);

      // Step 1: profiles is the only query we *must* succeed. RLS on it is
      // `USING (true)` for all authenticated users, so this should always work.
      const profilesRes = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_color, body_weight, team_id, created_at");
      console.log("[AdminUsersTable] profiles result:", profilesRes);

      if (profilesRes.error || !profilesRes.data) {
        console.error("[AdminUsersTable] profiles query failed:", profilesRes.error);

        // Fallback: still surface something — fetch just the signed-in admin's
        // own row so the page isn't blank while RLS gets fixed.
        if (user) {
          const selfRes = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_color, body_weight, team_id, created_at")
            .eq("user_id", user.id)
            .maybeSingle();
          console.log("[AdminUsersTable] self-only fallback result:", selfRes);
          if (!selfRes.error && selfRes.data) {
            const p = selfRes.data;
            return {
              users: [
                {
                  user_id: p.user_id,
                  email: user.email ?? null,
                  display_name: p.display_name ?? "You",
                  avatar_color: p.avatar_color ?? "#FF2D87",
                  joined_at: p.created_at ?? null,
                  last_active_at: null,
                  workouts_this_month: 0,
                  training_days_per_week: null,
                  plan_type: "default" as const,
                  body_weight: (p as { body_weight: number | null }).body_weight ?? null,
                  progress_goal: null,
                  start_date: null,
                  team_id: (p as { team_id: string | null }).team_id ?? null,
                },
              ],
              fallback: "self-only" as const,
              warnings: [
                `Couldn't load all users: ${formatSupabaseError(profilesRes.error)}`,
              ],
            };
          }
        }
        throw new Error(formatSupabaseError(profilesRes.error));
      }

      // Step 2: best-effort sidecar tables. Any of these can be silently
      // empty without breaking the page — they just degrade the column data.
      const [prefsRes, logsRes] = await Promise.all([
        supabase
          .from("user_preferences" as never)
          .select(
            "user_id, frequency, training_days, progress_goal, start_date, plan_type",
          ),
        supabase
          .from("exercise_logs")
          .select("user_id, completed_at")
          .eq("completed", true),
      ]);
      console.log("[AdminUsersTable] prefs result:", prefsRes);
      console.log("[AdminUsersTable] logs result:", logsRes);

      if (prefsRes.error) {
        console.warn("[AdminUsersTable] user_preferences read failed:", prefsRes.error);
        warnings.push(`Preferences: ${formatSupabaseError(prefsRes.error)}`);
      }
      if (logsRes.error) {
        console.warn("[AdminUsersTable] exercise_logs read failed:", logsRes.error);
        warnings.push(`Workouts: ${formatSupabaseError(logsRes.error)}`);
      }

      const prefsByUser = new Map<
        string,
        {
          frequency?: number;
          progress_goal?: string;
          start_date?: string;
          plan_type?: string | null;
        }
      >();
      for (const p of (prefsRes.data ?? []) as Array<Record<string, unknown>>) {
        prefsByUser.set(p.user_id as string, p as never);
      }

      // workouts_this_month = distinct (user, day) pairs with completed_at
      // in the current month. last_active_at = latest completed_at overall.
      const workoutDays = new Map<string, Set<string>>();
      const lastActive = new Map<string, string>();
      for (const log of (logsRes.data ?? []) as Array<{ user_id: string; completed_at: string | null }>) {
        if (!log.completed_at) continue;
        const day = log.completed_at.slice(0, 10);
        if (log.completed_at >= monthStart.toISOString()) {
          if (!workoutDays.has(log.user_id)) workoutDays.set(log.user_id, new Set());
          workoutDays.get(log.user_id)!.add(day);
        }
        const prev = lastActive.get(log.user_id);
        if (!prev || log.completed_at > prev) {
          lastActive.set(log.user_id, log.completed_at);
        }
      }

      const users: AdminUserRow[] = (profilesRes.data ?? []).map((p) => {
        const prefs = prefsByUser.get(p.user_id);
        return {
          user_id: p.user_id,
          // Email lives in auth.users and isn't reachable from the browser
          // without an edge function. For the signed-in admin we can fill it
          // in from the auth session.
          email: p.user_id === user?.id ? user?.email ?? null : null,
          display_name: p.display_name ?? "Member",
          avatar_color: p.avatar_color ?? "#FF2D87",
          joined_at: p.created_at ?? null,
          last_active_at: lastActive.get(p.user_id) ?? null,
          workouts_this_month: workoutDays.get(p.user_id)?.size ?? 0,
          training_days_per_week: prefs?.frequency ?? null,
          // Null/empty plan_type = the user hasn't customized → Default.
          plan_type: prefs?.plan_type === "custom" ? "custom" : "default",
          body_weight: (p as { body_weight: number | null }).body_weight ?? null,
          progress_goal: prefs?.progress_goal ?? null,
          start_date: prefs?.start_date ?? null,
          team_id: (p as { team_id: string | null }).team_id ?? null,
        };
      });

      // Sort by most-recently-active, then by name as a stable tiebreak.
      users.sort((a, b) => {
        const av = a.last_active_at ?? a.joined_at ?? "";
        const bv = b.last_active_at ?? b.joined_at ?? "";
        if (av !== bv) return bv.localeCompare(av);
        return a.display_name.localeCompare(b.display_name);
      });

      console.log(`[AdminUsersTable] loaded ${users.length} users (${warnings.length} warnings)`);
      return { users, warnings };
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const users = data?.users ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = `${u.display_name} ${u.email ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [data, query]);

  return (
    <motion.section
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border-2 border-border bg-card p-4 lg:p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-display text-lg text-foreground lg:text-xl">Users</h3>
          {data && (
            <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
              {filtered.length} of {data.users.length}
            </span>
          )}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="pl-9 h-9 border-2 border-border"
          />
        </div>
      </div>

      {data?.fallback === "self-only" && (
        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 break-words">
          Showing only your own profile — couldn't load all users. Check the console for details.
        </p>
      )}
      {data?.warnings && data.warnings.length > 0 && (
        <ul className="text-[11px] font-bold text-muted-foreground space-y-0.5">
          {data.warnings.map((w, i) => (
            <li key={i}>⚠️ {w}</li>
          ))}
        </ul>
      )}

      {error ? (
        <p className="text-xs font-bold text-destructive break-words">
          Couldn't load users: {formatSupabaseError(error)}
        </p>
      ) : isLoading ? (
        <p className="text-xs italic text-muted-foreground">Loading users…</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          {query ? "No users match that search." : "No registered users yet."}
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10" />
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead className="hidden lg:table-cell">Last active</TableHead>
                <TableHead className="text-right">Workouts</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Days/wk</TableHead>
                <TableHead className="hidden sm:table-cell">Plan</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isOpen = expanded === u.user_id;
                return (
                  <Fragment key={u.user_id}>
                    <TableRow
                      onClick={() => setExpanded(isOpen ? null : u.user_id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="py-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white"
                          style={{ backgroundColor: u.avatar_color }}
                        >
                          {initialsOf(u.display_name)}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 font-bold text-foreground">
                        {u.display_name}
                      </TableCell>
                      <TableCell className="py-2 hidden md:table-cell text-muted-foreground">
                        {u.email ?? "—"}
                      </TableCell>
                      <TableCell className="py-2 hidden lg:table-cell text-muted-foreground tabular-nums">
                        {formatDate(u.joined_at)}
                      </TableCell>
                      <TableCell className="py-2 hidden lg:table-cell text-muted-foreground tabular-nums">
                        {formatRelative(u.last_active_at)}
                      </TableCell>
                      <TableCell className="py-2 text-right font-bold tabular-nums">
                        {u.workouts_this_month}
                      </TableCell>
                      <TableCell className="py-2 text-right hidden sm:table-cell text-muted-foreground tabular-nums">
                        {u.training_days_per_week ?? "—"}
                      </TableCell>
                      <TableCell className="py-2 hidden sm:table-cell">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                            u.plan_type === "custom"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {u.plan_type}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            isOpen && "rotate-90",
                          )}
                        />
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="hover:bg-transparent bg-muted/30">
                        <TableCell colSpan={9} className="py-3">
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Email:</span>
                              <span className="font-bold text-foreground truncate">
                                {u.email ?? "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Joined:</span>
                              <span className="font-bold text-foreground">
                                {formatDate(u.joined_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Last active:</span>
                              <span className="font-bold text-foreground">
                                {formatRelative(u.last_active_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <ListChecks className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Plan type:</span>
                              <span className="font-bold text-foreground capitalize">
                                {u.plan_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Progress goal:</span>
                              <span className="font-bold text-foreground capitalize">
                                {u.progress_goal ?? "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Program start:</span>
                              <span className="font-bold text-foreground">
                                {formatDate(u.start_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Body weight:</span>
                              <span className="font-bold text-foreground">
                                {u.body_weight ? `${u.body_weight} kg` : "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Team:</span>
                              <span className="font-bold text-foreground truncate">
                                {u.team_id ?? "—"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </motion.section>
  );
};

export default AdminUsersTable;
