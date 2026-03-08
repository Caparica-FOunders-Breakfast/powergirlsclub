import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, UserPlus, Copy, Check, Heart, Music, Sparkles, UtensilsCrossed, Gift, ExternalLink, ChevronLeft } from "lucide-react";
import { useTeams, useCreateTeam, useJoinTeamByCode, useMyTeam, useTeamMembers, useAssignTeam } from "@/hooks/useTeams";
import { useAllProfiles, useUserRole, useProfile } from "@/hooks/useProfile";
import { useTeamRewards, useMyRewards, useSetReward } from "@/hooks/useRewards";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useCurrentWeekStart } from "@/hooks/useWorkouts";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const REWARD_EMOJIS: Record<string, string> = {
  song: "🎵",
  recovery: "🧘",
  dinner: "🍽️",
};

const REWARD_LABELS: Record<string, string> = {
  song: "Starting Song",
  recovery: "Recovery Ritual",
  dinner: "Fancy Dinner",
};

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
    week: 2, icon: Sparkles, label: "Recovery Ritual", type: "recovery", emoji: "🧘",
    description: "Choose your Sunday recovery ritual.",
    fields: [
      { key: "ritual", label: "Recovery Ritual", placeholder: "e.g. 10 minute stretch + breathwork", required: true },
      { key: "description", label: "Notes", placeholder: "Any details about your ritual", isTextarea: true },
    ],
  },
  {
    week: 3, icon: UtensilsCrossed, label: "Fancy Dinner", type: "dinner", emoji: "🍽️",
    description: "Reached your monthly goal? Unlock your celebration reward!",
    fields: [
      { key: "restaurant", label: "Restaurant Name", placeholder: "e.g. The Italian Place" },
      { key: "note", label: "Celebration Note", placeholder: "How are you celebrating?", isTextarea: true },
    ],
  },
];

