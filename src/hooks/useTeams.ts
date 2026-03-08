import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useTeams = () => {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
};

export const useMyTeam = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-team", user?.id],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      if (!profile?.team_id) return null;

      const { data: team, error: teamErr } = await supabase
        .from("teams")
        .select("*")
        .eq("id", profile.team_id)
        .single();
      if (teamErr) throw teamErr;
      return team;
    },
    enabled: !!user,
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
};

export const useAssignTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ team_id: teamId } as any)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
      queryClient.invalidateQueries({ queryKey: ["scores"] });
    },
  });
};
