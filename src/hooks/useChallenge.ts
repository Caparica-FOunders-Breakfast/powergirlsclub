import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { addDays, format, differenceInDays } from "date-fns";

export const useActiveChallenge = () => {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ["challenge", profile?.challenge_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges" as any)
        .select("*")
        .eq("id", profile!.challenge_id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!profile?.challenge_id,
  });
};

export const useChallengeParticipants = (challengeId: string | null) => {
  return useQuery({
    queryKey: ["challenge-participants", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("challenge_id", challengeId!);
      if (error) throw error;
      return data;
    },
    enabled: !!challengeId,
  });
};

export const useCreateChallenge = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, startDate }: { name: string; startDate: Date }) => {
      const start = format(startDate, "yyyy-MM-dd");
      const end = format(addDays(startDate, 27), "yyyy-MM-dd");

      // Create the challenge
      const { data: challenge, error: createErr } = await supabase
        .from("challenges" as any)
        .insert({
          name,
          start_date: start,
          end_date: end,
          created_by: user!.id,
        } as any)
        .select()
        .single();
      if (createErr) throw createErr;

      // Join the challenge
      const { error: joinErr } = await supabase
        .from("profiles")
        .update({
          challenge_id: (challenge as any).id,
          challenge_start: start,
          challenge_end: end,
        } as any)
        .eq("user_id", user!.id);
      if (joinErr) throw joinErr;

      return challenge as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
    },
  });
};

export const useJoinChallenge = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      // Find challenge by code
      const { data: challenge, error: findErr } = await supabase
        .from("challenges" as any)
        .select("*")
        .eq("invite_code", inviteCode.trim().toLowerCase())
        .single();
      if (findErr || !challenge) throw new Error("Challenge not found. Check the code and try again.");

      const ch = challenge as any;

      // Join by updating profile
      const { error: joinErr } = await supabase
        .from("profiles")
        .update({
          challenge_id: ch.id,
          challenge_start: ch.start_date,
          challenge_end: ch.end_date,
        } as any)
        .eq("user_id", user!.id);
      if (joinErr) throw joinErr;

      return ch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
    },
  });
};

export const useLeaveChallenge = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          challenge_id: null,
          challenge_start: null,
          challenge_end: null,
        } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
    },
  });
};

export const useDeleteChallenge = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (challengeId: string) => {
      // First remove all participants from the challenge
      const { error: profilesErr } = await supabase
        .from("profiles")
        .update({
          challenge_id: null,
          challenge_start: null,
          challenge_end: null,
        } as any)
        .eq("challenge_id", challengeId);
      if (profilesErr) throw profilesErr;

      // Then delete the challenge itself
      const { error } = await supabase
        .from("challenges" as any)
        .delete()
        .eq("id", challengeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["challenge"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-participants"] });
    },
  });
};

/** Compute challenge week (1-4) and day (1-7) from a challenge start date */
export const useChallengeProgress = (startDate: string | null) => {
  if (!startDate) return null;

  const now = new Date();
  const start = new Date(startDate + "T00:00:00");
  const daysDiff = differenceInDays(now, start);

  if (daysDiff < 0) {
    return { week: 0, day: 0, daysDiff, status: "upcoming" as const, daysUntilStart: Math.abs(daysDiff) };
  }

  if (daysDiff >= 28) {
    return { week: 4, daysDiff, status: "completed" as const, daysUntilStart: 0 };
  }

  const week = Math.floor(daysDiff / 7) + 1;

  return { week, daysDiff, status: "active" as const, daysLeft: 28 - daysDiff };
};
