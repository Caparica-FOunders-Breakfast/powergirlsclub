import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/contexts/AdminContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import {
  PROGRESSION_DEFAULT,
  useUserPreferences,
  useSetTravelMode,
} from "@/hooks/useUserPreferences";
import { useActivityData } from "@/hooks/useActivityData";
import { useExerciseScorecard, getLevel } from "@/hooks/useExerciseScorecard";
import { usePersonalWorkoutPlan } from "@/hooks/usePersonalWorkoutPlan";
import { supabase } from "@/integrations/supabase/client";
import AdminApiUsage from "@/components/AdminApiUsage";
import { ProgressionEditor } from "@/components/profile-plan/ProgressionEditor";
import { TrainingPlanCard } from "@/components/profile-plan/TrainingPlanCard";
import { useIsMobile } from "@/hooks/use-mobile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SavedIndicator } from "@/components/ui/SavedIndicator";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedCallback } from "@/hooks/useDebounce";

const C = {
  bg: "#FBF9FB",
  ink: "#2B1736",
  grad: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)",
  sub: "#77677E",
  body: "#5E4E66",
  pink: "#C21C70",
  magenta: "#E8308C",
  tile: "#F6F1F7",
  lilac: "#F1E9FE",
  border: "#E4DAE7",
  rowBorder: "#EFE6F1",
  purple: "#6B2FB3",
};
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const card: React.CSSProperties = { background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22 };

const STRENGTH_LEVELS = [
  { icon: "🌱", label: "Beginner" },
  { icon: "⚡", label: "Leveling up" },
  { icon: "💪", label: "Strong" },
  { icon: "🔥", label: "Advanced" },
  { icon: "👑", label: "Very strong" },
] as const;
// Upper bounds (× body weight) for Beginner/Leveling up/Strong/Advanced; the
// top level (Very strong) starts at the last one.
const STRENGTH_BOUNDS = [0.35, 0.6, 0.85, 1.2] as const;
const PROJECTION_WEEKS = 12;
// Exercises not measured in kg — excluded from the overall-level average.
const NON_KG_NAMES = new Set([
  "Plank", "Side Plank", "Battle Ropes", "Farmer Carry", "Push Ups", "Dead Bug",
  "Bird Dog", "Hanging Knee Raises", "Box Jumps", "Bike Sprint (20s all-in + 3min rest)",
  "Sprint / Jump Rope", "Recovery Day", "Rest Day", "Pull Ups", "Glute Bridges",
]);
const segsFor = (n: number) => [0, 1, 2, 3, 4].map((i) => (i < n ? "#E8308C" : "#EFE6F1"));

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
};

const PasswordField = ({ id, label, autoComplete, value, onChange, show, onToggleShow }: PasswordFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {label}
    </Label>
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} className="border-2 border-border pr-10" />
      <button type="button" onClick={onToggleShow} aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={show} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

