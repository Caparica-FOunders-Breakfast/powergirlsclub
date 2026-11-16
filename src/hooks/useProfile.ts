import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;

      // No profile row yet (the sign-up trigger didn't create one, or hasn't
      // yet). `.single()` used to 406 here, and the app fell back to "Power
      // Girl" and initials from the email. Create it with the first name typed
      // at sign-up (stored in the auth user's metadata).
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .upsert({ user_id: user!.id, display_name: signUpFirstName(user) } as any, { onConflict: "user_id", ignoreDuplicates: true })
        .select("*")
        .maybeSingle();
      if (insertError) throw insertError;
      if (created) return created;
      // Lost a race with the trigger: read the row it made.
      const { data: again, error: againError } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (againError) throw againError;
      return again;
    },
    enabled: !!user,
  });
};

/** The first name typed at sign-up (auth metadata), trimmed; "" if none. */
export const signUpFirstName = (user: { user_metadata?: Record<string, unknown> } | null | undefined): string => {
  const raw = user?.user_metadata?.display_name ?? user?.user_metadata?.first_name;
  return typeof raw === "string" ? raw.trim() : "";
};

export const useAllProfiles = () => {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: { display_name?: string; avatar_color?: string; challenge_start?: string | null; challenge_end?: string | null; body_weight?: number | null }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
};

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.role ?? "member";
    },
    enabled: !!user,
  });
};
