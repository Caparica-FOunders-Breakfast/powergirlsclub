import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, Music, Shirt, Coffee, Upload, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import {
  REWARD_CONFIG,
  useChallengeRewards,
  useUnlockReward,
  useUpdateRewardPhoto,
  type ChallengeReward,
} from "@/hooks/useChallengeRewards";

interface RewardJourneyProps {
  challengeId: string;
  currentWeek: number;
  status: "upcoming" | "active" | "completed";
}

const WEEK_ICONS = [Music, Shirt, Coffee];

const RewardJourney = ({ challengeId, currentWeek, status }: RewardJourneyProps) => {
  const { data: rewards } = useChallengeRewards(challengeId);
  const unlockReward = useUnlockReward();
  const updatePhoto = useUpdateRewardPhoto();
  const { toast } = useToast();

  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [songInput, setSongInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getReward = (week: number): ChallengeReward | undefined =>
    rewards?.find((r) => r.week_number === week);

  const isWeekUnlocked = (week: number): boolean => {
    if (status === "completed") return true;
    return currentWeek >= week;
  };

  const handleUnlockSong = async () => {
    if (!songInput.trim()) return;
    try {
      await unlockReward.mutateAsync({
        challengeId,
        weekNumber: 1,
        rewardType: "song",
        rewardValue: songInput.trim(),
      });
      setSongInput("");
      setExpandedWeek(null);
      confetti({ particleCount: 60, spread: 60, colors: ["#FF2D87", "#A855F7", "#5271FF"] });
      toast({ title: "🎵 Song of the Week set!" });
    } catch {
      toast({ title: "Error saving song", variant: "destructive" });
    }
  };

  const handleUnlockOutfit = async () => {
    try {
      await unlockReward.mutateAsync({
        challengeId,
        weekNumber: 2,
        rewardType: "outfit",
      });
      confetti({ particleCount: 60, spread: 60, colors: ["#FFE600", "#FF6B35", "#FF2D87"] });
      toast({ title: "👗 Outfit challenge activated!" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await updatePhoto.mutateAsync({ challengeId, weekNumber: 2, file });
      toast({ title: "📸 Photo uploaded!" });
    } catch {
      toast({ title: "Error uploading photo", variant: "destructive" });
    }
  };

  const handleUnlockBrunch = async () => {
    try {
      await unlockReward.mutateAsync({
        challengeId,
        weekNumber: 3,
        rewardType: "brunch",
        rewardValue: "Team Brunch unlocked!",
      });
      confetti({ particleCount: 100, spread: 80, colors: ["#00F5D4", "#FFE600", "#FF2D87"] });
      toast({ title: "🥂 Team Brunch unlocked!" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-foreground flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" /> Reward Journey
      </h3>

      {/* Progress line */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border z-0" />
        <div
          className="absolute left-6 top-8 w-0.5 gradient-primary z-10 transition-all duration-700"
          style={{
            height: `${Math.min(100, Math.max(0, ((Math.min(currentWeek, 4) - 1) / 2) * 100))}%`,
            maxHeight: "calc(100% - 4rem)",
          }}
        />

        <div className="relative z-20 space-y-4">
          {REWARD_CONFIG.map((config, idx) => {
            const reward = getReward(config.week);
            const unlocked = isWeekUnlocked(config.week);
            const completed = reward?.unlocked === true;
            const isExpanded = expandedWeek === config.week;
            const Icon = WEEK_ICONS[idx];
            const isCurrent = currentWeek === config.week && status === "active";

            return (
              <motion.div
                key={config.week}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                {/* Node button */}
                <button
                  onClick={() => unlocked ? setExpandedWeek(isExpanded ? null : config.week) : null}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                    unlocked ? "hover:bg-muted/50 cursor-pointer" : "opacity-50 cursor-not-allowed",
                    isCurrent && "ring-2 ring-primary/30",
                    completed && "bg-secondary/5"
                  )}
                >
                  {/* Circle node */}
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
                    {completed ? (
                      <Check className="w-5 h-5" />
                    ) : unlocked ? (
                      <span>{config.emoji}</span>
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase text-muted-foreground">
                        Week {config.week}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                          Current
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "font-extrabold text-sm",
                      completed ? "text-secondary" : unlocked ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {config.title}
                    </p>
                    {completed && reward?.reward_value && (
                      <p className="text-xs text-muted-foreground font-bold truncate">
                        {reward.reward_value}
                      </p>
                    )}
                  </div>

                  {unlocked && (
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  )}
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && unlocked && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={cn(
                        "ml-[3.75rem] mt-1 p-4 rounded-xl border bg-gradient-to-br",
                        config.color,
                        config.borderColor
                      )}>
                        <p className="text-xs text-muted-foreground font-bold mb-3">
                          {config.description}
                        </p>

                        {/* Week 1 — Song */}
                        {config.week === 1 && !completed && (
                          <div className="space-y-2">
                            <Input
                              value={songInput}
                              onChange={(e) => setSongInput(e.target.value)}
                              placeholder="e.g. Eye of the Tiger"
                              className="border-primary/20 font-bold text-sm"
                            />
                            <Button
                              onClick={handleUnlockSong}
                              disabled={!songInput.trim() || unlockReward.isPending}
                              className="w-full gradient-primary text-primary-foreground font-bold text-sm"
                            >
                              <Music className="w-4 h-4 mr-1" />
                              {unlockReward.isPending ? "Saving..." : "Set My Song 🎵"}
                            </Button>
                          </div>
                        )}
                        {config.week === 1 && completed && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                            <Music className="w-5 h-5 text-pink-400 shrink-0" />
                            <span className="font-extrabold text-foreground">{reward?.reward_value}</span>
                          </div>
                        )}

                        {/* Week 2 — Outfit */}
                        {config.week === 2 && !completed && (
                          <Button
                            onClick={handleUnlockOutfit}
                            disabled={unlockReward.isPending}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm"
                          >
                            <Shirt className="w-4 h-4 mr-1" />
                            {unlockReward.isPending ? "Activating..." : "Accept Challenge 👗"}
                          </Button>
                        )}
                        {config.week === 2 && completed && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                              <Check className="w-5 h-5 text-secondary shrink-0" />
                              <span className="font-bold text-foreground text-sm">Challenge accepted!</span>
                            </div>
                            {reward?.photo_url ? (
                              <div className="rounded-lg overflow-hidden border">
                                <img
                                  src={reward.photo_url}
                                  alt="Outfit photo"
                                  className="w-full h-48 object-cover"
                                />
                              </div>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={handlePhotoUpload}
                                  accept="image/*"
                                  className="hidden"
                                />
                                <Button
                                  variant="outline"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={updatePhoto.isPending}
                                  className="w-full border-dashed border-2 border-amber-500/30 text-amber-500 font-bold text-sm"
                                >
                                  <Upload className="w-4 h-4 mr-1" />
                                  {updatePhoto.isPending ? "Uploading..." : "Upload Outfit Photo (optional)"}
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Week 3 — Brunch */}
                        {config.week === 3 && !completed && (
                          <Button
                            onClick={handleUnlockBrunch}
                            disabled={unlockReward.isPending}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm"
                          >
                            <Coffee className="w-4 h-4 mr-1" />
                            {unlockReward.isPending ? "Unlocking..." : "Claim Brunch Reward 🥂"}
                          </Button>
                        )}
                        {config.week === 3 && completed && (
                          <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50">
                            <span className="text-2xl">🥂</span>
                            <div>
                              <p className="font-extrabold text-foreground text-sm">Brunch Unlocked!</p>
                              <p className="text-xs text-muted-foreground font-bold">
                                Time to celebrate with your team ☕
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RewardJourney;
