import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Music, Zap, Sparkles, UtensilsCrossed, Check, ExternalLink } from "lucide-react";
import { useMyCurrentWeekReward, useSetReward } from "@/hooks/useRewards";
import { useCurrentWeekStart } from "@/hooks/useWorkouts";
import { useMyTeam } from "@/hooks/useTeams";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const WEEK_REWARDS = [
  {
    week: 1, icon: Music, label: "Starting Song", type: "song", emoji: "🎵",
    description: "Choose the Starting Song of the Week for your workout playlist.",
    fields: [
      { key: "song_title", label: "Song Title", placeholder: "e.g. Titanium", required: true },
      { key: "artist", label: "Artist", placeholder: "e.g. David Guetta ft. Sia" },
      { key: "link", label: "Spotify / YouTube Link", placeholder: "https://..." },
    ],
  },
  {
    week: 2, icon: Zap, label: "Mini Challenge", type: "challenge", emoji: "⚡",
    description: "Create your own mini challenge for the week!",
    fields: [
      { key: "challenge_title", label: "Challenge Title", placeholder: "e.g. 60 Second Plank", required: true },
      { key: "description", label: "Description", placeholder: "Hold a plank for 60 seconds after every workout", isTextarea: true },
      { key: "target", label: "Target", placeholder: "e.g. 5 times this week" },
    ],
  },
  {
    week: 3, icon: Sparkles, label: "Recovery Ritual", type: "recovery", emoji: "🧘",
    description: "Choose your Sunday recovery ritual.",
    fields: [
      { key: "ritual", label: "Recovery Ritual", placeholder: "e.g. 10 minute stretch + breathwork", required: true },
      { key: "description", label: "Notes", placeholder: "Any details about your ritual", isTextarea: true },
    ],
  },
  {
    week: 4, icon: UtensilsCrossed, label: "Fancy Dinner", type: "dinner", emoji: "🍽️",
    description: "Reached your monthly goal? Unlock your celebration reward!",
    fields: [
      { key: "restaurant", label: "Restaurant Name", placeholder: "e.g. The Italian Place" },
      { key: "note", label: "Celebration Note", placeholder: "How are you celebrating?", isTextarea: true },
    ],
  },
];

