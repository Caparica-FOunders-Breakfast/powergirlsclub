import { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  DollarSign,
  Dumbbell,
  Globe,
  ImagePlus,
  Repeat,
  Sparkles,
  UserPlus,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import AdminUsersTable from "@/components/AdminUsersTable";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  FEATURE_FLAGS,
  useFeatureFlags,
  useSetAppSetting,
  type FeatureFlagKey,
} from "@/hooks/useAppSettings";
import { cn } from "@/lib/utils";

// Day labels for the bar chart. Day index here follows the rest of the app:
// 0 = Monday … 6 = Sunday.
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTHLY_BUDGET_USD = 10;

// Calls Anthropic returning a 429 (daily-limit error). The edge function
// doesn't tag rows that hit the rate limit, so this is the closest signal
// we can show without schema changes — count is always 0 for now and the
// card explains that. Keeping the placeholder here makes the future wiring
// obvious without breaking the layout today.
const RATE_LIMIT_HITS_PLACEHOLDER = 0;

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Monday-based week, matching the rest of the app.
  const day = d.getDay(); // 0 = Sun … 6 = Sat
  const mondayOffset = (day + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  return d;
};

interface ProfileRow {
  user_id: string;
  display_name: string;
  avatar_color: string;
}

interface ExerciseLogRow {
  user_id: string;
  day_index: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface ApiUsageRow {
  id: string;
  user_id: string;
  cost_estimate: number;
  created_at: string;
}

const FEATURE_CONTROLS: {
  key: FeatureFlagKey;
  label: string;
  description: string;
  icon: typeof Sparkles;
}[] = [
  {
    key: FEATURE_FLAGS.aiImport,
    label: "AI workout import",
    description: "Photo-to-plan import in Training Preferences.",
    icon: ImagePlus,
  },
  {
    key: FEATURE_FLAGS.language,
    label: "Language coaching",
    description: "Daily language tasks and vocabulary.",
    icon: Globe,
  },
  {
    key: FEATURE_FLAGS.meals,
    label: "Meals & nutrition",
    description: "Meal plan, recipes, and combos.",
    icon: UtensilsCrossed,
  },
  {
    key: FEATURE_FLAGS.signups,
    label: "New user signups",
    description: "Allow new accounts to register.",
    icon: UserPlus,
  },
];

const MetricCard = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Sparkles;
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-2xl border-2 border-border bg-card p-4 lg:p-5">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-4 h-4 text-primary" />
      <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
    </div>
    <p className="font-display text-3xl text-foreground mt-1.5 tabular-nums lg:text-4xl">
      {value}
    </p>
    {hint && <p className="text-[11px] font-bold text-muted-foreground mt-1">{hint}</p>}
  </div>
);

