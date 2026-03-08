import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Dumbbell, Flame, Trophy, CalendarIcon, Copy, Users, Plus, ArrowRight, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile, useUserRole } from "@/hooks/useProfile";
import { useMyTeam } from "@/hooks/useTeams";
import { useActiveChallenge, useChallengeParticipants, useCreateChallenge, useJoinChallenge, useLeaveChallenge, useChallengeProgress } from "@/hooks/useChallenge";

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
  const { data: challenge } = useActiveChallenge();
  const { data: participants } = useChallengeParticipants(profile?.challenge_id ?? null);

  const updateProfile = useUpdateProfile();
  const createChallenge = useCreateChallenge();
  const joinChallenge = useJoinChallenge();
  const leaveChallenge = useLeaveChallenge();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [challengeName, setChallengeName] = useState("Fitness Challenge");
  const [startOpen, setStartOpen] = useState(false);
  const [selectedStart, setSelectedStart] = useState<Date | undefined>();
  const [joinCode, setJoinCode] = useState("");

  const progress = useChallengeProgress(challenge?.start_date ?? null);

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

  const handleCreateChallenge = async () => {
    if (!selectedStart || !challengeName.trim()) return;
    try {
      const ch = await createChallenge.mutateAsync({ name: challengeName.trim(), startDate: selectedStart });
      setShowCreate(false);
      setSelectedStart(undefined);
      toast({ title: `Challenge created! 🎉 Code: ${ch.invite_code}` });
    } catch {
      toast({ title: "Error creating challenge", variant: "destructive" });
    }
  };

  const handleJoinChallenge = async () => {
    if (!joinCode.trim()) return;
    try {
      await joinChallenge.mutateAsync(joinCode);
      setShowJoin(false);
      setJoinCode("");
      toast({ title: "Joined challenge! 💪" });
    } catch (e: any) {
      toast({ title: e.message || "Could not join", variant: "destructive" });
    }
  };

  const handleLeave = async () => {
    try {
      await leaveChallenge.mutateAsync();
      toast({ title: "Left the challenge" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const copyCode = () => {
    if (challenge?.invite_code) {
      navigator.clipboard.writeText(challenge.invite_code);
      toast({ title: "Code copied! 📋" });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

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

      {/* Challenge Section */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 p-5 rounded-2xl bg-card border-2 border-border"
      >
        <h2 className="font-display text-xl text-foreground mb-1">
          <CalendarIcon className="inline w-5 h-5 mr-1 text-primary" /> Challenge
        </h2>

        {/* Active challenge */}
        {challenge ? (
          <div className="space-y-4 mt-3">
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-foreground">{challenge.name}</h3>
                <span className={cn(
                  "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full",
                  progress?.status === "active" ? "bg-secondary/20 text-secondary" :
                  progress?.status === "completed" ? "bg-muted text-muted-foreground" :
                  "bg-accent/20 text-accent-foreground"
                )}>
                  {progress?.status === "active" ? "🔥 Active" : progress?.status === "completed" ? "✅ Completed" : "📅 Upcoming"}
                </span>
              </div>

              <div className="text-sm font-bold text-muted-foreground mb-2">
                {format(new Date(challenge.start_date + "T00:00:00"), "MMM d")} → {format(new Date(challenge.end_date + "T00:00:00"), "MMM d, yyyy")}
              </div>

              {progress?.status === "active" && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-muted-foreground mb-1">
                    <span>Week {progress.week} • Day {progress.day}</span>
                    <span>{progress.daysLeft} days left</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-primary rounded-full transition-all"
                      style={{ width: `${(progress.daysDiff / 28) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {progress?.status === "upcoming" && (
                <p className="text-xs font-bold text-accent-foreground">
                  Starts in {progress.daysUntilStart} day{progress.daysUntilStart !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Invite code */}
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-xl bg-muted text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Invite Code</p>
                <p className="font-display text-2xl text-foreground tracking-widest">{challenge.invite_code?.toUpperCase()}</p>
              </div>
              <Button variant="outline" size="icon" onClick={copyCode} className="h-12 w-12 shrink-0">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* Participants */}
            {participants && participants.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
                  <Users className="inline w-3 h-3 mr-1" /> {participants.length} Participant{participants.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted"
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground"
                        style={{ backgroundColor: p.avatar_color }}
                      >
                        {p.display_name?.[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-foreground">{p.display_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleLeave}
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 font-bold text-sm"
            >
              <X className="w-4 h-4 mr-1" /> Leave Challenge
            </Button>
          </div>
        ) : (
          /* No active challenge — show create/join */
          <div className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground font-bold">Create a new 4-week challenge or join one with a code</p>

            {!showCreate && !showJoin && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setShowCreate(true)}
                  className="gradient-primary text-primary-foreground font-bold"
                >
                  <Plus className="w-4 h-4 mr-1" /> Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowJoin(true)}
                  className="font-bold border-primary/30"
                >
                  <ArrowRight className="w-4 h-4 mr-1" /> Join
                </Button>
              </div>
            )}

            {/* Create form */}
            {showCreate && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="space-y-3 p-4 rounded-xl border-2 border-primary/20 bg-primary/5"
              >
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Challenge Name</label>
                  <Input
                    value={challengeName}
                    onChange={(e) => setChallengeName(e.target.value)}
                    placeholder="e.g. Spring Shred"
                    className="mt-1 border-primary/20 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Start Date</label>
                  <Popover open={startOpen} onOpenChange={setStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-bold text-sm h-10 mt-1",
                          !selectedStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                        {selectedStart ? format(selectedStart, "MMM d, yyyy") : "Pick start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedStart}
                        onSelect={(d) => { setSelectedStart(d); setStartOpen(false); }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateChallenge}
                    disabled={!selectedStart || !challengeName.trim() || createChallenge.isPending}
                    className="flex-1 gradient-primary text-primary-foreground font-bold"
                  >
                    {createChallenge.isPending ? "Creating..." : "Create Challenge 🚀"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreate(false)} className="font-bold">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Join form */}
            {showJoin && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="space-y-3 p-4 rounded-xl border-2 border-secondary/20 bg-secondary/5"
              >
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Invite Code</label>
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="e.g. a3f2b1"
                    className="mt-1 border-secondary/20 font-bold text-center text-lg tracking-widest uppercase"
                    maxLength={6}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleJoinChallenge}
                    disabled={!joinCode.trim() || joinChallenge.isPending}
                    className="flex-1 bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90"
                  >
                    {joinChallenge.isPending ? "Joining..." : "Join Challenge 💪"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowJoin(false)} className="font-bold">
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
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
