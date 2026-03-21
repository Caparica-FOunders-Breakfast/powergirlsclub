import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useScorecardVisibility = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: hiddenExercises = [], isLoading } = useQuery({
    queryKey: ["scorecard-hidden", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scorecard_hidden_exercises" as any)
        .select("exercise_name")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data as any[]).map((r) => r.exercise_name as string);
    },
    enabled: !!user,
  });

  const hideExercise = useMutation({
    mutationFn: async (exerciseName: string) => {
      const { error } = await supabase
        .from("scorecard_hidden_exercises" as any)
        .insert({ user_id: user!.id, exercise_name: exerciseName } as any);
      if (error) throw error;
    },
    onMutate: async (exerciseName) => {
      await queryClient.cancelQueries({ queryKey: ["scorecard-hidden", user?.id] });
      const prev = queryClient.getQueryData<string[]>(["scorecard-hidden", user?.id]) || [];
      queryClient.setQueryData(["scorecard-hidden", user?.id], [...prev, exerciseName]);
      return { prev };
    },
    onError: (_err, _name, context) => {
      if (context?.prev) queryClient.setQueryData(["scorecard-hidden", user?.id], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["scorecard-hidden", user?.id] }),
  });

  const unhideExercise = useMutation({
    mutationFn: async (exerciseName: string) => {
      const { error } = await supabase
        .from("scorecard_hidden_exercises" as any)
        .delete()
        .eq("user_id", user!.id)
        .eq("exercise_name", exerciseName);
      if (error) throw error;
    },
    onMutate: async (exerciseName) => {
      await queryClient.cancelQueries({ queryKey: ["scorecard-hidden", user?.id] });
      const prev = queryClient.getQueryData<string[]>(["scorecard-hidden", user?.id]) || [];
      queryClient.setQueryData(["scorecard-hidden", user?.id], prev.filter((n) => n !== exerciseName));
      return { prev };
    },
    onError: (_err, _name, context) => {
      if (context?.prev) queryClient.setQueryData(["scorecard-hidden", user?.id], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["scorecard-hidden", user?.id] }),
  });

  return { hiddenExercises, isLoading, hideExercise, unhideExercise };
};