const Dashboard = () => {
  const { toast } = useToast();
  const { data: flags } = useFeatureFlags();
  const setSetting = useSetAppSetting();

  const monthStart = useMemo(() => startOfMonth(), []);
  const weekStart = useMemo(() => startOfWeek(), []);

  const { data: profiles = [] } = useQuery<ProfileRow[]>({
    queryKey: ["admin-dashboard-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_color");
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });

  const { data: monthLogs = [] } = useQuery<ExerciseLogRow[]>({
    queryKey: ["admin-dashboard-exercise-logs", monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("user_id, day_index, completed, completed_at, created_at")
        .eq("completed", true)
        .gte("completed_at", monthStart.toISOString());
      if (error) throw error;
      return (data ?? []) as ExerciseLogRow[];
    },
  });

  const { data: weekLogs = [] } = useQuery<ExerciseLogRow[]>({
    queryKey: ["admin-dashboard-exercise-logs-week", weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("user_id, day_index, completed, completed_at, created_at")
        .eq("completed", true)
        .gte("completed_at", weekStart.toISOString());
      if (error) throw error;
      return (data ?? []) as ExerciseLogRow[];
    },
  });

  const { data: apiUsage = [] } = useQuery<ApiUsageRow[]>({
    queryKey: ["admin-dashboard-api-usage", monthStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_usage_logs")
        .select("id, user_id, cost_estimate, created_at")
        .gte("created_at", monthStart.toISOString());
      if (error) throw error;
      return (data ?? []) as ApiUsageRow[];
    },
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => {
    const totalUsers = profiles.length;
    const workoutsThisMonth = monthLogs.length;

    // Retention: unique users with ≥1 completed log this week / total users.
    const activeUsersThisWeek = new Set(weekLogs.map((l) => l.user_id)).size;
    const retentionPct = totalUsers > 0 ? (activeUsersThisWeek / totalUsers) * 100 : 0;

    const apiCost = apiUsage.reduce((sum, r) => sum + Number(r.cost_estimate ?? 0), 0);
    const apiImports = apiUsage.length;

    // Workouts per weekday (Mon–Sun). Group "workouts" by (user, day, date) so
    // a user completing 5 exercises on Monday counts once for that Monday.
    const dayBuckets = Array.from({ length: 7 }, () => new Set<string>());
    for (const log of monthLogs) {
      const completedAt = log.completed_at ?? log.created_at;
      const dayKey = completedAt.slice(0, 10);
      dayBuckets[log.day_index]?.add(`${log.user_id}|${dayKey}`);
    }
    const workoutsPerDay = DAY_LABELS.map((label, idx) => ({
      day: label,
      count: dayBuckets[idx].size,
    }));

    // Most active users this month — count distinct workout days, not raw rows.
    const perUser = new Map<string, Set<string>>();
    for (const log of monthLogs) {
      const completedAt = log.completed_at ?? log.created_at;
      const dayKey = completedAt.slice(0, 10);
      if (!perUser.has(log.user_id)) perUser.set(log.user_id, new Set());
      perUser.get(log.user_id)!.add(dayKey);
    }
    const nameByUser = new Map(profiles.map((p) => [p.user_id, p]));
    const topUsers = [...perUser.entries()]
      .map(([userId, days]) => {
        const profile = nameByUser.get(userId);
        return {
          userId,
          name: profile?.display_name ?? `User ${userId.slice(0, 6)}…`,
          color: profile?.avatar_color ?? "#FF2D87",
          count: days.size,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalUsers,
      workoutsThisMonth,
      retentionPct,
      apiCost,
      apiImports,
      workoutsPerDay,
      topUsers,
    };
  }, [profiles, monthLogs, weekLogs, apiUsage]);

  const budgetPct = Math.min(100, (stats.apiCost / MONTHLY_BUDGET_USD) * 100);
  const overBudget = stats.apiCost > MONTHLY_BUDGET_USD;

  const handleToggle = async (key: FeatureFlagKey, next: boolean) => {
    try {
      await setSetting.mutateAsync({ key, value: next });
      toast({ description: `${key} = ${next ? "on" : "off"}` });
    } catch (e) {
      toast({
        title: "Couldn't update setting",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto lg:max-w-7xl lg:px-8 lg:pb-8">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-5 lg:mb-7"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <h1 className="text-4xl font-display text-foreground lg:text-5xl">Dashboard</h1>
      </motion.div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4 mb-5 lg:mb-6">
        <MetricCard
          icon={Users}
          label="Total users"
          value={String(stats.totalUsers)}
        />
        <MetricCard
          icon={Dumbbell}
          label="Workouts this month"
          value={String(stats.workoutsThisMonth)}
          hint="Exercises completed"
        />
        <MetricCard
          icon={Repeat}
          label="Weekly retention"
          value={`${stats.retentionPct.toFixed(0)}%`}
          hint="Active this week / total users"
        />
        <MetricCard
          icon={DollarSign}
          label="API cost this month"
          value={`$${stats.apiCost.toFixed(2)}`}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-5 lg:mb-6">
        <motion.section
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl border-2 border-border bg-card p-4 lg:p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="font-display text-lg text-foreground">Workouts per day</h3>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.workoutsPerDay}
                margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
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
                  formatter={(value: number) => [`${value}`, "Workouts"]}
                />
                <Bar dataKey="count" fill="#FF4D9E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl border-2 border-border bg-card p-4 lg:p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="font-display text-lg text-foreground">Most active this month</h3>
          </div>
          {stats.topUsers.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">No workouts logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topUsers.map((u, idx) => (
                <li
                  key={u.userId}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg border border-border bg-background"
                >
                  <span className="text-[10px] font-extrabold text-muted-foreground tabular-nums w-4">
                    #{idx + 1}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white shrink-0"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.name.slice(0, 1).toUpperCase()}
                  </div>
                  <p className="text-sm font-bold text-foreground flex-1 truncate">{u.name}</p>
                  <p className="text-[11px] font-bold text-muted-foreground tabular-nums shrink-0">
                    {u.count} day{u.count === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <motion.section
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl border-2 border-border bg-card p-4 lg:p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-primary" />
            <h3 className="font-display text-lg text-foreground">AI usage</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total imports
              </p>
              <p className="font-display text-2xl text-foreground tabular-nums">
                {stats.apiImports}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Est. cost
              </p>
              <p className="font-display text-2xl text-foreground tabular-nums">
                ${stats.apiCost.toFixed(2)}
              </p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Monthly budget
              </p>
              <p className="text-[11px] font-bold text-muted-foreground tabular-nums">
                ${stats.apiCost.toFixed(2)} / ${MONTHLY_BUDGET_USD.toFixed(2)}
              </p>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  overBudget
                    ? "bg-destructive"
                    : budgetPct > 80
                    ? "bg-amber-500"
                    : "bg-primary",
                )}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground font-bold">
              Rate-limit hits: {RATE_LIMIT_HITS_PLACEHOLDER}
            </span>
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl border-2 border-border bg-card p-4 lg:p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-display text-lg text-foreground">Feature controls</h3>
          </div>
          <ul className="space-y-2.5">
            {FEATURE_CONTROLS.map(({ key, label, description, icon: Icon }) => {
              const enabled = flags?.[key] ?? true;
              return (
                <li
                  key={key}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background"
                >
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(next) => handleToggle(key, next)}
                    disabled={setSetting.isPending}
                    aria-label={`Toggle ${label}`}
                  />
                </li>
              );
            })}
          </ul>
          <p className="text-[10px] font-bold text-muted-foreground mt-3">
            Changes apply to all users within ~30 seconds.
          </p>
        </motion.section>
      </div>

      <div className="mt-5 lg:mt-6">
        <AdminUsersTable />
      </div>
    </div>
  );
};

export default Dashboard;
