import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  type ExerciseRow,
  type MemberPlanRow,
  type PlanDayDraft,
  type PlanSource,
  type BaseMode,
  buildPlanDayWrites,
} from "@/lib/plan";

// ── Exercise library (for swap, custom builder, search) ───────────────────
export const useExerciseLibrary = () =>
  useQuery({
    queryKey: ["exercise-library"],
    queryFn: async (): Promise<ExerciseRow[]> => {
      const { data, error } = await supabase
        .from("exercises" as any)
        .select("id, name, type, muscles, tracking, easier_option, video_url")
        .order("name");
      if (error) return []; // tables not migrated yet → empty library
      return (data ?? []) as unknown as ExerciseRow[];
    },
    staleTime: 1000 * 60 * 30,
  });

// ── Recommended template → wizard draft ───────────────────────────────────
export const useRecommendedPlan = (daysPerWeek: number) =>
  useQuery({
    queryKey: ["recommended-plan", daysPerWeek],
    queryFn: async (): Promise<PlanDayDraft[]> => {
      const { data, error } = await supabase
        .from("plan_templates" as any)
        .select(
          `days_per_week,
           plan_template_days (
             position, name,
             power:exercises ( name, tracking, video_url ),
             plan_template_items (
               position, sets, reps_or_time,
               exercise:exercises ( name, tracking, video_url )
             )
           )`,
        )
        .eq("days_per_week", daysPerWeek)
        .maybeSingle();
      if (error || !data) return [];
      const days = ((data as any).plan_template_days ?? []).slice();
      days.sort((a: any, b: any) => a.position - b.position);
      return days.map((d: any): PlanDayDraft => {
        const items = (d.plan_template_items ?? []).slice().sort((a: any, b: any) => a.position - b.position);
        return {
          name: d.name,
          items: [
            ...(d.power
              ? [{ name: d.power.name, tracking: d.power.tracking, sets: 3, repsOrTime: "5", videoUrl: d.power.video_url, isPower: true }]
              : []),
            ...items.map((it: any) => ({
              name: it.exercise?.name ?? "",
              tracking: it.exercise?.tracking ?? "weights",
              sets: it.sets ?? 3,
              repsOrTime: it.reps_or_time ?? "",
              videoUrl: it.exercise?.video_url ?? null,
            })),
          ],
        };
      });
    },
    staleTime: 1000 * 60 * 30,
  });

// ── Member plan header ────────────────────────────────────────────────────
export const useMemberPlan = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["member-plan", user?.id],
    queryFn: async (): Promise<MemberPlanRow | null> => {
      const { data, error } = await supabase
        .from("member_plans" as any)
        .select("id, user_id, source, days_per_week, training_days, base_mode, started_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) return null; // not migrated yet, or no plan
      return (data as unknown as MemberPlanRow) ?? null;
    },
    enabled: !!user,
  });
};

export interface SaveMemberPlanInput {
  source: PlanSource;
  daysPerWeek: number;
  trainingDays: string[]; // weekday names, e.g. ["Mon","Wed","Fri"]
  baseMode: BaseMode;
  days: PlanDayDraft[]; // one per training day, in order
}

/**
 * Reject if a request doesn't settle in time. Without this, a request that
 * never settles (e.g. the auth lock stalling after an iPhone home-screen app
 * resumes) left plan setup on "Saving..." forever with no error.
 */
const withTimeout = async <T,>(request: PromiseLike<T>, step: string, ms = 20_000): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out while ${step}. Check your connection and try again.`)), ms);
  });
  try {
    return await Promise.race([Promise.resolve(request), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

const check = (res: { error: { message: string } | null }, step: string) => {
  if (res.error) throw new Error(`Couldn't finish ${step}: ${res.error.message}`);
};

// Save the plan: project the chosen days into user_workout_plans (the per-day
// JSONB This Week reads), set the numeric training_days + plan_type so the
// overlay blanks rest days, then write the member_plans header.
//
// Order matters: new days are upserted before old ones are deleted, and the
// header goes last, so a failure part-way never leaves a member without a plan
// or with a header that doesn't match their days.
export const useSaveMemberPlan = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SaveMemberPlanInput) => {
      const uid = user!.id;
      const todayIso = new Date().toISOString().slice(0, 10);
      const writes = buildPlanDayWrites(input.trainingDays, input.days);
      const trainingIdx = writes.map((w) => w.dayIndex).sort((a, b) => a - b);

      // 1) Write the new training days (replaces those day_index rows).
      if (writes.length) {
        const rows = writes.map((w) => ({
          user_id: uid,
          day_index: w.dayIndex,
          label: w.label,
          emoji: "",
          is_rest: false,
          is_recovery: false,
          exercises: w.exercises,
        }));
        check(await withTimeout(
          supabase.from("user_workout_plans" as never).upsert(rows as never, { onConflict: "user_id,day_index" }),
          "saving your training days",
        ), "saving your training days");
      }

      // 2) Remove the member's other non-travel days (travel rows are >= 100).
      let stale = supabase.from("user_workout_plans" as never).delete().eq("user_id", uid).lt("day_index", 100);
      if (trainingIdx.length) stale = stale.not("day_index", "in", `(${trainingIdx.join(",")})`);
      check(await withTimeout(stale, "clearing your old days"), "clearing your old days");

      // 3) Preferences: numeric training_days + start date, then plan_type.
      check(await withTimeout(
        supabase.from("user_preferences" as never).upsert(
          { user_id: uid, training_days: trainingIdx, frequency: input.daysPerWeek, start_date: todayIso } as never,
          { onConflict: "user_id" },
        ),
        "saving your training days",
      ), "saving your training days");
      check(await withTimeout(
        supabase.from("user_preferences" as never).upsert({ user_id: uid, plan_type: "custom" } as never, { onConflict: "user_id" }),
        "saving your plan type",
      ), "saving your plan type");

      // 4) The member_plans header, last.
      check(await withTimeout(
        supabase.from("member_plans" as never).upsert(
          {
            user_id: uid,
            source: input.source,
            days_per_week: input.daysPerWeek,
            training_days: input.trainingDays,
            base_mode: input.baseMode,
            started_at: todayIso,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "user_id" },
        ),
        "saving your plan",
      ), "saving your plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-plan"] });
      queryClient.invalidateQueries({ queryKey: ["personal-workout-plan"] });
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["plan-type"] });
      queryClient.invalidateQueries({ queryKey: ["prior-exercise-weights"] });
    },
  });
};
