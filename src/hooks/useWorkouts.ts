import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, format } from "date-fns";

export const useCurrentWeekStart = () => {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
};

export const useWeeklyWorkouts = () => {
  const weekStart = useCurrentWeekStart();

  return useQuery({
    queryKey: ["workouts", weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .eq("week_start", weekStart)
        .order("day_of_week");
      if (error) throw error;
      return data;
    },
  });
};

export const useMyEntries = () => {
  const { user } = useAuth();
  const weekStart = useCurrentWeekStart();

  return useQuery({
    queryKey: ["entries", user?.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_entries")
        .select("*, workouts(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCompleteWorkout = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ workoutId, weights }: { workoutId: string; weights: Record<string, number> }) => {
      const { data, error } = await supabase
        .from("workout_entries")
        .upsert({
          user_id: user!.id,
          workout_id: workoutId,
          completed: true,
          completed_at: new Date().toISOString(),
          weights,
        }, { onConflict: "user_id,workout_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["scores"] });
    },
  });
};

export const useCreateWorkout = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (workout: { week_start: string; day_of_week: number; title: string; exercises: any[] }) => {
      const { data, error } = await supabase
        .from("workouts")
        .insert({ ...workout, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
    },
  });
};