// A settings row: label + value + action link.
const SettingRow = ({ label, value, action, onClick }: { label: string; value: React.ReactNode; action: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 24px", width: "100%", textAlign: "left", background: "transparent", border: 0, borderBottom: `1px solid ${C.rowBorder}`, cursor: "pointer" }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.sub }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: C.ink }}>{value}</p>
    </div>
    <span style={{ fontSize: 14, fontWeight: 800, color: C.pink }}>{action}</span>
  </button>
);

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: prefs } = useUserPreferences();
  const isAdmin = useIsAdmin();
  const isMobile = useIsMobile();
  const { data: activity } = useActivityData();
  const { data: grouped } = useExerciseScorecard();
  const { plan, travelMode } = usePersonalWorkoutPlan();
  const setTravelMode = useSetTravelMode();
  const navigate = useNavigate();

  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");

  const [weightExpanded, setWeightExpanded] = useState(false);
  const [bodyWeight, setBodyWeight] = useState("");
  const [weightSaved, setWeightSaved] = useState(false);
  const weightSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [progressionEditOpen, setProgressionEditOpen] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const bw = profile?.body_weight ? Number(profile.body_weight) : null;

  // Overall strength level = level of the average ratio (best weight / body
  // weight) across kg-based lifts. Marks the "You" row in the levels table.
  const overallLevelIndex = useMemo(() => {
    if (!grouped || !bw) return -1;
    const ratios: number[] = [];
    grouped.forEach((entries, name) => {
      if (NON_KG_NAMES.has(name)) return;
      const latest = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).find((e) => !e.failed);
      const cw = latest?.weight ?? 0;
      if (cw > 0) ratios.push(cw / bw);
    });
    if (ratios.length === 0) return -1;
    const avg = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    return getLevel(avg).index;
  }, [grouped, bw]);

  const progressionKg = prefs?.progression_kg_per_week ?? PROGRESSION_DEFAULT;
  const displayName = profile?.display_name ?? "";
  const initials = (displayName[0] ?? "?").toUpperCase();

  const stats = useMemo(() => {
    if (!activity || activity.length === 0) return { workouts: 0, bestStreak: 0 };
    const days = new Set(activity.map((e) => e.date));
    const sortedDays = Array.from(days).sort();
    let longest = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const d of sortedDays) {
      const cur = new Date(d + "T00:00:00");
      if (prev && cur.getTime() - prev.getTime() === 86400000) run++;
      else run = 1;
      if (run > longest) longest = run;
      prev = cur;
    }
    return { workouts: days.size, bestStreak: longest };
  }, [activity]);


  const handleToggleTravel = async (on: boolean) => {
    try {
      await setTravelMode.mutateAsync(on);
      toast(on ? { title: "Travel mode on", description: "Bodyweight workouts, your plan is saved." } : { title: "Welcome back", description: "Your normal plan is restored." });
    } catch (e) {
      toast({ title: "Couldn't switch travel mode", description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    }
  };

  const handleStartEditName = () => {
    setName(displayName);
    setEditingName(true);
  };

  const handleNameBlur = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === displayName) {
      setEditingName(false);
      return;
    }
    try {
      await updateProfile.mutateAsync({ display_name: trimmed });
      setEditingName(false);
    } catch {
      toast({ title: "Couldn't save name", variant: "destructive" });
    }
  };

  const flashWeightSaved = () => {
    setWeightSaved(true);
    if (weightSavedTimer.current) clearTimeout(weightSavedTimer.current);
    weightSavedTimer.current = setTimeout(() => setWeightSaved(false), 2000);
  };

  const saveWeightDebounced = useDebouncedCallback(async (raw: string) => {
    const val = parseFloat(raw);
    if (!val || val <= 0) return;
    if (profile?.body_weight && Number(profile.body_weight) === val) return;
    try {
      await updateProfile.mutateAsync({ body_weight: val });
      flashWeightSaved();
    } catch {
      toast({ title: "Couldn't save body weight", variant: "destructive" });
    }
  }, 1000);

  const handleWeightChange = (value: string) => {
    setBodyWeight(value);
    saveWeightDebounced(value);
  };

  const handleUpdateWeight = () => {
    setWeightExpanded(true);
  };

  const openProgressionEdit = () => {
    setProgressionEditOpen(true);
  };

  useEffect(() => () => { if (weightSavedTimer.current) clearTimeout(weightSavedTimer.current); }, []);

  const resetPasswordFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Please fill in all password fields", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "New passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword === currentPassword) {
      toast({ title: "New password must be different from current password", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) {
        toast({ title: "Current password is incorrect", variant: "destructive" });
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        toast({ title: "Couldn't update password", description: updateError.message, variant: "destructive" });
        return;
      }
      resetPasswordFields();
      setPasswordOpen(false);
      toast({ title: "Password updated" });
    } finally {
      setChangingPassword(false);
    }
  };

  const headerStat = (value: string, label: React.ReactNode) => (
    <div style={{ background: "rgba(255,255,255,0.16)", borderRadius: 16, padding: isMobile ? "10px 12px" : "14px 16px" }}>
      <p style={{ margin: 0, ...bangers, fontSize: isMobile ? 28 : 40, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: "4px 0 0", fontSize: isMobile ? 12 : 14, fontWeight: 800 }}>{label}</p>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100%", color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5, padding: isMobile ? "20px 16px 28px" : "32px 24px 64px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>
        {/* Header */}
        <section style={{ background: C.grad, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 24, boxShadow: isMobile ? `4px 4px 0 ${C.ink}` : `6px 6px 0 ${C.ink}`, padding: isMobile ? 18 : "28px 32px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: isMobile ? 14 : 24 }}>
          <span style={{ flex: "none", width: isMobile ? 64 : 96, height: isMobile ? 64 : 96, borderRadius: 999, background: "#FFFFFF", color: C.pink, border: `3px solid ${C.ink}`, ...bangers, fontSize: isMobile ? 36 : 52, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials}</span>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            {editingName ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); }
                  else if (e.key === "Escape") { setName(displayName); setEditingName(false); }
                }}
                placeholder="Your name"
                autoFocus
                className="text-2xl font-display text-foreground"
              />
            ) : (
              <h1 style={{ margin: 0, ...bangers, fontSize: isMobile ? 36 : 52, letterSpacing: 1, lineHeight: 1, display: "flex", alignItems: "center", gap: 10 }}>
                {displayName || "Power Girl"}
                <button type="button" onClick={handleStartEditName} aria-label="Edit name" style={{ width: 28, height: 28, borderRadius: 8, border: 0, background: "rgba(255,255,255,0.2)", color: "#FFFFFF", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg></button>
              </h1>
            )}
            <p style={{ margin: "4px 0 0", fontWeight: 700, color: "rgba(255,255,255,0.9)", wordBreak: "break-all" }}>{user?.email}{isAdmin ? " · Admin" : ""}</p>
          </div>
          <div style={{ flex: "2 1 380px", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {headerStat(String(stats.workouts), "Workouts")}
            {headerStat(String(stats.bestStreak), "Best streak")}
            {headerStat("—", isMobile ? "Weeks won" : <>Weeks won · <a href="/teams" onClick={(e) => { e.preventDefault(); navigate("/teams"); }} style={{ color: "#FFFFFF" }}>join a challenge</a></>)}
          </div>
        </section>

          <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 16 : 24, alignItems: "flex-start" }}>
            {/* LEFT */}
            <div style={{ flex: "3 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>
              <TrainingPlanCard plan={plan} isMobile={isMobile} onSetUp={() => navigate("/plan-setup")} />

              {/* Travel mode */}
              <section style={{ background: travelMode ? C.lilac : "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22, padding: "22px 24px", display: "flex", alignItems: "center", gap: 18 }}>
                <span style={{ flex: "none", width: 48, height: 48, borderRadius: 12, background: C.purple, border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 16l20-8-6 12-3-5-5-1z" /></svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontWeight: 800, fontSize: 19 }}>Travel mode</h2>
                  <p style={{ margin: "2px 0 0", fontSize: 15, color: C.body }}>
                    {travelMode ? "On. Your days switch to bodyweight workouts. Switch off to get your gym plan back." : "No gym nearby? Switch to bodyweight workouts. Your plan comes back when you switch off."}
                  </p>
                </div>
                <button type="button" role="switch" aria-checked={travelMode} aria-label="Travel mode" disabled={setTravelMode.isPending} onClick={() => handleToggleTravel(!travelMode)} style={{ flex: "none", width: 64, height: 36, borderRadius: 999, border: `2px solid ${C.ink}`, background: travelMode ? C.purple : C.border, cursor: "pointer", padding: 0, position: "relative" }}>
                  <span style={{ position: "absolute", top: 3, left: travelMode ? 31 : 3, width: 26, height: 26, borderRadius: 999, background: "#FFFFFF", border: `2px solid ${C.ink}`, boxSizing: "border-box", transition: "left 0.15s" }} />
                </button>
              </section>

              {/* Settings rows */}
              <section style={{ ...card, overflow: "hidden" }}>
                <div>
                  <button type="button" onClick={() => setWeightExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 24px", width: "100%", textAlign: "left", background: "transparent", border: 0, borderBottom: `1px solid ${C.rowBorder}`, cursor: "pointer" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.sub }}>Body weight</p>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: C.ink }}>{bw ? `${bw} kg` : "Not set"}</p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.pink }}>{weightExpanded ? "Close" : "Update"}</span>
                  </button>
                  {weightExpanded && (
                    <div style={{ padding: "0 24px 18px" }}>
                      <Input type="number" placeholder={bw ? String(bw) : "kg"} value={bodyWeight} onChange={(e) => handleWeightChange(e.target.value)} className="h-10 border-2 border-border" />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 16, marginTop: 6 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.sub }}>Saves automatically</p>
                        <SavedIndicator show={weightSaved} />
                      </div>
                    </div>
                  )}
                </div>
                <SettingRow label="Weekly progression" value={<>+{progressionKg} kg per week <span style={{ fontWeight: 600, fontSize: 14, color: C.body }}>· about +{progressionKg * PROJECTION_WEEKS} kg in {PROJECTION_WEEKS} weeks</span></>} action="Change" onClick={openProgressionEdit} />
                <SettingRow label="Profile name" value={displayName || "—"} action="Edit" onClick={handleStartEditName} />
                <button type="button" onClick={() => setPasswordOpen(true)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 24px", width: "100%", textAlign: "left", background: "transparent", border: 0, cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.sub }}>Security</p>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: C.ink }}>Password</p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.pink }}>Change</span>
                </button>
              </section>

              {isAdmin && <AdminApiUsage />}
            </div>

            {/* RIGHT */}
            <div style={{ flex: "2 1 340px", minWidth: 0, display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}>
              <section style={{ ...card, padding: isMobile ? 18 : 24 }}>
                <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 26 : 32, letterSpacing: 1 }}>Strength levels</h2>
                <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: C.body }}>
                  {bw ? `Based on your body weight (${bw} kg). Your overall level is marked.` : "Locked until you set your body weight."}
                </p>
                {bw ? (
                  <>
                    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Highest level first, matching the design. */}
                      {STRENGTH_LEVELS.map((_, i) => STRENGTH_LEVELS.length - 1 - i).map((idx) => {
                        const level = STRENGTH_LEVELS[idx];
                        const range =
                          idx === 0 ? `under ${Math.round(STRENGTH_BOUNDS[0] * bw)} kg`
                          : idx === STRENGTH_LEVELS.length - 1 ? `${Math.round(STRENGTH_BOUNDS[3] * bw)} kg and up`
                          : `${Math.round(STRENGTH_BOUNDS[idx - 1] * bw)}–${Math.round(STRENGTH_BOUNDS[idx] * bw)} kg`;
                        const you = idx === overallLevelIndex;
                        return (
                          <div key={level.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: you ? "#FFF5FA" : "#FFFFFF", border: `2px solid ${you ? C.magenta : C.rowBorder}` }}>
                            <div style={{ display: "flex", gap: 3, width: 64, flex: "none" }}>
                              {segsFor(idx + 1).map((bg, j) => <span key={j} style={{ flex: 1, height: 8, borderRadius: 999, background: bg }} />)}
                            </div>
                            <span style={{ flex: 1, fontWeight: 800 }}>{level.label}</span>
                            {you && <span style={{ padding: "2px 8px", borderRadius: 999, background: C.ink, color: "#FFFFFF", fontSize: 12, fontWeight: 800 }}>You</span>}
                            <span style={{ fontWeight: 700, color: C.body, fontSize: 15 }}>{range}</span>
                          </div>
                        );
                      })}
                    </div>
                    <button type="button" onClick={handleUpdateWeight} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, color: C.pink, background: "transparent", border: 0, cursor: "pointer", padding: 0 }}>Update weight</button>
                  </>
                ) : (
                  <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 14, border: `2px dashed ${C.rowBorder}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg><span style={{ flex: "1 1 180px", fontSize: 14, fontWeight: 700, color: C.body }}>Add your body weight and we'll work out your personal strength levels.</span><button type="button" onClick={handleUpdateWeight} style={{ fontSize: 14, fontWeight: 800, color: C.pink, background: "transparent", border: 0, cursor: "pointer", padding: 0 }}>Set body weight</button></div>
                )}
              </section>

              <section style={{ ...card, padding: 24 }}>
                <h3 style={{ margin: 0, ...bangers, fontSize: 24, letterSpacing: 0.5 }}>Weekly progression</h3>
                <p style={{ margin: "6px 0 0", fontWeight: 800, color: C.ink }}>+{progressionKg} kg added per week</p>
                <p style={{ margin: "2px 0 0", fontSize: 14, color: C.body }}>In {PROJECTION_WEEKS} weeks that's +{progressionKg * PROJECTION_WEEKS} kg on your lifts.</p>
              </section>

              <button type="button" onClick={signOut} style={{ minHeight: 52, border: `2px solid #A3165E`, borderRadius: 14, background: "#FFFFFF", color: "#A3165E", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>
                Sign out
              </button>
            </div>
          </div>
      </div>

      {/* Weekly progression editor */}
      <Dialog open={progressionEditOpen} onOpenChange={(open) => setProgressionEditOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Weekly progression</DialogTitle>
          </DialogHeader>
          <ProgressionEditor onSaved={() => setProgressionEditOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Password modal */}
      <Dialog open={passwordOpen} onOpenChange={(open) => { setPasswordOpen(open); if (!open) resetPasswordFields(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-foreground">Change Password</DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-3 mt-2" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
            <input type="email" name="username" autoComplete="username" value={user?.email ?? ""} readOnly hidden tabIndex={-1} />
            <PasswordField id="current-password" label="Current Password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} show={showCurrent} onToggleShow={() => setShowCurrent((v) => !v)} />
            <PasswordField id="new-password" label="New Password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} show={showNew} onToggleShow={() => setShowNew((v) => !v)} />
            <PasswordField id="confirm-password" label="Confirm New Password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggleShow={() => setShowConfirm((v) => !v)} />
            <Button type="submit" disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword} className="h-11 mt-1 gradient-primary text-primary-foreground font-bold">
              {changingPassword ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