const Rewards = () => {
  const { user } = useAuth();
  const { data: currentReward } = useMyCurrentWeekReward();
  const { data: team } = useMyTeam();
  const weekStart = useCurrentWeekStart();
  const setReward = useSetReward();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const weekOfYear = Math.ceil(
    (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const currentWeekNumber = ((weekOfYear - 1) % 4) + 1;
  const currentRewardDef = WEEK_REWARDS[currentWeekNumber - 1];

  const handleSetReward = async () => {
    const mainField = currentRewardDef.fields[0];
    const mainValue = formData[mainField.key]?.trim();
    if (!mainValue) {
      toast({ title: "Please fill in the required field", variant: "destructive" });
      return;
    }

    try {
      await setReward.mutateAsync({
        weekStart,
        weekNumber: currentWeekNumber,
        rewardType: currentRewardDef.type,
        rewardValue: mainValue,
        rewardDetails: formData,
      });
      setFormData({});
      setIsEditing(false);
      toast({ title: "Reward set! ✨🎉" });
    } catch {
      toast({ title: "Error", description: "Could not set reward", variant: "destructive" });
    }
  };

  const hasReward = !!currentReward;
  const rewardDetails = (currentReward as any)?.reward_details || {};

  if (!team) {
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto text-center">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="text-4xl font-display text-foreground mb-4">
            <Gift className="inline w-8 h-8 text-primary mr-2" />
            Weekly Rewards
          </h1>
          <p className="text-muted-foreground font-bold">Join a team first to set your weekly rewards!</p>
          <p className="text-sm text-muted-foreground mt-2">Go to the Team tab to create or join a team.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-6">
        <h1 className="text-4xl font-display text-foreground">
          <Gift className="inline w-8 h-8 text-primary mr-2" />
          Weekly Rewards
        </h1>
        <p className="text-xs font-bold text-muted-foreground mt-1">Choose your personal reward each week ✨</p>
      </motion.div>

      {/* Current Week Reward Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6 p-5 rounded-2xl comic-border bg-gradient-to-br from-primary/10 via-card to-accent/10"
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
        <p className="text-sm text-muted-foreground font-semibold mb-4">{currentRewardDef.description}</p>

        {hasReward && !isEditing ? (
          <div className="p-4 rounded-xl bg-secondary/10 border-2 border-secondary">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-secondary" />
              <p className="text-xs font-bold text-secondary uppercase">Your Reward is Set!</p>
            </div>
            
            {currentRewardDef.type === "song" && (
              <div>
                <p className="font-extrabold text-foreground text-lg">{rewardDetails.song_title || currentReward.reward_value}</p>
                {rewardDetails.artist && <p className="text-sm text-muted-foreground font-bold">by {rewardDetails.artist}</p>}
                {rewardDetails.link && (
                  <a href={rewardDetails.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary font-bold mt-1 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Open link
                  </a>
                )}
              </div>
            )}
            {currentRewardDef.type === "challenge" && (
              <div>
                <p className="font-extrabold text-foreground text-lg">{rewardDetails.challenge_title || currentReward.reward_value}</p>
                {rewardDetails.description && <p className="text-sm text-muted-foreground mt-1">{rewardDetails.description}</p>}
                {rewardDetails.target && <p className="text-xs font-bold text-primary mt-1">🎯 {rewardDetails.target}</p>}
              </div>
            )}
            {currentRewardDef.type === "recovery" && (
              <div>
                <p className="font-extrabold text-foreground text-lg">{rewardDetails.ritual || currentReward.reward_value}</p>
                {rewardDetails.description && <p className="text-sm text-muted-foreground mt-1">{rewardDetails.description}</p>}
              </div>
            )}
            {currentRewardDef.type === "dinner" && (
              <div>
                <p className="font-extrabold text-foreground text-lg">🎉 Fancy Dinner Unlocked!</p>
                {rewardDetails.restaurant && <p className="text-sm font-bold text-foreground mt-1">📍 {rewardDetails.restaurant}</p>}
                {rewardDetails.note && <p className="text-sm text-muted-foreground mt-1">{rewardDetails.note}</p>}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFormData(rewardDetails);
                setIsEditing(true);
              }}
              className="mt-3 text-xs text-primary font-bold"
            >
              Edit Reward ✏️
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-bold text-primary">
              {isEditing ? "✏️ Edit your reward:" : "🌟 Choose your reward:"}
            </p>
            {currentRewardDef.fields.map((field: any) => (
              <div key={field.key}>
                <label className="text-xs font-bold text-muted-foreground uppercase">{field.label}{field.required && " *"}</label>
                {field.isTextarea ? (
                  <Textarea
                    placeholder={field.placeholder}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="mt-1 border-2 border-primary/20 text-sm"
                    rows={2}
                  />
                ) : (
                  <Input
                    placeholder={field.placeholder}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="mt-1 border-2 border-primary/20"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                onClick={handleSetReward}
                disabled={setReward.isPending}
                className="flex-1 gradient-primary text-primary-foreground font-bold"
              >
                {setReward.isPending ? "Saving..." : isEditing ? "Update ✨" : "Set Reward ✨"}
              </Button>
              {isEditing && (
                <Button variant="outline" onClick={() => { setIsEditing(false); setFormData({}); }}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Reward Cycle Grid */}
      <h2 className="font-display text-2xl text-foreground mb-3">Monthly Reward Cycle</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {WEEK_REWARDS.map((reward, i) => {
          const isActive = i + 1 === currentWeekNumber;
          const isPast = i + 1 < currentWeekNumber;
          return (
            <motion.div
              key={reward.week}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "p-4 rounded-xl border-2 transition-all",
                isActive
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : isPast
                  ? "border-secondary/40 bg-secondary/5"
                  : "border-border bg-card"
              )}
            >
              <div className="text-2xl mb-2">{reward.emoji}</div>
              <p className="text-xs font-bold text-muted-foreground">Week {reward.week}</p>
              <p className="font-bold text-sm text-foreground">{reward.label}</p>
              <p className={cn(
                "text-[10px] font-bold uppercase mt-1",
                isActive ? "text-primary" : isPast ? "text-secondary" : "text-muted-foreground"
              )}>
                {isActive ? "Current" : isPast ? "Done" : "Upcoming"}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Rewards;
