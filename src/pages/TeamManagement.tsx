import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, UserPlus, Copy, Check, Heart } from "lucide-react";
import { useTeams, useCreateTeam, useJoinTeamByCode, useMyTeam, useTeamMembers, useAssignTeam } from "@/hooks/useTeams";
import { useAllProfiles, useUserRole } from "@/hooks/useProfile";
import { useTeamRewards } from "@/hooks/useRewards";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const REWARD_EMOJIS: Record<string, string> = {
  song: "🎵",
  challenge: "⚡",
  recovery: "🧘",
  dinner: "🍽️",
};

const REWARD_LABELS: Record<string, string> = {
  song: "Starting Song",
  challenge: "Mini Challenge",
  recovery: "Recovery Ritual",
  dinner: "Fancy Dinner",
};

const TeamManagement = () => {
  const { data: team } = useMyTeam();
  const { data: teams } = useTeams();
  const { data: members } = useTeamMembers();
  const { data: profiles } = useAllProfiles();
  const { data: role } = useUserRole();
  const { data: teamRewards } = useTeamRewards();
  const { data: scores } = useLeaderboard();
  const createTeam = useCreateTeam();
  const joinTeam = useJoinTeamByCode();
  const assignTeam = useAssignTeam();
  const { toast } = useToast();

  const [newTeamName, setNewTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

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

        {/* Create Team */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 p-5 rounded-2xl comic-border bg-gradient-to-br from-primary/10 via-card to-accent/10"
        >
          <p className="font-display text-lg text-foreground mb-3">
            <Plus className="inline w-5 h-5 mr-1" /> Create a New Team
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="border-2 border-primary/20"
            />
            <Button onClick={handleCreateTeam} disabled={createTeam.isPending} className="gradient-primary text-primary-foreground font-bold px-6">
              Create
            </Button>
          </div>
        </motion.div>

        {/* Join Team */}
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
            <Input
              placeholder="Enter team code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="border-2 border-primary/20 uppercase tracking-widest font-mono"
            />
            <Button onClick={handleJoinTeam} disabled={joinTeam.isPending} variant="outline" className="font-bold px-6">
              Join
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Has team - show team info
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
                {memberScore && (
                  <p className="text-xs text-primary font-bold">{memberScore.points} pts</p>
                )}
              </div>
            </motion.div>
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

export default TeamManagement;
