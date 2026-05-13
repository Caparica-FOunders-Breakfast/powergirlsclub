import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, DollarSign, Image as ImageIcon, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAiImportEnabled, useSetAppSetting } from "@/hooks/useAppSettings";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Budget the admin wants to stay under. Used purely for the progress bar.
const MONTHLY_BUDGET_USD = 50;

interface UsageRow {
  id: string;
  user_id: string;
  feature: string;
  tokens_used: number;
  cost_estimate: number;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  display_name: string;
}

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDayKey = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
};

const AdminApiUsage = () => {
  const { toast } = useToast();
  const { data: aiEnabled, isLoading: settingLoading } = useAiImportEnabled();
  const setSetting = useSetAppSetting();

  const { data: logs, isLoading: logsLoading } = useQuery<UsageRow[]>({
    queryKey: ["admin-api-usage-logs", startOfMonth().toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_usage_logs")
        .select("id, user_id, feature, tokens_used, cost_estimate, created_at")
        .gte("created_at", startOfMonth().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UsageRow[];
    },
    // Light polling so the dashboard stays current without manual refresh.
    refetchInterval: 60_000,
  });

  // Pull display names for the top-users list. We always need profiles, so
  // load them in parallel rather than chaining off `logs`.
  const { data: profiles } = useQuery<ProfileRow[]>({
    queryKey: ["admin-api-usage-profile-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name");
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const stats = useMemo(() => {
    const rows = logs ?? [];
    const totalImports = rows.length;
    const totalCost = rows.reduce((sum, r) => sum + Number(r.cost_estimate ?? 0), 0);

    // Build a 30-day window so the chart has consistent x-axis ticks even on
    // sparse days.
    const days: { day: string; count: number; cost: number }[] = [];
    const dayMap = new Map<string, { count: number; cost: number }>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = formatDayKey(d);
      dayMap.set(key, { count: 0, cost: 0 });
      days.push({ day: key, count: 0, cost: 0 });
    }
    for (const r of rows) {
      const d = new Date(r.created_at);
      d.setHours(0, 0, 0, 0);
      const key = formatDayKey(d);
      const entry = dayMap.get(key);
      if (!entry) continue;
      entry.count += 1;
      entry.cost += Number(r.cost_estimate ?? 0);
    }
    const dailyData = days.map((d) => ({
      day: d.day,
      count: dayMap.get(d.day)?.count ?? 0,
      cost: dayMap.get(d.day)?.cost ?? 0,
    }));

    const perUser = new Map<string, { count: number; cost: number }>();
    for (const r of rows) {
      const cur = perUser.get(r.user_id) ?? { count: 0, cost: 0 };
      cur.count += 1;
      cur.cost += Number(r.cost_estimate ?? 0);
      perUser.set(r.user_id, cur);
    }
    const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));
    const topUsers = [...perUser.entries()]
      .map(([userId, v]) => ({
        userId,
        name: nameByUser.get(userId) || `User ${userId.slice(0, 6)}…`,
        count: v.count,
        cost: v.cost,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { totalImports, totalCost, dailyData, topUsers };
  }, [logs, profiles]);

  const budgetPct = Math.min(100, (stats.totalCost / MONTHLY_BUDGET_USD) * 100);
  const overBudget = stats.totalCost > MONTHLY_BUDGET_USD;

  const handleToggle = async (next: boolean) => {
    try {
      await setSetting.mutateAsync({ key: "ai_import_enabled", value: next });
      toast({
        description: next ? "AI import enabled" : "AI import disabled for all users",
      });
    } catch (e) {
      toast({
        title: "Couldn't update setting",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <motion.section
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border-2 border-border bg-card p-5 lg:p-6 space-y-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            <h3 className="font-display text-xl text-foreground lg:text-2xl">API Usage</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Power
            className={cn(
              "w-4 h-4",
              aiEnabled ? "text-emerald-500" : "text-muted-foreground",
            )}
          />
          <Switch
            checked={!!aiEnabled}
            onCheckedChange={handleToggle}
            disabled={settingLoading || setSetting.isPending}
            aria-label="Toggle AI import"
          />
        </div>
      </div>

      <p className="text-[11px] font-bold text-muted-foreground -mt-2">
        AI workout-plan import is currently{" "}
        <span className={cn("font-extrabold", aiEnabled ? "text-emerald-600" : "text-destructive")}>
          {aiEnabled ? "enabled" : "disabled"}
        </span>{" "}
        for all users.
      </p>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border-2 border-border bg-background p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ImageIcon className="w-4 h-4 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-wider">Imports this month</p>
          </div>
          <p className="font-display text-3xl text-foreground mt-1 tabular-nums">
            {logsLoading ? "…" : stats.totalImports}
          </p>
        </div>
        <div className="rounded-xl border-2 border-border bg-background p-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-wider">Est. cost this month</p>
          </div>
          <p className="font-display text-3xl text-foreground mt-1 tabular-nums">
            ${stats.totalCost.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Monthly limit indicator */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Monthly budget
          </p>
          <p className="text-[11px] font-bold text-muted-foreground tabular-nums">
            ${stats.totalCost.toFixed(2)} / ${MONTHLY_BUDGET_USD.toFixed(2)}
          </p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              overBudget ? "bg-destructive" : budgetPct > 80 ? "bg-amber-500" : "bg-primary",
            )}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        {overBudget && (
          <p className="text-[10px] font-bold text-destructive mt-1">
            Over budget — consider disabling AI import.
          </p>
        )}
      </div>

      {/* Daily usage chart */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Daily imports (last 30 days)
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.dailyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                interval={4}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: 12,
                }}
                formatter={(value: number, name) =>
                  name === "count"
                    ? [`${value} import${value === 1 ? "" : "s"}`, "Imports"]
                    : [value, name]
                }
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top users */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Top users this month
        </p>
        {stats.topUsers.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No imports yet this month.</p>
        ) : (
          <ul className="space-y-1.5">
            {stats.topUsers.map((u, idx) => (
              <li
                key={u.userId}
                className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg bg-background border border-border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-extrabold text-muted-foreground tabular-nums w-4">
                    #{idx + 1}
                  </span>
                  <span className="text-sm font-bold text-foreground truncate">{u.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold tabular-nums shrink-0">
                  <span className="text-foreground">
                    {u.count} import{u.count === 1 ? "" : "s"}
                  </span>
                  <span className="text-muted-foreground">${u.cost.toFixed(2)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
};

export default AdminApiUsage;
