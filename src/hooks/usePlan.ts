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
  weekdayIndex,
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

// Save the plan: write the member_plans header, project the chosen days into
// user_workout_plans (the existing per-day JSONB that This Week reads), and set
// the numeric training_days + plan_type so the overlay blanks rest days.
export const useSaveMemberPlan = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SaveMemberPlanInput) => {
      const uid = user!.id;
      const todayIso = new Date().toISOString().slice(0, 10);

      // 1) member_plans header
      const { error: mpErr } = await supabase.from("member_plans" as any).upsert(
        {
          user_id: uid,
          source: input.source,
          days_per_week: input.daysPerWeek,
          training_days: input.trainingDays,
          base_mode: input.baseMode,
          started_at: todayIso,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id" },
      );
      if (mpErr) throw mpErr;

      // 2) project into user_workout_plans. Clear the member's non-travel day
      // rows (day_index < 100 preserves travel days), then insert training days.
      const writes = buildPlanDayWrites(input.trainingDays, input.days);
      await supabase.from("user_workout_plans" as any).delete().eq("user_id", uid).lt("day_index", 100);
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
        const { error: wpErr } = await supabase.from("user_workout_plans" as any).insert(rows as any);
        if (wpErr) throw wpErr;
      }

      // 3) preferences: numeric training_days + start date, and plan_type.
      const trainingIdx = input.trainingDays.map(weekdayIndex).sort((a, b) => a - b);
      await supabase.from("user_preferences" as any).upsert(
        { user_id: uid, training_days: trainingIdx, frequency: input.daysPerWeek, start_date: todayIso } as any,
        { onConflict: "user_id" },
      );
      await supabase.from("user_preferences" as any).upsert(
        { user_id: uid, plan_type: "custom" } as any,
        { onConflict: "user_id" },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-plan"] });
      queryClient.invalidateQueries({ queryKey: ["personal-workout-plan"] });
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["plan-type"] });
    },
  });
};
