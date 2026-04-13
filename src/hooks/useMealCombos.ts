import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MealCombo {
  id: string;
  name: string;
  proteins: string[];
  veggies: string[];
  carbs: string[];
  fats: string[];
  created_at: string;
}

export function useMealCombos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["meal_combos", user?.id];

  const { data: combos = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_combos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MealCombo[];
    },
  });

  const save = useMutation({
    mutationFn: async (combo: { name: string; proteins: string[]; veggies: string[]; carbs: string[]; fats: string[] }) => {
      const { error } = await supabase.from("meal_combos").insert({
        user_id: user!.id,
        ...combo,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_combos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { combos, isLoading, save, remove };
}
