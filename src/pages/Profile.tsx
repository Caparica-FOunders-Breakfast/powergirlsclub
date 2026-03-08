import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Dumbbell, Flame, Trophy, CalendarIcon } from "lucide-react";
import { format, differenceInDays, differenceInWeeks, addDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile, useUserRole } from "@/hooks/useProfile";
import { useMyTeam } from "@/hooks/useTeams";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = ["#FF2D87", "#00F5D4", "#FFE600", "#5271FF", "#FF6B35", "#A855F7"];

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: role } = useUserRole();
  const { data: team } = useMyTeam();
  
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await updateProfile.mutateAsync({ display_name: name.trim() });
      setEditing(false);
      toast({ title: "Profile updated! ✨" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleColorChange = async (color: string) => {
    try {
      await updateProfile.mutateAsync({ avatar_color: color });
    } catch {}
  };

  const handleStartDateChange = async (date: Date | undefined) => {
    try {
      const updates: any = {
        challenge_start: date ? format(date, "yyyy-MM-dd") : null,
        challenge_end: date ? format(addDays(date, 28), "yyyy-MM-dd") : null,
      };
      await updateProfile.mutateAsync(updates);
      toast({ title: "Challenge period updated! 📅" });
    } catch {
      toast({ title: "Error updating date", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const recentRewards = myRewards?.slice(0, 4) || [];

  const challengeStart = (profile as any)?.challenge_start ? new Date((profile as any).challenge_start) : undefined;
  const challengeEnd = (profile as any)?.challenge_end ? new Date((profile as any).challenge_end) : undefined;

  const now = new Date();
  const isActive = challengeStart && challengeEnd && now >= challengeStart && now <= challengeEnd;
  const daysLeft = challengeEnd ? differenceInDays(challengeEnd, now) : null;
  const totalWeeks = challengeStart && challengeEnd ? differenceInWeeks(challengeEnd, challengeStart) : null;
  const weeksCompleted = challengeStart ? differenceInWeeks(now, challengeStart) : null;

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-6">
        <h1 className="text-4xl font-display text-foreground">Profile</h1>
      </motion.div>

      {/* Avatar Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl comic-border p-6 text-center mb-6"
      >
        <div
          className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl font-display text-primary-foreground comic-border mb-4"
          style={{ backgroundColor: profile?.avatar_color || "#FF2D87" }}
        >
          {profile?.display_name?.[0]?.toUpperCase() || "?"}
        </div>

        {editing ? (
          <div className="flex gap-2 mb-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New name" className="border-2 border-primary/30" />
            <Button onClick={handleSave} className="gradient-primary text-primary-foreground font-bold">Save</Button>
          </div>
        ) : (
          <button onClick={() => { setName(profile?.display_name || ""); setEditing(true); }}>
            <h2 className="text-3xl font-display text-foreground hover:text-primary transition-colors">
              {profile?.display_name}
            </h2>
          </button>
        )}

        <p className="text-sm text-muted-foreground font-bold">{user?.email}</p>

        <div className="flex items-center justify-center gap-2 mt-2">
          {team && (
            <span className="inline-block px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-extrabold">
              {team.name}
            </span>
          )}
          {role === "admin" && (
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold uppercase">
              Admin 👑
            </span>
          )}
        </div>

        {/* Avatar color picker */}
        <div className="flex justify-center gap-2 mt-4">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => handleColorChange(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${profile?.avatar_color === c ? "border-foreground scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </motion.div>

      {/* Challenge Duration */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 p-5 rounded-2xl bg-card border-2 border-border"
      >
        <h2 className="font-display text-xl text-foreground mb-1">
          <CalendarIcon className="inline w-5 h-5 mr-1 text-primary" /> Challenge Period
        </h2>
        <p className="text-xs text-muted-foreground font-bold mb-4">Set when your fitness challenge starts and ends</p>

        <div className="grid grid-cols-2 gap-3">
          {/* Start Date */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start Date</label>
            <Popover open={startOpen} onOpenChange={setStartOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-bold text-sm h-10 mt-1",
                    !challengeStart && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                  {challengeStart ? format(challengeStart, "MMM d, yyyy") : "Pick start"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={challengeStart}
                  onSelect={(date) => { handleStartDateChange(date); setStartOpen(false); }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date (auto-calculated) */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">End Date</label>
            <Button
              variant="outline"
              disabled
              className="w-full justify-start text-left font-bold text-sm h-10 mt-1"
            >
              <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
              {challengeEnd ? format(challengeEnd, "MMM d, yyyy") : "—"}
            </Button>
          </div>
        </div>

        {/* Challenge status */}
        {challengeStart && challengeEnd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mt-4 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full",
                isActive
                  ? "bg-secondary/20 text-secondary"
                  : daysLeft !== null && daysLeft < 0
                  ? "bg-muted text-muted-foreground"
                  : "bg-accent/20 text-accent-foreground"
              )}>
                {isActive ? "🔥 Active" : daysLeft !== null && daysLeft < 0 ? "✅ Completed" : "📅 Upcoming"}
              </span>
              {totalWeeks !== null && (
                <span className="text-xs font-bold text-muted-foreground">{totalWeeks} weeks total</span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-foreground">
                {format(challengeStart, "MMM d")} → {format(challengeEnd, "MMM d, yyyy")}
              </span>
            </div>

            {isActive && daysLeft !== null && (
              <div className="mt-2">
                <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
                  <span>Week {(weeksCompleted ?? 0) + 1}</span>
                  <span>{daysLeft} days left</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, totalWeeks && weeksCompleted !== null ? ((weeksCompleted) / totalWeeks) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Dumbbell, label: "Workouts", value: "—", color: "text-secondary" },
          { icon: Flame, label: "Best Streak", value: "—", color: "text-accent" },
          { icon: Trophy, label: "Weeks Won", value: "—", color: "text-primary" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl border-2 border-border p-3 text-center"
          >
            <stat.icon className={`w-6 h-6 mx-auto mb-1 ${stat.color}`} />
            <p className="font-display text-2xl text-foreground">{stat.value}</p>
            <p className="text-xs font-bold text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* My Rewards */}
      {recentRewards.length > 0 && (
        <>
          <h2 className="font-display text-2xl text-foreground mb-3">
            <Gift className="inline w-6 h-6 mr-1 text-primary" /> My Rewards
          </h2>
          <div className="space-y-2 mb-6">
            {recentRewards.map((reward: any, i: number) => (
              <motion.div
                key={reward.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl bg-card border-2 border-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{REWARD_EMOJIS[reward.reward_type] || "🎁"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-bold">
                      Week {reward.week_number} • {reward.week_start}
                    </p>
                    <p className="font-bold text-sm text-foreground truncate">{reward.reward_value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <Button
        onClick={signOut}
        variant="outline"
        className="w-full h-12 font-bold text-destructive border-destructive/30 hover:bg-destructive/10"
      >
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
};

export default Profile;
