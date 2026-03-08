import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Music, Zap, Sparkles, UtensilsCrossed, Check, ExternalLink, ChevronLeft } from "lucide-react";
import { useMyRewards, useSetReward } from "@/hooks/useRewards";
import { useCurrentWeekStart } from "@/hooks/useWorkouts";
import { useMyTeam } from "@/hooks/useTeams";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { differenceInDays, addDays, format } from "date-fns";

const DAYS_OF_WEEK = [
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
];

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
  const { data: myRewards } = useMyRewards();
  const { data: team } = useMyTeam();
  const { data: profile } = useProfile();
  const weekStart = useCurrentWeekStart();
  const setReward = useSetReward();
  const { toast } = useToast();

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Calculate current week number based on challenge_start from profile
  const currentWeekNumber = (() => {
    if (!profile?.challenge_start) return 1;
    const start = new Date(profile.challenge_start);
    const now = new Date();
    const daysDiff = differenceInDays(now, start);
    if (daysDiff < 0) return 1;
    const weekNum = Math.floor(daysDiff / 7) + 1;
    return ((weekNum - 1) % 4) + 1; // cycle 1-4
  })();

  // Calculate the actual week_start date for each cycle week (1-4) based on challenge_start
  const getCycleWeekStart = (weekNum: number): string => {
    if (!profile?.challenge_start) return weekStart;
    const start = new Date(profile.challenge_start);
    const now = new Date();
    const daysDiff = differenceInDays(now, start);
    if (daysDiff < 0) return weekStart;
    // Find which absolute week we're in, then find the start of the cycle
    const currentAbsoluteWeek = Math.floor(daysDiff / 7); // 0-indexed
    const currentCycleStart = currentAbsoluteWeek - ((currentAbsoluteWeek) % 4); // start of current 4-week cycle
    const targetAbsoluteWeek = currentCycleStart + (weekNum - 1);
    const targetDate = addDays(start, targetAbsoluteWeek * 7);
    return format(targetDate, "yyyy-MM-dd");
  };

  // Build a map of weekNumber -> reward for the current cycle
  const rewardsByWeek = new Map<number, any>();
  myRewards?.forEach((r: any) => {
    // Only match rewards whose week_start matches the current cycle's week_start
    const expectedWeekStart = getCycleWeekStart(r.week_number);
    if (r.week_start === expectedWeekStart && !rewardsByWeek.has(r.week_number)) {
      rewardsByWeek.set(r.week_number, r);
    }
  });

  const selectedRewardDef = selectedWeek !== null ? WEEK_REWARDS[selectedWeek - 1] : null;
  const existingReward = selectedWeek !== null ? rewardsByWeek.get(selectedWeek) : null;
  const existingDetails = existingReward?.reward_details || {};

  // When selecting a week with an existing reward, pre-fill the form
  useEffect(() => {
    if (selectedWeek !== null && existingReward && !isEditing) {
      setFormData(existingDetails);
      setIsEditing(true);
    }
  }, [selectedWeek]);

  const handleSetReward = async () => {
    if (!selectedRewardDef) return;
    const mainField = selectedRewardDef.fields[0];
    const mainValue = formData[mainField.key]?.trim();
    if (!mainValue) {
      toast({ title: "Please fill in the required field", variant: "destructive" });
      return;
    }
    const selectedDays: string[] = formData.scheduled_days ? JSON.parse(formData.scheduled_days) : [];
    if (selectedDays.length === 0) {
      toast({ title: "Please pick at least one day", variant: "destructive" });
      return;
    }

    try {
      await setReward.mutateAsync({
        weekStart,
        weekNumber: selectedWeek!,
        rewardType: selectedRewardDef.type,
        rewardValue: mainValue,
        rewardDetails: formData,
      });
      setFormData({});
      setIsEditing(false);
      setSelectedWeek(null);
      toast({ title: "Reward set! ✨🎉" });
    } catch {
      toast({ title: "Error", description: "Could not set reward", variant: "destructive" });
    }
  };

  const handleBack = () => {
    setSelectedWeek(null);
    setFormData({});
    setIsEditing(false);
  };

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

  // Detail view for a selected week
  if (selectedWeek !== null && selectedRewardDef) {
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 font-bold text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Rewards
          </Button>

          <div className="p-5 rounded-2xl comic-border bg-gradient-to-br from-primary/10 via-card to-accent/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                {selectedRewardDef.emoji}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Week {selectedWeek} Reward</p>
                <p className="font-display text-xl text-foreground">{selectedRewardDef.label}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-semibold mb-4">{selectedRewardDef.description}</p>

            {/* Show existing reward or form */}
            {existingReward && !isEditing ? (
              <div className="p-4 rounded-xl bg-secondary/10 border-2 border-secondary">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-secondary" />
                  <p className="text-xs font-bold text-secondary uppercase">Your Reward is Set!</p>
                </div>

                <RewardDisplay type={selectedRewardDef.type} details={existingDetails} value={existingReward.reward_value} />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFormData(existingDetails);
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
                  {existingReward ? "✏️ Edit your reward:" : "🌟 Choose your reward:"}
                </p>
                {selectedRewardDef.fields.map((field: any) => (
                  <div key={field.key}>
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      {field.label}{field.required && " *"}
                    </label>
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
                {/* Day of week multi-selector */}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Scheduled Days *
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS_OF_WEEK.map((d) => {
                      const selectedDays: string[] = formData.scheduled_days ? JSON.parse(formData.scheduled_days) : [];
                      const isSelected = selectedDays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            const newDays = isSelected
                              ? selectedDays.filter((v) => v !== d.value)
                              : [...selectedDays, d.value];
                            setFormData((prev) => ({ ...prev, scheduled_days: JSON.stringify(newDays) }));
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border hover:border-primary/40"
                          )}
                        >
                          {d.label.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSetReward}
                    disabled={setReward.isPending}
                    className="flex-1 gradient-primary text-primary-foreground font-bold"
                  >
                    {setReward.isPending ? "Saving..." : existingReward ? "Update ✨" : "Set Reward ✨"}
                  </Button>
                  {existingReward && (
                    <Button variant="outline" onClick={() => { setIsEditing(false); setFormData({}); }}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Main grid view
  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-6">
        <h1 className="text-4xl font-display text-foreground">
          <Gift className="inline w-8 h-8 text-primary mr-2" />
          Weekly Rewards
        </h1>
        <p className="text-xs font-bold text-muted-foreground mt-1">Tap any week to set your personal reward ✨</p>
      </motion.div>

      {/* Reward Cycle Grid */}
      <h2 className="font-display text-2xl text-foreground mb-3">Monthly Reward Cycle</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {WEEK_REWARDS.map((reward, i) => {
          const weekNum = i + 1;
          const isCurrent = weekNum === currentWeekNumber;
          const hasReward = rewardsByWeek.has(weekNum);

          return (
            <motion.button
              key={reward.week}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => {
                setSelectedWeek(weekNum);
                setFormData({});
                setIsEditing(false);
              }}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
                isCurrent
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : hasReward
                  ? "border-secondary/40 bg-secondary/5"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{reward.emoji}</span>
                {hasReward && (
                  <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center">
                    <Check className="w-3 h-3 text-secondary-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs font-bold text-muted-foreground">Week {reward.week}</p>
              <p className="font-bold text-sm text-foreground">{reward.label}</p>
              <p className={cn(
                "text-[10px] font-bold uppercase mt-1",
                isCurrent ? "text-primary" : hasReward ? "text-secondary" : "text-muted-foreground"
              )}>
                {isCurrent ? "Current" : hasReward ? "Done ✓" : "Upcoming"}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

function RewardDisplay({ type, details, value }: { type: string; details: Record<string, any>; value: string }) {
  const scheduledDays: string[] = details.scheduled_days ? (typeof details.scheduled_days === "string" ? JSON.parse(details.scheduled_days) : details.scheduled_days) : (details.scheduled_day != null ? [String(details.scheduled_day)] : []);
  const dayLabels = scheduledDays.map((d) => DAYS_OF_WEEK[Number(d)]?.label).filter(Boolean);

  const dayBadge = dayLabels.length > 0 ? (
    <p className="text-xs font-bold text-accent-foreground bg-accent/20 px-2 py-0.5 rounded-full inline-block mt-2">
      📅 {dayLabels.join(", ")}
    </p>
  ) : null;

  if (type === "song") {
    return (
      <div>
        <p className="font-extrabold text-foreground text-lg">{details.song_title || value}</p>
        {details.artist && <p className="text-sm text-muted-foreground font-bold">by {details.artist}</p>}
        {details.link && (
          <a href={details.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary font-bold mt-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> Open link
          </a>
        )}
        {dayBadge}
      </div>
    );
  }
  if (type === "challenge") {
    return (
      <div>
        <p className="font-extrabold text-foreground text-lg">{details.challenge_title || value}</p>
        {details.description && <p className="text-sm text-muted-foreground mt-1">{details.description}</p>}
        {details.target && <p className="text-xs font-bold text-primary mt-1">🎯 {details.target}</p>}
        {dayBadge}
      </div>
    );
  }
  if (type === "recovery") {
    return (
      <div>
        <p className="font-extrabold text-foreground text-lg">{details.ritual || value}</p>
        {details.description && <p className="text-sm text-muted-foreground mt-1">{details.description}</p>}
        {dayBadge}
      </div>
    );
  }
  if (type === "dinner") {
    return (
      <div>
        <p className="font-extrabold text-foreground text-lg">🎉 Fancy Dinner Unlocked!</p>
        {details.restaurant && <p className="text-sm font-bold text-foreground mt-1">📍 {details.restaurant}</p>}
        {details.note && <p className="text-sm text-muted-foreground mt-1">{details.note}</p>}
        {dayBadge}
      </div>
    );
  }
  return <p className="font-bold text-foreground">{value}</p>;
}

export default Rewards;
