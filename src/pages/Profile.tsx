import { motion } from "framer-motion";
import { LogOut, Dumbbell, Flame, Trophy, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile, useUserRole } from "@/hooks/useProfile";
import { useMyTeam } from "@/hooks/useTeams";
import { useMyRewards } from "@/hooks/useRewards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = ["#FF2D87", "#00F5D4", "#FFE600", "#5271FF", "#FF6B35", "#A855F7"];

const REWARD_EMOJIS: Record<string, string> = {
  song: "🎵",
  challenge: "⚡",
  recovery: "🧘",
  dinner: "🍽️",
};

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: role } = useUserRole();
  const { data: team } = useMyTeam();
  const { data: myRewards } = useMyRewards();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

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

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  // Get recent rewards (last 4 weeks)
  const recentRewards = myRewards?.slice(0, 4) || [];

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