const TeamManagement = () => {
  const { user } = useAuth();
  const { data: team } = useMyTeam();
  const { data: teams } = useTeams();
  const { data: members } = useTeamMembers();
  const { data: profiles } = useAllProfiles();
  const { data: role } = useUserRole();
  const { data: teamRewards } = useTeamRewards();
  const { data: scores } = useLeaderboard();
  const { data: profile } = useProfile();
  const { data: myRewards } = useMyRewards();
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeamByCode();
  const assignTeam = useAssignTeam();
  const setReward = useSetReward();
  const weekStart = useCurrentWeekStart();
  const { toast } = useToast();

  const [newTeamName, setNewTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = role === "admin";

  // Reward cycle logic
  const currentWeekNumber = (() => {
    if (!profile?.challenge_start) return 1;
    const start = new Date(profile.challenge_start);
    const now = new Date();
    const daysDiff = differenceInDays(now, start);
    if (daysDiff < 0) return 1;
    const weekNum = Math.floor(daysDiff / 7) + 1;
    return ((weekNum - 1) % 3) + 1; // cycle 1-3
  })();

  const getCycleWeekStart = (weekNum: number): string | null => {
    if (!profile?.challenge_start) return null;
    const start = new Date(profile.challenge_start + "T00:00:00");
    const now = new Date();
    const daysDiff = differenceInDays(now, start);
    if (daysDiff < 0) {
      const targetDate = addDays(start, (weekNum - 1) * 7);
      return format(targetDate, "yyyy-MM-dd");
    }
    const currentAbsoluteWeek = Math.floor(daysDiff / 7);
    const currentCycleStart = currentAbsoluteWeek - ((currentAbsoluteWeek) % 3);
    const targetAbsoluteWeek = currentCycleStart + (weekNum - 1);
    const targetDate = addDays(start, targetAbsoluteWeek * 7);
    return format(targetDate, "yyyy-MM-dd");
  };

  const rewardsByWeek = new Map<number, any>();
  myRewards?.forEach((r: any) => {
    const expectedWeekStart = getCycleWeekStart(r.week_number);
    if (expectedWeekStart && r.week_start === expectedWeekStart && !rewardsByWeek.has(r.week_number)) {
      rewardsByWeek.set(r.week_number, r);
    }
  });

  const selectedRewardDef = selectedWeek !== null ? WEEK_REWARDS[selectedWeek - 1] : null;
  const existingReward = selectedWeek !== null ? rewardsByWeek.get(selectedWeek) : null;
  const existingDetails = existingReward?.reward_details || {};

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
      const cycleWeekStart = getCycleWeekStart(selectedWeek!);
      if (!cycleWeekStart) {
        toast({ title: "Set your challenge start date first", variant: "destructive" });
        return;
      }
      await setReward.mutateAsync({
        weekStart: cycleWeekStart,
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

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      await createTeam.mutateAsync(newTeamName.trim());
      setNewTeamName("");
      toast({ title: "Team created! 🎉 You've been added automatically." });
    } catch {
      toast({ title: "Error creating team", variant: "destructive" });
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return;
    try {
      const result = await joinTeam.mutateAsync(joinCode.trim());
      setJoinCode("");
      toast({ title: `Joined ${result.name}! 🎉` });
    } catch (err: any) {
      toast({ title: err.message || "Could not join team", variant: "destructive" });
    }
  };

  const copyTeamCode = () => {
    const code = (team as any)?.team_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Team code copied! 📋" });
    }
  };

  // No team - show create/join flow
  if (!team) {
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-8">
          <h1 className="text-4xl font-display text-foreground">
            <Users className="inline w-8 h-8 text-primary mr-2" />
            Join a Team
          </h1>
          <p className="text-sm font-bold text-muted-foreground mt-2">Create your squad or join one with a code!</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 p-5 rounded-2xl comic-border bg-gradient-to-br from-primary/10 via-card to-accent/10"
        >
          <p className="font-display text-lg text-foreground mb-3">
            <Plus className="inline w-5 h-5 mr-1" /> Create a New Team
          </p>
          <div className="flex gap-2">
            <Input placeholder="Team name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="border-2 border-primary/20" />
            <Button onClick={handleCreateTeam} disabled={createTeam.isPending} className="gradient-primary text-primary-foreground font-bold px-6">Create</Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl comic-border bg-card"
        >
          <p className="font-display text-lg text-foreground mb-3">
            <UserPlus className="inline w-5 h-5 mr-1" /> Join with Team Code
          </p>
          <div className="flex gap-2">
            <Input placeholder="Enter team code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="border-2 border-primary/20 uppercase tracking-widest font-mono" />
            <Button onClick={handleJoinTeam} disabled={joinTeam.isPending} variant="outline" className="font-bold px-6">Join</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Reward detail view
  if (selectedWeek !== null && selectedRewardDef) {
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <Button variant="ghost" size="sm" onClick={handleBack} className="mb-4 font-bold text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
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

            {existingReward && !isEditing ? (
              <div className="p-4 rounded-xl bg-secondary/10 border-2 border-secondary">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-secondary" />
                  <p className="text-xs font-bold text-secondary uppercase">Your Reward is Set!</p>
                </div>
                <RewardDisplay type={selectedRewardDef.type} details={existingDetails} value={existingReward.reward_value} />
                <Button variant="ghost" size="sm" onClick={() => { setFormData(existingDetails); setIsEditing(true); }} className="mt-3 text-xs text-primary font-bold">
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
                    <label className="text-xs font-bold text-muted-foreground uppercase">{field.label}{field.required && " *"}</label>
                    {field.isTextarea ? (
                      <Textarea placeholder={field.placeholder} value={formData[field.key] || ""} onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))} className="mt-1 border-2 border-primary/20 text-sm" rows={2} />
                    ) : (
                      <Input placeholder={field.placeholder} value={formData[field.key] || ""} onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))} className="mt-1 border-2 border-primary/20" />
                    )}
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase">Scheduled Days *</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DAYS_OF_WEEK.map((d) => {
                      const selectedDays: string[] = formData.scheduled_days ? JSON.parse(formData.scheduled_days) : [];
                      const isSelected = selectedDays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => {
                            const newDays = isSelected ? selectedDays.filter((v) => v !== d.value) : [...selectedDays, d.value];
                            setFormData((prev) => ({ ...prev, scheduled_days: JSON.stringify(newDays) }));
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all",
                            isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"
                          )}
                        >
                          {d.label.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSetReward} disabled={setReward.isPending} className="flex-1 gradient-primary text-primary-foreground font-bold">
                    {setReward.isPending ? "Saving..." : existingReward ? "Update ✨" : "Set Reward ✨"}
                  </Button>
                  {existingReward && (
                    <Button variant="outline" onClick={() => { setIsEditing(false); setFormData({}); }}>Cancel</Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // Has team - show team info + rewards
  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-6">
        <h1 className="text-4xl font-display text-foreground">
          <Heart className="inline w-8 h-8 text-primary mr-2" />
          {team.name}
        </h1>
      </motion.div>

      {/* Team Code */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-4 p-4 rounded-2xl bg-card border-2 border-border flex items-center justify-between"
      >
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase">Invite Code</p>
          <p className="font-mono text-lg font-bold text-foreground tracking-widest uppercase">
            {(team as any)?.team_code || "—"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={copyTeamCode} className="font-bold">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </motion.div>

      {/* Team Members */}
      <h2 className="font-display text-2xl text-foreground mb-3">Team Members</h2>
      <div className="space-y-2 mb-6">
        {members?.map((member, i) => {
          const memberScore = scores?.find((s) => s.user_id === member.user_id);
          return (
            <motion.div
              key={member.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border-2 border-border"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-display text-primary-foreground shrink-0"
                style={{ backgroundColor: member.avatar_color || "#FF2D87" }}
              >
                {member.display_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{member.display_name}</p>
                {memberScore && <p className="text-xs text-primary font-bold">{memberScore.points} pts</p>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Monthly Reward Cycle */}
      <h2 className="font-display text-2xl text-foreground mb-1">
        <Gift className="inline w-6 h-6 mr-1 text-primary" /> Monthly Reward Cycle
      </h2>
      <p className="text-xs font-bold text-muted-foreground mb-3">Tap any week to set your personal reward ✨</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
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
              onClick={() => { setSelectedWeek(weekNum); setFormData({}); setIsEditing(false); }}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
                hasReward
                  ? "border-secondary/40 bg-secondary/5"
                  : isCurrent
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
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
              {hasReward && (
                <p className="text-[10px] font-bold uppercase mt-1 text-secondary">Set ✓</p>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Team Reward Feed */}
      {teamRewards && teamRewards.length > 0 && (
        <>
          <h2 className="font-display text-2xl text-foreground mb-3">This Week's Rewards</h2>
          <div className="space-y-2 mb-6">
            {teamRewards.map((reward: any, i: number) => (
              <motion.div
                key={reward.id}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl bg-card border-2 border-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-display text-primary-foreground shrink-0"
                    style={{ backgroundColor: reward.profile?.avatar_color || "#FF2D87" }}
                  >
                    {reward.profile?.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-bold">
                      {reward.profile?.display_name} • {REWARD_EMOJIS[reward.reward_type]} {REWARD_LABELS[reward.reward_type]}
                    </p>
                    <p className="font-bold text-sm text-foreground truncate">{reward.reward_value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Admin section */}
      {isAdmin && (
        <>
          <h2 className="font-display text-2xl text-foreground mb-3">
            <UserPlus className="inline w-6 h-6 mr-1" /> Admin: Assign Members
          </h2>
          {profiles && teams && (
            <div className="space-y-2">
              {profiles.map((profile: any) => (
                <div key={profile.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-display text-primary-foreground shrink-0"
                    style={{ backgroundColor: profile.avatar_color || "#FF2D87" }}
                  >
                    {profile.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <p className="flex-1 font-bold text-sm text-foreground truncate">{profile.display_name}</p>
                  <Select
                    value={profile.team_id || "none"}
                    onValueChange={(val) => assignTeam.mutateAsync({ userId: profile.user_id, teamId: val === "none" ? null : val })}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue placeholder="No team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </>
      )}
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

export default TeamManagement;
