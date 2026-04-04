import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MealVariation } from "./useGeneratedMeals";

export function useSavedMeals() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["saved-meals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_meals")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveMeal = useMutation({
    mutationFn: async ({ meal, mealType }: { meal: MealVariation; mealType: string }) => {
      const { error } = await supabase.from("saved_meals").insert({
        user_id: user!.id,
        meal_type: mealType,
        title: meal.title,
        ingredients: meal.ingredients as any,
        steps: meal.steps as any,
        protein: meal.protein,
        prep_time: meal.prep_time,
        is_favorite: true,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-meals"] }),
  });

  const removeMeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_meals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-meals"] }),
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from("saved_meals")
        .update({ is_favorite: isFavorite })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-meals"] }),
  });

  return { savedMeals: query.data ?? [], isLoading: query.isLoading, saveMeal, removeMeal, toggleFavorite };
}
