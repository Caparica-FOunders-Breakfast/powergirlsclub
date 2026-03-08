import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Music, Zap, Sparkles, UtensilsCrossed } from "lucide-react";
import { useCurrentReward, useAllRewards, useSetReward } from "@/hooks/useRewards";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useCurrentWeekStart } from "@/hooks/useWorkouts";
import { useMyTeam } from "@/hooks/useTeams";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const WEEK_REWARDS = [
  { week: 1, icon: Music, label: "Starting Song", type: "song", emoji: "🎵", description: "Choose the Starting Song of the Week for the shared workout playlist." },
  { week: 2, icon: Zap, label: "Mini Challenge", type: "challenge", emoji: "⚡", description: "Assign a Mini Challenge for the group." },
  { week: 3, icon: Sparkles, label: "Recovery Ritual", type: "recovery", emoji: "🧘", description: "Choose the Sunday Recovery Ritual." },
  { week: 4, icon: UtensilsCrossed, label: "Fancy Dinner", type: "dinner", emoji: "🍽️", description: "Everyone who reaches the goal unlocks a Fancy Dinner Celebration!" },
];

const Rewards = () => {
  const { user } = useAuth();
  const { data: currentReward } = useCurrentReward();
  const { data: allRewards } = useAllRewards();
  const { data: scores } = useLeaderboard();
  const { data: team } = useMyTeam();
  const weekStart = useCurrentWeekStart();
  const setReward = useSetReward();
  const { toast } = useToast();

  const [rewardValue, setRewardValue] = useState("");

  const weekOfYear = Math.ceil(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const currentWeekNumber = ((weekOfYear - 1) % 4) + 1;
  const currentRewardDef = WEEK_REWARDS[currentWeekNumber - 1];

  const isWinner = scores && scores.length > 0 && scores[0].user_id === user?.id && scores[0].points > 0;

  const handleSetReward = async () => {
    if (!rewardValue.trim()) return;
    try {
      await setReward.mutateAsync({
        weekStart,
        weekNumber: currentWeekNumber,
        rewardType: currentRewardDef.type,
        rewardValue: rewardValue.trim(),
      });
      setRewardValue("");
      toast({ title: "Reward set! ⚡✨" });
    } catch {
      toast({ title: "Error", description: "Could not set reward", variant: "destructive" });
    }
  };

  if (!team) {
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto text-center">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="text-4xl font-display text-foreground mb-4">
            <Gift className="inline w-8 h-8 text-neon-pink mr-2" />
            Weekly Rewards
          </h1>
          <p className="text-muted-foreground font-bold">You need to be assigned to a team first.</p>
          <p className="text-sm text-muted-foreground mt-2">Ask an admin to add you to a team in the Teams page.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-6">
        <h1 className="text-4xl font-display text-foreground">
          <Gift className="inline w-8 h-8 text-neon-pink mr-2" />
          Weekly Rewards
        </h1>
        <p className="text-xs font-bold text-muted-foreground mt-1">Team: {team.name}</p>
      </motion.div>

      {/* Current Week Reward */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6 p-5 rounded-2xl comic-border bg-gradient-to-br from-neon-pink/10 via-card to-neon-yellow/10"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
            {currentRewardDef.emoji}
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">Week {currentWeekNumber} Reward</p>
            <p className="font-display text-xl text-foreground">{currentRewardDef.label}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground font-semibold">{currentRewardDef.description}</p>

        {currentReward ? (
          <div className="mt-4 p-3 rounded-xl bg-secondary/10 border-2 border-secondary">
            <p className="text-xs font-bold text-muted-foreground uppercase">Active Reward</p>
            <p className="font-extrabold text-foreground text-lg">{currentReward.reward_value}</p>
            <p className="text-xs text-muted-foreground mt-1">Set by {currentReward.chooser_name}</p>
          </div>
        ) : isWinner ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-bold text-primary">👑 You're the winner! Set this week's reward:</p>
            {currentWeekNumber < 4 ? (
              <div className="flex gap-2">
                <Input
                  placeholder={
                    currentWeekNumber === 1 ? "Song name / link" :
                    currentWeekNumber === 2 ? "Mini challenge description" :
                    "Recovery ritual"
                  }
                  value={rewardValue}
                  onChange={(e) => setRewardValue(e.target.value)}
                  className="border-2 border-primary/30"
                />
                <Button onClick={handleSetReward} className="gradient-primary text-primary-foreground font-bold px-6">
                  Set! ⚡
                </Button>
              </div>
            ) : (
              <p className="text-sm font-bold text-neon-teal">🎉 Victory Week! Dinner celebration unlocked!</p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm font-bold text-muted-foreground">
            Win this week to unlock the reward! 🏆
          </p>
        )}
      </motion.div>

      {/* Reward Cycle */}
      <h2 className="font-display text-2xl text-foreground mb-3">Reward Cycle</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {WEEK_REWARDS.map((reward, i) => {
          const isActive = i + 1 === currentWeekNumber;
          return (
            <motion.div
              key={reward.week}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`p-3 rounded-xl border-2 ${isActive ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="text-xl mb-1">{reward.emoji}</div>
              <p className="text-xs font-bold text-muted-foreground">Week {reward.week}</p>
              <p className="font-bold text-sm text-foreground">{reward.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Past rewards */}
      {allRewards && allRewards.length > 0 && (
        <>
          <h2 className="font-display text-2xl text-foreground mb-3">Past Rewards</h2>
          <div className="space-y-2">
            {allRewards.map((r: any) => (
              <div key={r.id} className="p-3 rounded-xl bg-card border border-border">
                <p className="text-xs text-muted-foreground font-bold">{r.week_start} • Week {r.week_number}</p>
                <p className="font-bold text-foreground">{r.reward_value}</p>
                <p className="text-xs text-muted-foreground">by {r.chooser_name}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Rewards;
