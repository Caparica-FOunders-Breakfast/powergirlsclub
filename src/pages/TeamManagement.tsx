import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, UserPlus } from "lucide-react";
import { useTeams, useCreateTeam, useAssignTeam } from "@/hooks/useTeams";
import { useAllProfiles, useUserRole } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TeamManagement = () => {
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const { data: profiles, isLoading: profilesLoading } = useAllProfiles();
  const { data: role } = useUserRole();
  const createTeam = useCreateTeam();
  const assignTeam = useAssignTeam();
  const { toast } = useToast();
  const [newTeamName, setNewTeamName] = useState("");

  const isAdmin = role === "admin";

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      await createTeam.mutateAsync(newTeamName.trim());
      setNewTeamName("");
      toast({ title: "Team created! 🎉" });
    } catch {
      toast({ title: "Error creating team", variant: "destructive" });
    }
  };

  const handleAssign = async (userId: string, teamId: string) => {
    try {
      await assignTeam.mutateAsync({ userId, teamId: teamId === "none" ? null : teamId });
      toast({ title: "Team updated! ✅" });
    } catch {
      toast({ title: "Error assigning team", variant: "destructive" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto text-center">
        <h1 className="text-3xl font-display text-foreground mb-4">Teams</h1>
        <p className="text-muted-foreground font-bold">Only admins can manage teams.</p>

        {teams && teams.length > 0 && (
          <div className="mt-6 space-y-3">
            {teams.map((team) => {
              const members = profiles?.filter((p: any) => p.team_id === team.id) || [];
              return (
                <div key={team.id} className="p-4 rounded-2xl bg-card border-2 border-border text-left">
                  <p className="font-display text-lg text-foreground">{team.name}</p>
                  <p className="text-xs text-muted-foreground font-bold mt-1">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {members.map((m: any) => (
                      <span
                        key={m.id}
                        className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                      >
                        {m.display_name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-6">
        <h1 className="text-4xl font-display text-foreground">
          <Users className="inline w-8 h-8 text-neon-teal mr-2" />
          Team Management
        </h1>
      </motion.div>

      {/* Create team */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6 p-4 rounded-2xl bg-card border-2 border-border"
      >
        <p className="font-bold text-sm text-foreground mb-2">
          <Plus className="inline w-4 h-4 mr-1" /> Create New Team
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Team name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="border-2 border-primary/20"
          />
          <Button onClick={handleCreateTeam} className="gradient-primary text-primary-foreground font-bold px-6">
            Create
          </Button>
        </div>
      </motion.div>

      {/* Teams overview */}
      {teams && teams.length > 0 && (
        <div className="space-y-4 mb-6">
          {teams.map((team) => {
            const members = profiles?.filter((p: any) => p.team_id === team.id) || [];
            return (
              <motion.div
                key={team.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="p-4 rounded-2xl bg-card border-2 border-border"
              >
                <p className="font-display text-xl text-foreground">{team.name}</p>
                <p className="text-xs text-muted-foreground font-bold mt-1">
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {members.map((m: any) => (
                    <span
                      key={m.id}
                      className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                    >
                      {m.display_name}
                    </span>
                  ))}
                  {members.length === 0 && (
                    <span className="text-xs text-muted-foreground">No members yet</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Assign users to teams */}
      <h2 className="font-display text-2xl text-foreground mb-3">
        <UserPlus className="inline w-6 h-6 mr-1" /> Assign Members
      </h2>
      {(profilesLoading || teamsLoading) && <div className="h-20 bg-muted rounded-xl animate-pulse" />}
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
                onValueChange={(val) => handleAssign(profile.user_id, val)}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="No team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
