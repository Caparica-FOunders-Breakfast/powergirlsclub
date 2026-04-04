import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MealPreferences {
  id?: string;
  daily_protein_target: number;
  dietary_preference: string;
  allergies: string[];
  disliked_foods: string[];
  favorite_foods: string[];
  cooking_time: string;
  budget: string;
  num_people: number;
  ingredients_at_home: string[];
}

const defaultPrefs: MealPreferences = {
  daily_protein_target: 120,
  dietary_preference: "omnivore",
  allergies: [],
  disliked_foods: [],
  favorite_foods: [],
  cooking_time: "quick",
  budget: "medium",
  num_people: 1,
  ingredients_at_home: [],
};

export function useMealPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["meal-preferences", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (prefs: MealPreferences) => {
      const { error } = await supabase.from("meal_preferences").upsert(
        { ...prefs, user_id: user!.id },
        { onConflict: "user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meal-preferences"] }),
  });

  const preferences: MealPreferences = query.data
    ? {
        id: query.data.id,
        daily_protein_target: query.data.daily_protein_target,
        dietary_preference: query.data.dietary_preference,
        allergies: query.data.allergies ?? [],
        disliked_foods: query.data.disliked_foods ?? [],
        favorite_foods: query.data.favorite_foods ?? [],
        cooking_time: query.data.cooking_time,
        budget: query.data.budget,
        num_people: query.data.num_people,
        ingredients_at_home: query.data.ingredients_at_home ?? [],
      }
    : defaultPrefs;

  return { preferences, isLoading: query.isLoading, upsert };
}
