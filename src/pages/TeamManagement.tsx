import { useState } from "react";
import { motion } from "framer-motion";
import RewardJourney from "@/components/RewardJourney";
import { Users, Plus, UserPlus, Copy, Check, Heart, CalendarIcon, ArrowRight, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useTeams, useCreateTeam, useJoinTeamByCode, useMyTeam, useTeamMembers, useAssignTeam } from "@/hooks/useTeams";
import { useAllProfiles, useUserRole, useProfile } from "@/hooks/useProfile";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useActiveChallenge, useChallengeParticipants, useCreateChallenge, useJoinChallenge, useLeaveChallenge, useDeleteChallenge, useChallengeProgress } from "@/hooks/useChallenge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TeamManagement = () => {
  const { data: team } = useMyTeam();
  const { data: teams } = useTeams();
  const { data: members } = useTeamMembers();
  const { data: profiles } = useAllProfiles();
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();
  const { data: scores } = useLeaderboard();
  const { data: challenge } = useActiveChallenge();
  const { data: challengeParticipants } = useChallengeParticipants(profile?.challenge_id ?? null);
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeamByCode();
  const assignTeam = useAssignTeam();
  const createChallenge = useCreateChallenge();
  const joinChallenge = useJoinChallenge();
  const leaveChallenge = useLeaveChallenge();
  const deleteChallenge = useDeleteChallenge();
  const { toast } = useToast();

  const progress = useChallengeProgress(challenge?.start_date ?? null);

  const [newTeamName, setNewTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Challenge state
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [showJoinChallenge, setShowJoinChallenge] = useState(false);
  const [challengeName, setChallengeName] = useState("Fitness Challenge");
  const [startOpen, setStartOpen] = useState(false);
  const [selectedStart, setSelectedStart] = useState<Date | undefined>();
  const [challengeCode, setChallengeCode] = useState("");
  const [challengeCopied, setChallengeCopied] = useState(false);

  const isAdmin = role === "admin";

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

  const handleCreateChallenge = async () => {
    if (!selectedStart || !challengeName.trim()) return;
    try {
      const ch = await createChallenge.mutateAsync({ name: challengeName.trim(), startDate: selectedStart });
      setShowCreateChallenge(false);
      setSelectedStart(undefined);
      toast({ title: `Challenge created! 🎉 Code: ${ch.invite_code}` });
    } catch {
      toast({ title: "Error creating challenge", variant: "destructive" });
    }
  };

  const handleJoinChallenge = async () => {
    if (!challengeCode.trim()) return;
    try {
      await joinChallenge.mutateAsync(challengeCode);
      setShowJoinChallenge(false);
      setChallengeCode("");
      toast({ title: "Joined challenge! 💪" });
    } catch (e: any) {
      toast({ title: e.message || "Could not join", variant: "destructive" });
    }
  };

  const handleLeaveChallenge = async () => {
    try {
      await leaveChallenge.mutateAsync();
      toast({ title: "Left the challenge" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDeleteChallenge = async () => {
    if (!challenge?.id) return;
    try {
      await deleteChallenge.mutateAsync(challenge.id);
      toast({ title: "Challenge deleted" });
    } catch {
      toast({ title: "Error deleting challenge", variant: "destructive" });
    }
  };

  const copyChallengeCode = () => {
    if (challenge?.invite_code) {
      navigator.clipboard.writeText(challenge.invite_code);
      setChallengeCopied(true);
      setTimeout(() => setChallengeCopied(false), 2000);
      toast({ title: "Challenge code copied! 📋" });
    }
  };

  // Challenge card (shared between both views)
  const ChallengeSection = () => (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="mb-6 p-5 rounded-2xl bg-card border-2 border-border"
    >
      <h2 className="font-display text-xl text-foreground mb-1">
        <CalendarIcon className="inline w-5 h-5 mr-1 text-primary" /> Challenge
      </h2>

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
                  <span>Week {((progress.week - 1) % 4) + 1}</span>
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
            <Button variant="outline" size="icon" onClick={copyChallengeCode} className="h-12 w-12 shrink-0">
              {challengeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {/* Participants */}
          {challengeParticipants && challengeParticipants.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
                <Users className="inline w-3 h-3 mr-1" /> {challengeParticipants.length} Participant{challengeParticipants.length !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {challengeParticipants.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted">
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

          {/* Reward Journey */}
          {progress && (
            <RewardJourney
              challengeId={challenge.id}
              challengeStartDate={challenge.start_date}
              currentWeek={((progress.week - 1) % 4) + 1}
              status={progress.status}
            />
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleLeaveChallenge}
              className="flex-1 text-muted-foreground border-border font-bold text-sm"
            >
              <X className="w-4 h-4 mr-1" /> Leave
            </Button>
            {challenge.created_by === profile?.user_id && (
              <Button
                variant="outline"
                onClick={handleDeleteChallenge}
                disabled={deleteChallenge.isPending}
                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 font-bold text-sm"
              >
                <Trash2 className="w-4 h-4 mr-1" /> {deleteChallenge.isPending ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 mt-3">
          <p className="text-xs text-muted-foreground font-bold">Create a new 4-week challenge or join one with a code</p>

          {!showCreateChallenge && !showJoinChallenge && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowCreateChallenge(true)}
                className="gradient-primary text-primary-foreground font-bold"
              >
                <Plus className="w-4 h-4 mr-1" /> Create
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowJoinChallenge(true)}
                className="font-bold border-primary/30"
              >
                <ArrowRight className="w-4 h-4 mr-1" /> Join
              </Button>
            </div>
          )}

          {showCreateChallenge && (
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
                <Button variant="ghost" onClick={() => setShowCreateChallenge(false)} className="font-bold">
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {showJoinChallenge && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="space-y-3 p-4 rounded-xl border-2 border-secondary/20 bg-secondary/5"
            >
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Invite Code</label>
                <Input
                  value={challengeCode}
                  onChange={(e) => setChallengeCode(e.target.value)}
                  placeholder="e.g. a3f2b1"
                  className="mt-1 border-secondary/20 font-bold text-center text-lg tracking-widest uppercase"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleJoinChallenge}
                  disabled={!challengeCode.trim() || joinChallenge.isPending}
                  className="flex-1 bg-secondary text-secondary-foreground font-bold hover:bg-secondary/90"
                >
                  {joinChallenge.isPending ? "Joining..." : "Join Challenge 💪"}
                </Button>
                <Button variant="ghost" onClick={() => setShowJoinChallenge(false)} className="font-bold">
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );

  if (!team) {
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto lg:max-w-5xl lg:px-8 lg:pb-8">
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
          className="mb-6 p-5 rounded-2xl comic-border bg-card"
        >
          <p className="font-display text-lg text-foreground mb-3">
            <UserPlus className="inline w-5 h-5 mr-1" /> Join with Team Code
          </p>
          <div className="flex gap-2">
            <Input placeholder="Enter team code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="border-2 border-primary/20 uppercase tracking-widest font-mono" />
            <Button onClick={handleJoinTeam} disabled={joinTeam.isPending} variant="outline" className="font-bold px-6">Join</Button>
          </div>
        </motion.div>

        <ChallengeSection />
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto lg:max-w-5xl lg:px-8 lg:pb-8">

      {/* Challenge section */}
      <ChallengeSection />

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

export default TeamManagement;
