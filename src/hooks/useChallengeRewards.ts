import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, addWeeks, format } from "date-fns";

export interface ChallengeReward {
  id: string;
  challenge_id: string;
  user_id: string;
  chosen_by: string | null;
  week_number: number;
  reward_type: string;
  reward_value: string | null;
  photo_url: string | null;
  unlocked: boolean;
  completed_at: string | null;
}

export const DEFAULT_REWARDS = [
  {
    week: 1,
    type: "song",
    title: "Starting Song",
    description: "Pick a song that becomes your starting workout anthem 🎵",
    emoji: "🎵",
    color: "from-pink-500/20 to-purple-500/20",
    borderColor: "border-pink-500/30",
  },
  {
    week: 2,
    type: "outfit",
    title: "Outfit Challenge",
    description: "Rock a fun outfit during your workout and snap a photo 👗",
    emoji: "👗",
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30",
  },
  {
    week: 3,
    type: "brunch",
    title: "Team Brunch",
    description: "You earned it! Meet your team for brunch or coffee ☕",
    emoji: "🥂",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
  },
];

/** Fetch rewards for a challenge (shared across all participants) */
export const useChallengeRewards = (challengeId: string | null) => {
  return useQuery({
    queryKey: ["challenge-rewards", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_rewards" as any)
        .select("*")
        .eq("challenge_id", challengeId!)
        .order("week_number");
      if (error) throw error;
      return data as unknown as ChallengeReward[];
    },
    enabled: !!challengeId,
  });
};

/**
 * Get the real-time winner for a specific challenge week.
 * Maps challenge week number to calendar week_start, then finds the
 * highest scorer among challenge participants for that week.
 */
/** Returns all tied winner IDs (array) for shared reward support */
export const useWeeklyWinners = (
  challengeId: string | null,
  challengeStartDate: string | null,
  challengeWeek: number
) => {
  return useQuery({
    queryKey: ["weekly-winner", challengeId, challengeWeek],
    queryFn: async () => {
      const challengeStart = new Date(challengeStartDate! + "T00:00:00");
      const weekDate = addWeeks(
        startOfWeek(challengeStart, { weekStartsOn: 1 }),
        challengeWeek - 1
      );
      const weekStart = format(weekDate, "yyyy-MM-dd");

      const { data: participants, error: pErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("challenge_id", challengeId!);
      if (pErr) throw pErr;
      if (!participants?.length) return [];

      const userIds = participants.map((p) => p.user_id);

      // Get all scores for this week among participants
      const { data: scores, error: sErr } = await supabase
        .from("weekly_scores")
        .select("user_id, points")
        .eq("week_start", weekStart)
        .in("user_id", userIds)
        .order("points", { ascending: false });
      if (sErr) throw sErr;

      if (!scores?.length || scores[0].points === 0) return [];

      // Return all users tied at the top score
      const topPoints = scores[0].points;
      return scores.filter((s) => s.points === topPoints).map((s) => s.user_id as string);
    },
    enabled: !!challengeId && !!challengeStartDate && challengeWeek > 0,
    refetchInterval: 30000,
  });
};

/** Set or update a reward (only the winner can do this) */
export const useSetReward = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      challengeId,
      weekNumber,
      rewardType,
      rewardValue,
    }: {
      challengeId: string;
      weekNumber: number;
      rewardType: string;
      rewardValue: string;
    }) => {
      const { data, error } = await supabase
        .from("challenge_rewards" as any)
        .upsert(
          {
            challenge_id: challengeId,
            user_id: user!.id,
            chosen_by: user!.id,
            week_number: weekNumber,
            reward_type: rewardType,
            reward_value: rewardValue,
            unlocked: true,
            completed_at: new Date().toISOString(),
          } as any,
          { onConflict: "challenge_id,week_number" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-rewards"] });
    },
  });
};

export const useUpdateRewardPhoto = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      challengeId,
      weekNumber,
      file,
    }: {
      challengeId: string;
      weekNumber: number;
      file: File;
    }) => {
      const filePath = `${user!.id}/${challengeId}-week${weekNumber}-${Date.now()}.${file.name.split(".").pop()}`;

      const { error: uploadErr } = await supabase.storage
        .from("reward-photos")
        .upload(filePath, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("reward-photos")
        .getPublicUrl(filePath);

      const { error: updateErr } = await supabase
        .from("challenge_rewards" as any)
        .update({ photo_url: urlData.publicUrl } as any)
        .eq("challenge_id", challengeId)
        .eq("week_number", weekNumber);
      if (updateErr) throw updateErr;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-rewards"] });
    },
  });
};
