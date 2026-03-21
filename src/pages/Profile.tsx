import { useState } from "react";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LogOut, Dumbbell, Flame, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile, useUserRole } from "@/hooks/useProfile";
import { useMyTeam } from "@/hooks/useTeams";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
          <h2 className="text-3xl font-display text-foreground">
            {profile?.display_name}
          </h2>
        )}

        <p className="text-sm text-muted-foreground font-bold">{user?.email}</p>

        {role === "admin" && (
          <div className="flex items-center justify-center mt-2">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold uppercase">
              Admin 👑
            </span>
          </div>
        )}

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

      {/* Training Principles */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl comic-border p-5 mb-6"
      >
        <h2 className="text-2xl font-display text-foreground mb-1">🌿 Training Principles</h2>
        <p className="text-sm text-muted-foreground font-bold mb-4">Stacy Sims Style</p>

        <Accordion type="multiple" className="space-y-1">
          <AccordionItem value="lift-heavy" className="border-border/50">
            <AccordionTrigger className="text-base font-bold hover:no-underline">💪 1. Lift Heavy</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Train for strength, not fatigue.</p>
              <p>✅ Do 2–3 strength sessions per week</p>
              <p>✅ Focus on: Squats · Deadlifts · Push (push-ups / bench) · Pull (rows / pull-ups) · Lunges</p>
              <p className="font-semibold text-foreground">How to train:</p>
              <p>✅ 4–8 reps · Heavy weight · Full rest between sets</p>
              <p className="font-semibold text-primary">👉 Aim to feel strong, not exhausted.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="hiit" className="border-border/50">
            <AccordionTrigger className="text-base font-bold hover:no-underline">⚡ 2. Add Short HIIT</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Use intensity instead of long cardio.</p>
              <p className="font-semibold text-foreground">Example session:</p>
              <p>✅ 5 min warm-up · 30 sec all-out · 2 min easy · Repeat 6–8 times</p>
              <p className="font-semibold text-primary">👉 Keep it short and powerful (20–25 min total)</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="no-long-cardio" className="border-border/50">
            <AccordionTrigger className="text-base font-bold hover:no-underline">🌊 3. Avoid Long Slow Cardio</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Don't rely on:</p>
              <p>❌ Long runs · Daily spin classes · Moderate, steady workouts</p>
              <p>These can increase cortisol, reduce muscle, and slow metabolism.</p>
              <p className="font-semibold text-primary">👉 Choose short, purposeful training instead.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="power" className="border-border/50">
            <AccordionTrigger className="text-base font-bold hover:no-underline">🔥 4. Train Power</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Include explosive work weekly.</p>
              <p>✅ 1–2 sessions per week</p>
              <p>✅ Box jumps · Kettlebell swings · Sprint intervals · Medicine ball throws</p>
              <p className="font-semibold text-primary">👉 Power declines faster than strength, so train it.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="core" className="border-border/50">
            <AccordionTrigger className="text-base font-bold hover:no-underline">🧘‍♀️ 5. Build Core & Stability</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Support performance and prevent injury.</p>
              <p>✅ Focus on: Deep core · Anti-rotation · Single-leg stability</p>
              <p>✅ Examples: Dead bugs · Pallof press · Side plank · Single-leg work</p>
              <p className="font-semibold text-primary">👉 Strong core = better movement everywhere.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cycle" className="border-none">
            <AccordionTrigger className="text-base font-bold hover:no-underline">🌙 6. Train with Your Cycle</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Adjust intensity based on your phase.</p>
              <p className="font-semibold text-foreground">Follicular phase (after period):</p>
              <p>✅ Push intensity · Lift heavier · Do HIIT</p>
              <p className="font-semibold text-foreground">Luteal phase (before period):</p>
              <p>✅ Reduce intensity · Focus on technique · Add mobility</p>
              <p className="font-semibold text-primary">👉 Your body is not inconsistent, it's cyclical.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </motion.div>

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
