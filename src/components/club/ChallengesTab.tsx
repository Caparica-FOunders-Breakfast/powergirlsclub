import { useState } from "react";
import { motion } from "framer-motion";
import RewardJourney from "@/components/RewardJourney";
import { Users, Plus, UserPlus, Copy, Check, Heart, CalendarIcon, ArrowRight, X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useTeams, useCreateTeam, useJoinTeamByCode, useMyTeam, useAssignTeam } from "@/hooks/useTeams";
import { useAllProfiles, useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/contexts/AdminContext";
import { useTeamWeek } from "@/hooks/useClub";
import { useActiveChallenge, useChallengeParticipants, useCreateChallenge, useJoinChallenge, useLeaveChallenge, useDeleteChallenge, useChallengeProgress } from "@/hooks/useChallenge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { daysLeftLabel, useTeamChallengeWeek } from "@/components/club/teamWeek";

const C = { ink: "#2B1736", body: "#5E4E66", sub: "#77677E", pink: "#C21C70", magenta: "#E8308C", border: "#E4DAE7", lilac: "#F4EDFE" };
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const box: React.CSSProperties = { padding: 18, border: `2px solid ${C.ink}`, borderRadius: 20, background: "#FFFFFF" };
const label: React.CSSProperties = { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.body };
const field: React.CSSProperties = { flex: 1, minWidth: 0, height: 48, padding: "0 14px", border: `2px solid ${C.ink}`, borderRadius: 12, fontSize: 16, boxSizing: "border-box", fontFamily: "inherit", color: C.ink };

/**
 * Club > Challenges (design: club-feed.dc.html). The 4-week team challenge:
 * your team's card, the team ranking and your teammates this week, or how it
 * works plus "Start a team" / "Join with a code". The challenge dates, rewards
 * and the admin team assignment from the old Challenge page stay below.
 */
const ChallengesTab = ({ weekStart }: { weekStart: string }) => {
  const { data: team } = useMyTeam();
  const { data: teams } = useTeams();
  const { data: profiles } = useAllProfiles();
  const { data: profile } = useProfile();
  const isAdmin = useIsAdmin();
  const { data: teamWeek } = useTeamWeek(weekStart);
  const tw = useTeamChallengeWeek(weekStart);
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

  const teamCode = (teamWeek?.team.code ?? (team as { team_code?: string } | null)?.team_code ?? "").toUpperCase();
  const standings = teamWeek?.standings ?? [];
  const mates = teamWeek?.members ?? [];
  const shareText = `Join my Power Club team "${team?.name ?? ""}". Code: ${teamCode} ${window.location.origin}/club/challenges`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {team ? (
          <>
            <section style={{ ...box, boxShadow: `6px 6px 0 ${C.magenta}` }}>
              <p style={label}>{tw.weekOf ? `4-WEEK TEAM CHALLENGE · WEEK ${tw.weekOf} OF 4` : "TEAM CHALLENGE · THIS WEEK"}</p>
              <h2 style={{ margin: "4px 0 0", ...bangers, fontSize: 34, letterSpacing: 1, lineHeight: 1 }}>{team.name}</h2>
              <p style={{ margin: "6px 0 0", fontSize: 15, color: C.body }}>Each finished workout earns 1 point. A winner every week. {daysLeftLabel(tw.daysLeft)}.</p>
              {standings.length > 0 && (
                <ol aria-label="Team ranking this week" style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {standings.map((t, i) => (
                    <li key={t.team_id} aria-current={t.is_mine ? "true" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: t.is_mine ? "#FFF0F7" : "#FBF9FB", border: `2px solid ${t.is_mine ? C.magenta : C.border}` }}>
                      <span style={{ flex: "none", width: 28, ...bangers, fontSize: 24, lineHeight: 1 }}>{i + 1}</span>
                      <span style={{ flex: 1, minWidth: 0, fontWeight: 800 }}>{t.name}{t.is_mine ? " (you)" : ""}</span>
                      <span style={{ flex: "none", fontWeight: 800 }}>{t.points} {t.points === 1 ? "pt" : "pts"}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section style={box}>
              <p style={label}>YOUR TEAM THIS WEEK</p>
              {mates.length > 0 ? (
                <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {mates.map((m, i) => (
                    <li key={`${m.first_name}-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 15 }}>
                      <span style={{ fontWeight: 800 }}>{m.first_name}{m.is_me ? " (you)" : ""}</span>
                      <span style={{ color: C.body }}>{m.done} of {m.planned} workouts</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: "10px 0 0", fontSize: 15, color: C.body }}>Your teammates show up here once the week gets going.</p>
              )}
              {teamCode && (
                <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: C.lilac, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: "1 1 200px", fontSize: 14, fontWeight: 700 }}>Team code: {teamCode} · share it so friends can join</span>
                  <button type="button" onClick={copyTeamCode} style={{ minHeight: 40, padding: "0 12px", border: `2px solid ${C.ink}`, borderRadius: 10, background: "#FFFFFF", color: C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{copied ? "Copied" : "Copy"}</button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" style={{ minHeight: 40, padding: "0 12px", display: "inline-flex", alignItems: "center", border: `2px solid ${C.ink}`, borderRadius: 10, background: C.ink, color: "#FFFFFF", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>WhatsApp</a>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section style={box}>
              <p style={label}>4-WEEK TEAM CHALLENGE</p>
              <h2 style={{ margin: "4px 0 0", ...bangers, fontSize: 32, letterSpacing: 1, lineHeight: 1 }}>Train with friends. Win the week.</h2>
              <ol style={{ margin: "12px 0 0", paddingLeft: 22, fontSize: 15, display: "flex", flexDirection: "column", gap: 2, listStyle: "decimal" }}>
                <li>Make a team or join with a code.</li>
                <li>Everyone trains their own plan.</li>
                <li>Each finished workout earns a point.</li>
                <li>A winner every week.</li>
              </ol>
            </section>
            <section style={box}>
              <form onSubmit={(e) => { e.preventDefault(); void handleCreateTeam(); }}>
                <label htmlFor="cf-team" style={{ display: "block", fontWeight: 800 }}>Start a team</label>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <input id="cf-team" type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Team name" maxLength={40} style={field} />
                  <button type="submit" disabled={createTeam.isPending || !newTeamName.trim()} style={{ flex: "none", minHeight: 48, padding: "0 16px", border: `2px solid ${C.ink}`, borderRadius: 12, background: C.ink, color: "#FFFFFF", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{createTeam.isPending ? "Creating..." : "Create"}</button>
                </div>
              </form>
              <form onSubmit={(e) => { e.preventDefault(); void handleJoinTeam(); }}>
                <label htmlFor="cf-code" style={{ display: "block", marginTop: 16, fontWeight: 800 }}>Join with a code</label>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <input id="cf-code" type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. PWR482" maxLength={6} autoCapitalize="characters" style={{ ...field, textTransform: "uppercase" }} />
                  <button type="submit" disabled={joinTeam.isPending || !joinCode.trim()} style={{ flex: "none", minHeight: 48, padding: "0 16px", border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", color: C.ink, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{joinTeam.isPending ? "Joining..." : "Join"}</button>
                </div>
              </form>
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
  );
};

export default ChallengesTab;
