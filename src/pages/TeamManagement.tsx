import { useState } from "react";
import { motion } from "framer-motion";
import RewardJourney from "@/components/RewardJourney";
import { Users, Plus, UserPlus, Copy, Check, Heart, CalendarIcon, ArrowRight, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useTeams, useCreateTeam, useJoinTeamByCode, useMyTeam, useTeamMembers, useAssignTeam } from "@/hooks/useTeams";
import { useAllProfiles, useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/contexts/AdminContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useActiveChallenge, useChallengeParticipants, useCreateChallenge, useJoinChallenge, useLeaveChallenge, useDeleteChallenge, useChallengeProgress } from "@/hooks/useChallenge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const TeamManagement = () => {
  const { data: team } = useMyTeam();
  const { data: teams } = useTeams();
  const { data: members } = useTeamMembers();
  const { data: profiles } = useAllProfiles();
  const { data: profile } = useProfile();
  const isAdmin = useIsAdmin();
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
  const isMobile = useIsMobile();

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

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      await createTeam.mutateAsync(newTeamName.trim());
      setNewTeamName("");
      toast({ title: "Team created! You're in it already." });
    } catch {
      toast({ title: "Error creating team", variant: "destructive" });
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) return;
    try {
      const result = await joinTeam.mutateAsync(joinCode.trim());
      setJoinCode("");
      toast({ title: `Joined ${result.name}!` });
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
      toast({ title: "Team code copied" });
    }
  };

  const handleCreateChallenge = async () => {
    if (!selectedStart || !challengeName.trim()) return;
    try {
      const ch = await createChallenge.mutateAsync({ name: challengeName.trim(), startDate: selectedStart });
      setShowCreateChallenge(false);
      setSelectedStart(undefined);
      toast({ title: `Challenge created. Code: ${ch.invite_code}` });
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
      toast({ title: "Joined the challenge!" });
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
      toast({ title: "Challenge code copied" });
    }
  };

  // Challenge card (shared between both views)
  const ChallengeSection = () => (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="mb-6 p-7 rounded-[22px] bg-card border-2 border-[#2B1736]"
    >
      <h2 className="font-display text-[32px] tracking-[1px] text-foreground mb-1 flex items-center gap-2">
        <CalendarIcon className="w-6 h-6 text-primary" /> Challenge
      </h2>

      {challenge ? (
        <div className="space-y-4 mt-3">
          <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-foreground text-lg">{challenge.name}</h3>
              <span className={cn(
                "text-[12px] font-extrabold uppercase px-2.5 py-0.5 rounded-full",
                progress?.status === "active" ? "bg-secondary/20 text-secondary" :
                progress?.status === "completed" ? "bg-muted text-muted-foreground" :
                "bg-accent/20 text-accent-foreground"
              )}>
                {progress?.status === "active" ? "Active" : progress?.status === "completed" ? "Completed" : "Upcoming"}
              </span>
            </div>

            <div className="text-[15px] font-bold text-muted-foreground mb-2">
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
              <p className="text-[13px] font-bold text-muted-foreground uppercase mb-1">Invite Code</p>
              <p className="font-display text-[32px] text-foreground tracking-widest">{challenge.invite_code?.toUpperCase()}</p>
            </div>
            <Button variant="outline" size="icon" onClick={copyChallengeCode} className="h-12 w-12 shrink-0">
              {challengeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {/* Participants */}
          {challengeParticipants && challengeParticipants.length > 0 && (
            <div>
              <p className="text-[13px] font-bold text-muted-foreground uppercase mb-2">
                <Users className="inline w-3.5 h-3.5 mr-1" /> {challengeParticipants.length} Participant{challengeParticipants.length !== 1 ? "s" : ""}
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
                    <span className="text-sm font-bold text-foreground">{p.display_name}</span>
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
          <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
            <p className="text-[17px] font-bold text-foreground">How a challenge works</p>
            <ul className="text-[15px] font-semibold text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>A challenge runs for <strong>4 weeks</strong> with your friends or team.</li>
              <li>Everyone trains their weekly plan, each completed workout earns points.</li>
              <li>There's a <strong>weekly winner</strong>, and you unlock rewards as you go.</li>
              <li>Start your own and share the code, or join one with a friend's code.</li>
            </ul>
          </div>
          <p className="text-[15px] text-muted-foreground font-bold">Create a new 4-week challenge or join one with a code</p>

          {!showCreateChallenge && !showJoinChallenge && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowCreateChallenge(true)}
                className="gradient-primary text-primary-foreground font-bold h-12 text-base"
              >
                <Plus className="w-4 h-4 mr-1" /> Create
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowJoinChallenge(true)}
                className="font-bold border-primary/30 h-12 text-base"
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
                <label className="text-[13px] font-bold text-muted-foreground uppercase">Challenge Name</label>
                <Input
                  value={challengeName}
                  onChange={(e) => setChallengeName(e.target.value)}
                  placeholder="e.g. Spring Shred"
                  className="mt-1 border-primary/20 font-bold"
                />
              </div>
              <div>
                <label className="text-[13px] font-bold text-muted-foreground uppercase">Start Date</label>
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
                  {createChallenge.isPending ? "Creating..." : "Create challenge"}
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
                <label className="text-[13px] font-bold text-muted-foreground uppercase">Invite Code</label>
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
                  {joinChallenge.isPending ? "Joining..." : "Join challenge"}
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

  const teamCode = (team as { team_code?: string } | null)?.team_code ?? "";
  const myId = profile?.user_id;

  return (
    <div style={{ background: "#FBF9FB", minHeight: "100%", color: "#2B1736", fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5, padding: isMobile ? "20px 16px 28px" : "32px 24px 64px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: isMobile ? 16 : 28 }}>
        {/* HERO */}
        <section style={{ background: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)", color: "#FFFFFF", border: "2px solid #2B1736", borderRadius: 24, boxShadow: isMobile ? "4px 4px 0 #2B1736" : "6px 6px 0 #2B1736", padding: isMobile ? "22px 18px" : "36px 36px 32px" }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: 1, color: "rgba(255,255,255,0.88)" }}>4-WEEK TEAM CHALLENGE</p>
          <h1 style={{ margin: "4px 0 0", fontFamily: "Bangers, cursive", fontWeight: 400, fontSize: isMobile ? 42 : "clamp(48px, 6vw, 72px)", letterSpacing: 1.5, lineHeight: 0.95 }}>
            Train with friends.<span style={{ display: "block", color: "#FFD6EA" }}>Win the week.</span>
          </h1>
          <p style={{ margin: "16px 0 0", maxWidth: 560, fontSize: isMobile ? 15 : 18, fontWeight: 600, color: "rgba(255,255,255,0.92)" }}>Start a team or join one with a code. Every workout you finish earns points for your team.</p>
          <ol style={{ margin: isMobile ? "16px 0 0" : "28px 0 0", padding: 0, listStyle: "none", display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: isMobile ? undefined : "repeat(auto-fit, minmax(190px, 1fr))", gap: isMobile ? 8 : 12 }}>
            {[
              ["Make your team", "Create one or join with a friend's code.", "Make your team or join with a code"],
              ["Train your plan", "Everyone follows their own weekly plan.", "Everyone trains their own plan"],
              ["Earn points", "Each finished workout scores for you.", "Each finished workout earns points"],
              ["Win the week", "A winner every week, rewards as you go.", "A winner every week, rewards as you go"],
            ].map(([t, d, mobileLine], i) =>
              isMobile ? (
                <li key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 14 }}>
                  <span style={{ flex: "none", width: 26, height: 26, borderRadius: 999, background: "#FFFFFF", color: "#2B1736", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  {mobileLine}
                </li>
              ) : (
                <li key={t} style={{ background: "rgba(255,255,255,0.14)", borderRadius: 16, padding: 16 }}>
                  <span style={{ display: "inline-flex", width: 32, height: 32, borderRadius: 999, background: "#FFFFFF", color: "#2B1736", fontWeight: 800, alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  <p style={{ margin: "10px 0 0", fontWeight: 800 }}>{t}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 14, color: "rgba(255,255,255,0.9)" }}>{d}</p>
                </li>
              )
            )}
          </ol>
        </section>

        {/* TEAM: your team + board, or create/join */}
        {team ? (
          <>
            <section style={{ background: "#FFFFFF", border: "2px solid #2B1736", borderRadius: 22, boxShadow: "4px 4px 0 #E8308C", padding: isMobile ? 18 : 28 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: 1, color: "#77677E" }}>YOUR TEAM</p>
              <h2 style={{ margin: "2px 0 0", fontFamily: "Bangers, cursive", fontWeight: 400, fontSize: isMobile ? 26 : 32, letterSpacing: 1 }}>{team.name}</h2>
              {teamCode && (
                <div style={{ marginTop: 16, padding: isMobile ? 14 : 18, borderRadius: 16, background: "#FFF5FA", border: "2px solid #E8308C" }}>
                  <p style={{ margin: 0, fontWeight: 800 }}>Share this code so friends can join:</p>
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "Bangers, cursive", fontSize: isMobile ? 34 : 40, letterSpacing: 6, lineHeight: 1, color: "#C21C70", marginRight: 6 }}>{teamCode.toUpperCase()}</span>
                    <button type="button" onClick={copyTeamCode} style={{ minHeight: 44, padding: "0 16px", border: "2px solid #2B1736", borderRadius: 12, background: "#FFFFFF", color: "#2B1736", fontWeight: 800, cursor: "pointer" }}>{copied ? "Copied" : "Copy code"}</button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Join my Power Club team "${team.name}"! Code: ${teamCode.toUpperCase()} ${window.location.origin}/teams`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ minHeight: 44, padding: "0 16px", display: "inline-flex", alignItems: "center", border: "2px solid #2B1736", borderRadius: 12, background: "#2B1736", color: "#FFFFFF", fontWeight: 800, textDecoration: "none" }}
                    >Share on WhatsApp</a>
                  </div>
                </div>
              )}
            </section>

            <section style={{ background: "#FFFFFF", border: "2px solid #2B1736", borderRadius: 22, padding: isMobile ? 18 : 28 }}>
              <h2 style={{ margin: 0, fontFamily: "Bangers, cursive", fontWeight: 400, fontSize: isMobile ? 26 : 32, letterSpacing: 1 }}>Team board</h2>
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                {scores && scores.length > 0 ? (
                  scores.map((s, i) => {
                    const isYou = s.user_id === myId;
                    const name = isYou ? "You" : s.profile?.display_name ?? "Member";
                    const count = s.powerData?.[6] ?? (s as { points?: number }).points ?? 0;
                    return (
                      <div key={s.user_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, background: isYou ? "#FFF5FA" : "#F6F1F7", border: isYou ? "2px solid #E8308C" : "none" }}>
                        <span style={{ width: 32, fontFamily: "Bangers, cursive", fontSize: 26, color: i === 0 ? "#C21C70" : "#5E4E66" }}>{i + 1}</span>
                        <span style={{ width: 40, height: 40, borderRadius: 999, background: s.profile?.avatar_color ?? "#E8308C", color: "#FFFFFF", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{(name[0] ?? "?").toUpperCase()}</span>
                        <span style={{ flex: 1, fontWeight: 800 }}>{name}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#5E4E66" }}>{count} {count === 1 ? "workout" : "workouts"}</span>
                        {i === 0 && <span style={{ padding: "4px 10px", borderRadius: 999, background: "#FFE14D", border: "1.5px solid #2B1736", fontSize: 12, fontWeight: 800 }}>Leading</span>}
                      </div>
                    );
                  })
                ) : (
                  <p style={{ margin: 0, color: "#5E4E66", fontWeight: 600 }}>No scores yet this week. Complete a workout to get on the board.</p>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 16 : 24 }}>
            {/* Start a team */}
            <section style={{ flex: "1 1 380px", minWidth: 0, background: "#FFFFFF", border: "2px solid #2B1736", borderRadius: 22, boxShadow: "4px 4px 0 #E8308C", padding: isMobile ? 18 : 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: "none", width: 48, height: 48, borderRadius: 12, background: "#E8308C", border: "2px solid #2B1736", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                </span>
                <h2 style={{ margin: 0, fontFamily: "Bangers, cursive", fontWeight: 400, fontSize: isMobile ? 26 : 32, letterSpacing: 1 }}>Start a team</h2>
              </div>
              <p style={{ margin: "10px 0 0", color: "#5E4E66" }}>You'll get a code to share with your friends.</p>
              <label htmlFor="team" style={{ display: "block", marginTop: 20, fontWeight: 800, fontSize: 15 }}>Team name</label>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <input id="team" type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="e.g. Caparica Lifters" style={{ flex: "1 1 200px", minWidth: 0, height: 52, padding: "0 16px", border: "2px solid #2B1736", borderRadius: 12, fontSize: 16, color: "#2B1736", boxSizing: "border-box" }} />
                <button type="button" onClick={handleCreateTeam} disabled={createTeam.isPending} style={{ flex: "none", height: 52, padding: "0 24px", background: "#C21C70", color: "#FFFFFF", border: "2px solid #2B1736", borderRadius: 12, boxShadow: "3px 3px 0 #2B1736", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>Create team</button>
              </div>
            </section>

            {/* Join a team */}
            <section style={{ flex: "1 1 380px", minWidth: 0, background: "#FFFFFF", border: "2px solid #2B1736", borderRadius: 22, boxShadow: "4px 4px 0 #6B2FB3", padding: isMobile ? 18 : 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: "none", width: 48, height: 48, borderRadius: 12, background: "#6B2FB3", border: "2px solid #2B1736", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
                <h2 style={{ margin: 0, fontFamily: "Bangers, cursive", fontWeight: 400, fontSize: isMobile ? 26 : 32, letterSpacing: 1 }}>Join a team</h2>
              </div>
              <p style={{ margin: "10px 0 0", color: "#5E4E66" }}>Got a code from a friend? Pop it in here.</p>
              <label htmlFor="code" style={{ display: "block", marginTop: 20, fontWeight: 800, fontSize: 15 }}>Team code</label>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <input id="code" type="text" maxLength={6} value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="ABC123" style={{ flex: "1 1 200px", minWidth: 0, height: 52, padding: "0 16px", border: "2px solid #2B1736", borderRadius: 12, fontSize: 20, fontWeight: 800, letterSpacing: 4, color: "#2B1736", boxSizing: "border-box", textTransform: "uppercase" }} />
                <button type="button" onClick={handleJoinTeam} disabled={joinTeam.isPending} style={{ flex: "none", height: 52, padding: "0 28px", background: "#6B2FB3", color: "#FFFFFF", border: "2px solid #2B1736", borderRadius: 12, boxShadow: "3px 3px 0 #2B1736", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>Join</button>
              </div>
            </section>
          </div>

          {/* Example board so members can see what a team looks like before joining. */}
          <section style={{ background: "#FFFFFF", border: "2px solid #2B1736", borderRadius: 22, padding: isMobile ? 18 : 28 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <h2 style={{ margin: 0, fontFamily: "Bangers, cursive", fontWeight: 400, fontSize: isMobile ? 26 : 32, letterSpacing: 1 }}>What your team board looks like</h2>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#77677E" }}>Example · Week 2 of 4</span>
            </div>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { rank: 1, name: "You", initial: "Y", color: "#E8308C", count: 3, you: true },
                { rank: 2, name: "Teammate", initial: "T", color: "#6B2FB3", count: 2, you: false },
                { rank: 3, name: "Teammate", initial: "T", color: "#2B1736", count: 1, you: false },
              ].map((r) => (
                <div key={r.rank} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, background: r.you ? "#FFF5FA" : "#F6F1F7", border: r.you ? "2px solid #E8308C" : "2px solid transparent" }}>
                  <span style={{ width: isMobile ? 18 : 32, fontFamily: "Bangers, cursive", fontSize: isMobile ? 22 : 26, color: r.you ? "#C21C70" : "#5E4E66" }}>{r.rank}</span>
                  {!isMobile && <span style={{ width: 40, height: 40, borderRadius: 999, background: r.color, color: "#FFFFFF", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.initial}</span>}
                  <span style={{ flex: 1, fontWeight: 800 }}>{r.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#5E4E66" }}>{r.count} {r.count === 1 ? "workout" : "workouts"}</span>
                  {r.rank === 1 && !isMobile && <span style={{ padding: "4px 10px", borderRadius: 999, background: "#FFE14D", border: "1.5px solid #2B1736", fontSize: 12, fontWeight: 800 }}>Leading</span>}
                </div>
              ))}
            </div>
          </section>
          </>
        )}

        {/* Challenge CRUD (kept) */}
        <ChallengeSection />

        {/* Admin: assign members (kept) */}
        {isAdmin && profiles && teams && (
          <section style={{ background: "#FFFFFF", border: "2px solid #2B1736", borderRadius: 22, padding: 24 }}>
            <h2 style={{ margin: "0 0 12px", fontFamily: "Bangers, cursive", fontWeight: 400, fontSize: 28, letterSpacing: 1 }}>Admin: assign members</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profiles.map((p: { id: string; user_id: string; display_name?: string; avatar_color?: string; team_id?: string | null }) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-display text-primary-foreground shrink-0" style={{ backgroundColor: p.avatar_color || "#FF2D87" }}>
                    {p.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <p className="flex-1 font-bold text-sm text-foreground truncate">{p.display_name}</p>
                  <Select value={p.team_id || "none"} onValueChange={(val) => assignTeam.mutateAsync({ userId: p.user_id, teamId: val === "none" ? null : val })}>
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
          </section>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
