import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChallengeReward {
  id: string;
  challenge_id: string;
  user_id: string;
  week_number: number;
  reward_type: string;
  reward_value: string | null;
  photo_url: string | null;
  unlocked: boolean;
  completed_at: string | null;
}

export const REWARD_CONFIG = [
  {
    week: 1,
    type: "song",
    title: "Starting Song",
    subtitle: "Song of the Week",
    description: "Pick a song that becomes your starting workout anthem 🎵",
    emoji: "🎵",
    lockedEmoji: "🔒",
    color: "from-pink-500/20 to-purple-500/20",
    borderColor: "border-pink-500/30",
    accentColor: "text-pink-400",
  },
  {
    week: 2,
    type: "outfit",
    title: "Outfit Challenge",
    subtitle: "Outfit of the Week",
    description: "Rock a fun outfit during your workout and snap a photo 👗",
    emoji: "👗",
    lockedEmoji: "🔒",
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30",
    accentColor: "text-amber-400",
  },
  {
    week: 3,
    type: "brunch",
    title: "Team Brunch",
    subtitle: "Celebration Reward",
    description: "You earned it! Meet your team for brunch or coffee ☕",
    emoji: "🥂",
    lockedEmoji: "🔒",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
    accentColor: "text-emerald-400",
  },
];

export const useChallengeRewards = (challengeId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["challenge-rewards", challengeId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_rewards" as any)
        .select("*")
        .eq("challenge_id", challengeId!)
        .eq("user_id", user!.id)
        .order("week_number");
      if (error) throw error;
      return data as unknown as ChallengeReward[];
    },
    enabled: !!challengeId && !!user,
  });
};

export const useUnlockReward = () => {
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
      rewardValue?: string;
    }) => {
      const { data, error } = await supabase
        .from("challenge_rewards" as any)
        .upsert(
          {
            challenge_id: challengeId,
            user_id: user!.id,
            week_number: weekNumber,
            reward_type: rewardType,
            reward_value: rewardValue || null,
            unlocked: true,
            completed_at: new Date().toISOString(),
          } as any,
          { onConflict: "challenge_id,user_id,week_number" }
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
        .eq("user_id", user!.id)
        .eq("week_number", weekNumber);
      if (updateErr) throw updateErr;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-rewards"] });
    },
  });
};
