import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MealPreferences } from "./useMealPreferences";

export interface MealVariation {
  title: string;
  ingredients: { item: string; quantity: string }[];
  steps: string[];
  protein: number;
  prep_time: number;
}

export interface GeneratedPlan {
  meals: {
    breakfast: MealVariation[];
    lunch: MealVariation[];
    dinner: MealVariation[];
    snack: MealVariation[];
  };
  daily_protein_target: number;
  daily_protein_estimate: number;
  protein_tips: string[];
  grocery_list: Record<string, string[]>;
}

export function useGeneratedMeals() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["generated-meal-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_meal_plans")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: async ({ preferences, shuffleMealType }: { preferences: MealPreferences; shuffleMealType?: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-meals", {
        body: { preferences, shuffleMealType },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const plan = data as GeneratedPlan;

      // Upsert into generated_meal_plans
      const { error: dbError } = await supabase.from("generated_meal_plans").upsert(
        {
          user_id: user!.id,
          meals: plan.meals as any,
          grocery_list: plan.grocery_list as any,
          daily_protein_estimate: plan.daily_protein_estimate,
          daily_protein_target: plan.daily_protein_target,
        },
        { onConflict: "user_id" }
      );
      if (dbError) throw dbError;

      return plan;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["generated-meal-plan"] }),
  });

  const plan: GeneratedPlan | null = query.data
    ? {
        meals: query.data.meals as any,
        grocery_list: query.data.grocery_list as any,
        daily_protein_estimate: query.data.daily_protein_estimate,
        daily_protein_target: query.data.daily_protein_target,
        protein_tips: [],
      }
    : null;

  return { plan, isLoading: query.isLoading, generate };
}
