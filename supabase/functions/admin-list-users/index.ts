// Supabase Edge Function: admin-list-users
//
// Returns one row per registered user for the admin dashboard, joining
// data from auth.users (email, last_sign_in_at, created_at), profiles,
// user_preferences, user_workout_plans, and exercise_logs.
//
// Auth: the caller must be a real admin (public.has_role(uid, 'admin')).
// Everything past that uses the service role key, which bypasses RLS.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const startOfMonth = () => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

interface UserRow {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    console.error("admin-list-users: missing Supabase env");
    return json({ error: "Server misconfigured" }, 500);
  }

  // 1) Authenticate the caller.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Not authenticated" }, 401);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);
  const callerId = userData.user.id;

  // 2) Confirm admin role via the existing has_role() helper.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: roleCheck, error: roleError } = await admin.rpc("has_role", {
    _user_id: callerId,
    _role: "admin",
  });
  if (roleError) {
    console.error("admin-list-users: has_role rpc failed", roleError);
    return json({ error: "Couldn't verify role" }, 500);
  }
  if (roleCheck !== true) return json({ error: "Forbidden" }, 403);

  // 3) Fetch the joined data set. We pull from auth.users (paginated) and
  // each public table separately, then merge in memory.
  const authUsers: { id: string; email: string | null; last_sign_in_at: string | null; created_at: string }[] = [];
  let page = 1;
  // The supabase-js admin API caps perPage at 1000; iterate until we get a
  // short page. Realistic user counts are well under this, but be safe.
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("admin-list-users: listUsers failed", error);
      return json({ error: "Couldn't load users" }, 500);
    }
    for (const u of data.users) {
      authUsers.push({
        id: u.id,
        email: u.email ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
      });
    }
    if (data.users.length < 1000) break;
    page += 1;
    if (page > 50) break; // hard guard
  }

  const [profilesRes, prefsRes, plansRes, logsRes] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, display_name, avatar_color, body_weight, team_id, created_at"),
    admin
      .from("user_preferences")
      .select("user_id, training_days, frequency, progress_goal, start_date"),
    admin.from("user_workout_plans").select("user_id"),
    admin
      .from("exercise_logs")
      .select("user_id, completed, completed_at")
      .eq("completed", true)
      .gte("completed_at", startOfMonth().toISOString()),
  ]);

  for (const res of [profilesRes, prefsRes, plansRes, logsRes]) {
    if (res.error) {
      console.error("admin-list-users: table fetch failed", res.error);
      return json({ error: "Couldn't load dashboard data" }, 500);
    }
  }

  const profilesByUser = new Map<string, any>();
  for (const p of profilesRes.data ?? []) profilesByUser.set(p.user_id, p);

  const prefsByUser = new Map<string, any>();
  for (const p of prefsRes.data ?? []) prefsByUser.set(p.user_id, p);

  const customPlanUsers = new Set<string>();
  for (const p of plansRes.data ?? []) customPlanUsers.add(p.user_id);

  // workouts this month = distinct (user, day) pairs of completed logs.
  const workoutDays = new Map<string, Set<string>>();
  for (const log of logsRes.data ?? []) {
    const day = (log.completed_at ?? "").slice(0, 10);
    if (!day) continue;
    if (!workoutDays.has(log.user_id)) workoutDays.set(log.user_id, new Set());
    workoutDays.get(log.user_id)!.add(day);
  }

  const rows: UserRow[] = authUsers.map((u) => {
    const profile = profilesByUser.get(u.id);
    const prefs = prefsByUser.get(u.id);
    return {
      user_id: u.id,
      email: u.email,
      display_name: profile?.display_name ?? (u.email?.split("@")[0] ?? "Member"),
      avatar_color: profile?.avatar_color ?? "#FF2D87",
      joined_at: u.created_at ?? profile?.created_at ?? null,
      last_active_at: u.last_sign_in_at,
      workouts_this_month: workoutDays.get(u.id)?.size ?? 0,
      training_days_per_week: prefs?.frequency ?? null,
      plan_type: customPlanUsers.has(u.id) ? "custom" : "default",
      body_weight: profile?.body_weight ?? null,
      progress_goal: prefs?.progress_goal ?? null,
      start_date: prefs?.start_date ?? null,
      team_id: profile?.team_id ?? null,
    };
  });

  // Sort by most recently active first.
  rows.sort((a, b) => {
    const av = a.last_active_at ?? a.joined_at ?? "";
    const bv = b.last_active_at ?? b.joined_at ?? "";
    return bv.localeCompare(av);
  });

  return json({ users: rows });
});
