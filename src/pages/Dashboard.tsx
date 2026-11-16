import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AdminUsersTable, { Avatar } from "@/components/AdminUsersTable";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { FEATURE_FLAGS, useFeatureFlags, useSetAppSetting, type FeatureFlagKey } from "@/hooks/useAppSettings";
import { useAdminMembers, isRestCheckIn, localDateKey, mondayOfThisWeek, type AdminMember } from "@/hooks/useAdminMembers";

const C = {
  ink: "#2B1736", sub: "#77677E", body: "#5E4E66", pink: "#C21C70", magenta: "#E8308C",
  purpleText: "#5B21B6", lilac: "#F1E9FE", tile: "#F6F1F7", border: "#E4DAE7", seg: "#EFE6F1",
  grad: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)",
};
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const card: React.CSSProperties = { background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22 };
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHLY_BUDGET_USD = 10;

const FEATURE_CONTROLS: { key: FeatureFlagKey; label: string; description: string }[] = [
  { key: FEATURE_FLAGS.aiImport, label: "AI workout import", description: "Photo to training plan" },
  { key: FEATURE_FLAGS.language, label: "Language coaching", description: "Daily tasks and vocabulary" },
  { key: FEATURE_FLAGS.meals, label: "Meals and nutrition", description: "Meal plan and recipes" },
  { key: FEATURE_FLAGS.signups, label: "New member signups", description: "Let new people join" },
];

const STATUS_CHIP: Record<string, { text: string; bg: string; fg: string }> = {
  on_plan: { text: "On plan", bg: "#FFF5FA", fg: "#A3165E" },
  behind: { text: "Behind", bg: C.lilac, fg: C.purpleText },
  not_started: { text: "Not started", bg: C.tile, fg: C.body },
};

interface LogRow { user_id: string; exercise_name: string; completed_at: string | null }

