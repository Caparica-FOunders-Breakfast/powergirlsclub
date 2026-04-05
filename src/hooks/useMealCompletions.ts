import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, format } from "date-fns";

function getCurrentWeekStart() {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function useMealCompletions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const weekStart = getCurrentWeekStart();

  const query = useQuery({
    queryKey: ["meal-completions", user?.id, weekStart],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_completions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("week_start", weekStart);
      if (error) throw error;
      return data;
    },
  });

  const isCompleted = (dayIndex: number, mealIndex: number) => {
    return query.data?.some(
      (c) => c.day_index === dayIndex && c.meal_index === mealIndex && c.completed
    ) ?? false;
  };

  const completedCountForDay = (dayIndex: number) => {
    return query.data?.filter(
      (c) => c.day_index === dayIndex && c.completed
    ).length ?? 0;
  };

  const toggle = useMutation({
    mutationFn: async ({ dayIndex, mealIndex }: { dayIndex: number; mealIndex: number }) => {
      const existing = query.data?.find(
        (c) => c.day_index === dayIndex && c.meal_index === mealIndex
      );

      if (existing) {
        const newCompleted = !existing.completed;
        const { error } = await supabase
          .from("meal_completions")
          .update({
            completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("meal_completions")
          .insert({
            user_id: user!.id,
            week_start: weekStart,
            day_index: dayIndex,
            meal_index: mealIndex,
            completed: true,
            completed_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meal-completions"] }),
  });

  return { isCompleted, completedCountForDay, toggle, isLoading: query.isLoading };
}
