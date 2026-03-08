import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, ChevronRight, Sparkles, Upload, Pencil, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import confetti from "canvas-confetti";
import {
  DEFAULT_REWARDS,
  useChallengeRewards,
  useSetReward,
  useUpdateRewardPhoto,
  useWeeklyWinners,
  type ChallengeReward,
} from "@/hooks/useChallengeRewards";

interface RewardJourneyProps {
  challengeId: string;
  challengeStartDate: string;
  currentWeek: number;
  status: "upcoming" | "active" | "completed";
}

const RewardWeekItem = ({
  config,
  idx,
  challengeId,
  challengeStartDate,
  currentWeek,
  status,
  reward,
  expandedWeek,
  setExpandedWeek,
}: {
  config: (typeof DEFAULT_REWARDS)[0];
  idx: number;
  challengeId: string;
  challengeStartDate: string;
  currentWeek: number;
  status: string;
  reward: ChallengeReward | undefined;
  expandedWeek: number | null;
  setExpandedWeek: (w: number | null) => void;
}) => {
  const { user } = useAuth();
  const { data: winnerIds } = useWeeklyWinners(challengeId, challengeStartDate, config.week);
  const setRewardMut = useSetReward();
  const updatePhoto = useUpdateRewardPhoto();
  const { toast } = useToast();

  const [rewardInput, setRewardInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const unlocked = status === "completed" || currentWeek >= config.week;
  const completed = reward?.unlocked === true;
  const isExpanded = expandedWeek === config.week;
  const isCurrent = currentWeek === config.week && status === "active";
  const isWinner = winnerIds?.includes(user?.id ?? "") ?? false;
  const isTiedReward = (winnerIds?.length ?? 0) > 1;
  const isChosenBy = reward?.chosen_by === user?.id;

  const handleSetReward = async () => {
    const value = rewardInput.trim() || config.title;
    try {
      await setRewardMut.mutateAsync({
        challengeId,
        weekNumber: config.week,
        rewardType: config.type,
        rewardValue: value,
      });
      setRewardInput("");
      setIsEditing(false);
      confetti({ particleCount: 60, spread: 60, colors: ["#FF2D87", "#A855F7", "#5271FF"] });
      toast({ title: `🎉 Reward set: ${value}` });
    } catch {
      toast({ title: "Error saving reward", variant: "destructive" });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await updatePhoto.mutateAsync({ challengeId, weekNumber: config.week, file });
      toast({ title: "📸 Photo uploaded!" });
    } catch {
      toast({ title: "Error uploading photo", variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: idx * 0.1 }}
    >
      <button
        onClick={() => (unlocked ? setExpandedWeek(isExpanded ? null : config.week) : null)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
          unlocked ? "hover:bg-muted/50 cursor-pointer" : "opacity-50 cursor-not-allowed",
          isCurrent && "ring-2 ring-primary/30",
          completed && "bg-secondary/5"
        )}
      >
        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 border-2 transition-all",
            completed
              ? "bg-secondary border-secondary text-secondary-foreground"
              : unlocked
              ? "bg-gradient-to-br " + config.color + " " + config.borderColor
              : "bg-muted border-border"
          )}
        >
          {completed ? <Check className="w-5 h-5" /> : unlocked ? <span>{config.emoji}</span> : <Lock className="w-4 h-4 text-muted-foreground" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-muted-foreground">Reward {config.week}</span>
            {isCurrent && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Current</span>
            )}
            {isCurrent && isWinner && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary">
                {isTiedReward ? "🤝 Shared reward!" : "🏆 You're winning!"}
              </span>
            )}
          </div>
          <p className={cn("font-extrabold text-sm", completed ? "text-secondary" : unlocked ? "text-foreground" : "text-muted-foreground")}>
            {completed && reward?.reward_value ? reward.reward_value : config.title}
          </p>
          <p className="text-[10px] text-muted-foreground font-bold">
            Applies to Week {config.week + 1}
          </p>
        </div>

        {unlocked && (
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-90")} />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && unlocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={cn("ml-[3.75rem] mt-1 p-4 rounded-xl border bg-gradient-to-br", config.color, config.borderColor)}>
              <p className="text-xs text-muted-foreground font-bold mb-3">{config.description}</p>

              {/* Not yet set */}
              {!completed && (
                <>
                  {isWinner ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-secondary flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> You're the winner — pick the reward!
                      </p>
                      <Input
                        value={rewardInput}
                        onChange={(e) => setRewardInput(e.target.value)}
                        placeholder={`e.g. ${config.title}`}
                        className="border-primary/20 font-bold text-sm"
                      />
                      <Button
                        onClick={handleSetReward}
                        disabled={setRewardMut.isPending}
                        className="w-full gradient-primary text-primary-foreground font-bold text-sm"
                      >
                        {setRewardMut.isPending ? "Saving..." : `Set Reward ${config.emoji}`}
                      </Button>
                    </div>
                  ) : winnerId ? (
                    <p className="text-xs font-bold text-muted-foreground italic">
                      Waiting for this week's winner to choose the reward...
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-muted-foreground italic">
                      No scores yet — complete workouts to become the winner! 💪
                    </p>
                  )}
                </>
              )}

              {/* Already set */}
              {completed && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                    <span className="text-2xl">{config.emoji}</span>
                    <span className="font-extrabold text-foreground text-sm flex-1">{reward?.reward_value}</span>
                    {isChosenBy && !isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditing(true);
                          setRewardInput(reward?.reward_value || "");
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  {isChosenBy && isEditing && (
                    <div className="space-y-2">
                      <Input
                        value={rewardInput}
                        onChange={(e) => setRewardInput(e.target.value)}
                        placeholder="Update reward..."
                        className="border-primary/20 font-bold text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSetReward}
                          disabled={setRewardMut.isPending}
                          className="flex-1 gradient-primary text-primary-foreground font-bold text-sm"
                        >
                          {setRewardMut.isPending ? "Saving..." : "Update"}
                        </Button>
                        <Button variant="outline" onClick={() => { setIsEditing(false); setRewardInput(""); }} className="font-bold text-sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {config.type === "outfit" && (
                    <>
                      {reward?.photo_url ? (
                        <div className="rounded-lg overflow-hidden border">
                          <img src={reward.photo_url} alt="Outfit photo" className="w-full h-48 object-cover" />
                        </div>
                      ) : (
                        <>
                          <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={updatePhoto.isPending}
                            className="w-full border-dashed border-2 border-amber-500/30 text-amber-500 font-bold text-sm"
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            {updatePhoto.isPending ? "Uploading..." : "Upload Photo (optional)"}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const RewardJourney = ({ challengeId, challengeStartDate, currentWeek, status }: RewardJourneyProps) => {
  const { data: rewards } = useChallengeRewards(challengeId);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const getReward = (week: number): ChallengeReward | undefined => rewards?.find((r) => r.week_number === week);

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-foreground flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" /> Reward Journey
      </h3>
      <p className="text-xs text-muted-foreground font-bold">The week's winner picks the reward for everyone! 🏆</p>

      <div className="relative">
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border z-0" />
        <div
          className="absolute left-6 top-8 w-0.5 gradient-primary z-10 transition-all duration-700"
          style={{
            height: `${Math.min(100, Math.max(0, ((Math.min(currentWeek, 4) - 1) / 2) * 100))}%`,
            maxHeight: "calc(100% - 4rem)",
          }}
        />

        <div className="relative z-20 space-y-4">
          {DEFAULT_REWARDS.map((config, idx) => (
            <RewardWeekItem
              key={config.week}
              config={config}
              idx={idx}
              challengeId={challengeId}
              challengeStartDate={challengeStartDate}
              currentWeek={currentWeek}
              status={status}
              reward={getReward(config.week)}
              expandedWeek={expandedWeek}
              setExpandedWeek={setExpandedWeek}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RewardJourney;