const Dashboard = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { data: flags } = useFeatureFlags();
  const setSetting = useSetAppSetting();
  const { data: members } = useAdminMembers();

  const now = new Date();
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now.getFullYear(), now.getMonth()]); // eslint-disable-line react-hooks/exhaustive-deps
  const weekStart = useMemo(() => mondayOfThisWeek(), []);
  // The earlier of the two, so one query covers both "this month" and "this week".
  const since = monthStart < weekStart ? monthStart : weekStart;

  const { data: logs = [] } = useQuery<LogRow[]>({
    queryKey: ["admin-dashboard-logs", since.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("user_id, exercise_name, completed_at")
        .eq("completed", true)
        .gte("completed_at", since.toISOString());
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const { data: apiUsage = [] } = useQuery<{ cost_estimate: number }[]>({
    queryKey: ["admin-dashboard-api-usage", monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.from("api_usage_logs").select("cost_estimate").gte("created_at", monthStart.toISOString());
      if (error) throw error;
      return (data ?? []) as { cost_estimate: number }[];
    },
    refetchInterval: 60_000,
  });

  const users: AdminMember[] = members?.users ?? [];

  const stats = useMemo(() => {
    // A "workout" is one member finishing exercises on one day; rest/recovery
    // check-ins don't count. (Counting raw log rows made one 5-exercise
    // session look like 5 workouts.)
    const monthSessions = new Set<string>();
    const weekActive = new Set<string>();
    const perDay = DAY_LABELS.map(() => new Set<string>());
    for (const l of logs) {
      if (!l.completed_at || isRestCheckIn(l.exercise_name)) continue;
      const at = new Date(l.completed_at);
      const key = `${l.user_id}|${localDateKey(at)}`;
      if (at >= monthStart) monthSessions.add(key);
      if (at >= weekStart) {
        weekActive.add(l.user_id);
        perDay[(at.getDay() + 6) % 7].add(key);
      }
    }
    const apiCost = apiUsage.reduce((s, r) => s + Number(r.cost_estimate ?? 0), 0);
    const counts = { on_plan: 0, behind: 0, not_started: 0 };
    for (const u of users) if (u.status !== "no_plan") counts[u.status] += 1;
    return {
      workoutsThisMonth: monthSessions.size,
      activeThisWeek: weekActive.size,
      perDay: perDay.map((s) => s.size),
      apiCost,
      apiImports: apiUsage.length,
      counts,
    };
  }, [logs, apiUsage, users, monthStart, weekStart]);

  const total = users.length;
  const retention = total ? Math.round((stats.activeThisWeek / total) * 100) : 0;
  const budgetPct = Math.min(100, (stats.apiCost / MONTHLY_BUDGET_USD) * 100);
  const overBudget = stats.apiCost > MONTHLY_BUDGET_USD;
  const maxDay = Math.max(1, ...stats.perDay);
  const todayIdx = (now.getDay() + 6) % 7;
  const signupsOpen = flags?.[FEATURE_FLAGS.signups] ?? true;
  // Weekly plan list: members with a plan, the ones needing a nudge first.
  const ORDER = { behind: 0, not_started: 1, on_plan: 2, no_plan: 3 } as const;
  const planList = users.filter((u) => u.status !== "no_plan").sort((a, b) => ORDER[a.status] - ORDER[b.status]).slice(0, 5);

  const handleToggle = async (key: FeatureFlagKey, next: boolean, label: string) => {
    try {
      await setSetting.mutateAsync({ key, value: next });
      toast({ description: `${label} is now ${next ? "on" : "off"}.` });
    } catch (e) {
      toast({ title: "Couldn't update setting", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const kpi = (label: string, value: React.ReactNode, hint: React.ReactNode, extra?: React.ReactNode, highlight = false) => (
    <div style={highlight
      ? { background: C.grad, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 20, boxShadow: `4px 4px 0 ${C.ink}`, padding: isMobile ? 14 : 20 }
      : { ...card, borderRadius: 20, padding: isMobile ? 14 : 20 }}>
      <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, fontWeight: 800, color: highlight ? "rgba(255,255,255,0.9)" : C.sub }}>{label}</p>
      <p style={{ margin: "4px 0 0", ...bangers, fontSize: isMobile ? 36 : 48, lineHeight: 1 }}>{value}</p>
      {extra}
      <p style={{ margin: "6px 0 0", fontSize: isMobile ? 12 : 14, fontWeight: 700, color: highlight ? "rgba(255,255,255,0.9)" : C.body }}>{hint}</p>
    </div>
  );

  return (
    <div style={{ background: "#FBF9FB", minHeight: "100%", color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5, padding: isMobile ? "20px 16px 28px" : "32px 24px 64px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: isMobile ? 12 : 13, fontWeight: 800, letterSpacing: 1, color: C.sub }}>ADMIN · {format(now, "MMMM yyyy").toUpperCase()}</p>
          <h1 style={{ margin: "2px 0 0", ...bangers, fontSize: isMobile ? 40 : 52, letterSpacing: 1, lineHeight: 1 }}>Dashboard</h1>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(210px, 1fr))", gap: isMobile ? 10 : 16 }}>
          {kpi("Members", total, signupsOpen ? "Signups are open" : "Signups are closed", undefined, true)}
          {kpi("Active this week", <>{stats.activeThisWeek} <span style={{ fontFamily: "Nunito, sans-serif", fontSize: isMobile ? 14 : 16, fontWeight: 800, color: C.body }}>of {total}</span></>, `${retention}% weekly retention`)}
          {kpi("Workouts this month", stats.workoutsThisMonth, "Finished sessions, all members")}
          {kpi(
            "AI cost this month",
            `$${stats.apiCost.toFixed(2)}`,
            <span style={{ color: overBudget ? "#A3165E" : undefined }}>of ${MONTHLY_BUDGET_USD.toFixed(2)} budget · {stats.apiImports} {stats.apiImports === 1 ? "import" : "imports"}</span>,
            <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: C.seg }}><div style={{ width: `${budgetPct}%`, height: "100%", borderRadius: 999, background: overBudget ? "#A3165E" : C.magenta }} /></div>,
          )}
        </div>

        {/* Chart + weekly plan */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 16 : 24, alignItems: "stretch" }}>
          <section style={{ flex: "3 1 520px", minWidth: 0, ...card, padding: isMobile ? 18 : 24 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 26 : 30, letterSpacing: 1 }}>Workouts per day</h2>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.sub }}>This week · {format(weekStart, "MMM d")} – {format(new Date(weekStart.getTime() + 6 * 864e5), "d")}</span>
            </div>
            <div style={{ marginTop: 20, height: isMobile ? 120 : 200, display: "flex", alignItems: "flex-end", gap: isMobile ? 8 : 14, borderBottom: `2px solid ${C.border}`, padding: "0 4px" }}>
              {stats.perDay.map((v, i) => (
                <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: v ? C.ink : "#B8AABF" }}>{v}</span>
                  <div style={{ width: "100%", maxWidth: 56, height: `${(v / maxDay) * 85}%`, minHeight: 4, borderRadius: "10px 10px 0 0", background: v ? "linear-gradient(180deg, #E8308C 0%, #6B2FB3 100%)" : C.seg, outline: i === todayIdx ? `2px solid ${C.ink}` : "none", outlineOffset: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: isMobile ? 8 : 14, padding: "0 4px" }}>
              {DAY_LABELS.map((d, i) => <span key={d} style={{ flex: 1, textAlign: "center", fontSize: isMobile ? 11 : 13, fontWeight: 800, color: i === todayIdx ? C.ink : C.body }}>{isMobile ? d[0] : d}</span>)}
            </div>
          </section>

          <section style={{ flex: "2 1 340px", minWidth: 0, ...card, padding: isMobile ? 18 : 24 }}>
            <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 26 : 30, letterSpacing: 1 }}>Weekly plan</h2>
            <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: C.body }}>Who's keeping up with their plan this week</p>
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, textAlign: "center" }}>
              {(["on_plan", "behind", "not_started"] as const).map((k) => (
                <div key={k} style={{ padding: "12px 8px", borderRadius: 14, background: STATUS_CHIP[k].bg }}>
                  <p style={{ margin: 0, ...bangers, fontSize: 32, lineHeight: 1, color: k === "not_started" ? C.ink : STATUS_CHIP[k].fg }}>{stats.counts[k]}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 800 }}>{STATUS_CHIP[k].text}</p>
                </div>
              ))}
            </div>
            {/* Phones show just the three counts (mobile-dashboard mockup); the members list sits below. */}
            <div style={{ marginTop: 14, display: isMobile ? "none" : "flex", flexDirection: "column", gap: 8 }}>
              {planList.length === 0 && <p style={{ margin: 0, fontSize: 14, color: C.sub }}>No members have a plan yet.</p>}
              {planList.map((u) => {
                const chip = STATUS_CHIP[u.status];
                return (
                  <div key={u.user_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, border: `2px solid ${C.border}` }}>
                    <Avatar u={u} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 800 }}>{u.display_name}</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.body }}>{u.week_workouts} of {u.planned_per_week} this week</p>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 999, background: chip.bg, color: chip.fg, fontSize: 12, fontWeight: 800 }}>{chip.text}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Members + feature switches */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 16 : 24, alignItems: "flex-start" }}>
          <div style={{ flex: "3 1 560px", minWidth: 0 }}>
            <AdminUsersTable />
          </div>

          <section style={{ flex: "2 1 340px", minWidth: 0, ...card, padding: isMobile ? 18 : 24 }}>
            <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 26 : 30, letterSpacing: 1 }}>Feature switches</h2>
            <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: C.body }}>Members get changes the next time a page loads.</p>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column" }}>
              {FEATURE_CONTROLS.map(({ key, label, description }) => {
                const on = flags?.[key] ?? true;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderTop: `1px solid ${C.seg}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 800 }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 13, color: C.body }}>{description}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={label}
                      disabled={setSetting.isPending}
                      onClick={() => handleToggle(key, !on, label)}
                      style={{ flex: "none", width: 56, height: 32, borderRadius: 999, border: `2px solid ${C.ink}`, background: on ? C.magenta : C.border, cursor: setSetting.isPending ? "wait" : "pointer", padding: 0, position: "relative" }}
                    >
                      <span style={{ position: "absolute", top: 2, left: on ? 26 : 2, width: 24, height: 24, borderRadius: 999, background: "#FFFFFF", border: `2px solid ${C.ink}`, boxSizing: "border-box", transition: "left 0.15s" }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
