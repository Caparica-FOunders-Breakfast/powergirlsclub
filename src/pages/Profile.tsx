import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  LogOut,
  Pencil,
  Scale,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile, useUserRole } from "@/hooks/useProfile";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useActivityData } from "@/hooks/useActivityData";
import { supabase } from "@/integrations/supabase/client";
import TrainingPreferences from "@/components/TrainingPreferences";
import AdminApiUsage from "@/components/AdminApiUsage";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SavedIndicator } from "@/components/ui/SavedIndicator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedCallback } from "@/hooks/useDebounce";

type MobileTab = "training" | "body" | "account";

const STRENGTH_LEVELS = [
  { icon: "🌱", label: "Beginner" },
  { icon: "⚡", label: "Leveling Up" },
  { icon: "💪", label: "Strong" },
  { icon: "🔥", label: "Very Strong" },
  { icon: "👑", label: "Elite" },
] as const;
// Boundaries are multiples of body weight. The first four define the upper bound
// of the matching level; the fifth is the lower bound at which Elite starts.
const STRENGTH_RATIOS = [0.35, 0.6, 0.85, 1.2, 1.6] as const;

type PasswordFieldProps = {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
};

const PasswordField = ({
  id,
  label,
  autoComplete,
  value,
  onChange,
  show,
  onToggleShow,
}: PasswordFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {label}
    </Label>
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-2 border-border pr-10"
      />
      <button
        type="button"
        onClick={onToggleShow}
        aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        aria-pressed={show}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();
  const { data: activity } = useActivityData();
  // Prime the user_preferences cache in parallel with everything else on this page.
  useUserPreferences();

  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [mobileTab, setMobileTab] = useState<MobileTab>("training");

  // Inline name edit (triggered from Identity card icon OR Account card row).
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");

  // Body weight inline expander on Account card.
  const [weightExpanded, setWeightExpanded] = useState(false);
  const [bodyWeight, setBodyWeight] = useState("");
  const [weightSaved, setWeightSaved] = useState(false);
  const weightSavedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Password modal.
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const bw = profile?.body_weight ? Number(profile.body_weight) : null;
  const displayName = profile?.display_name ?? "";
  const initials = (displayName[0] ?? "?").toUpperCase();
  const isAdmin = role === "admin";

  // Real stats from completed exercise logs. Weeks Won has no historical winner store, so "—".
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

  const handleStartEditName = () => {
    setName(displayName);
    setEditingName(true);
  };

  const handleNameBlur = async () => {
    const trimmed = name.trim();
    // Close without saving on empty or no-op.
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
      await updateProfile.mutateAsync({ body_weight: val } as any);
      flashWeightSaved();
    } catch {
      toast({ title: "Couldn't save body weight", variant: "destructive" });
    }
  }, 1000);

  const handleWeightChange = (value: string) => {
    setBodyWeight(value);
    saveWeightDebounced(value);
  };

  useEffect(
    () => () => {
      if (weightSavedTimer.current) clearTimeout(weightSavedTimer.current);
    },
    [],
  );

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
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
      toast({ title: "Password updated 🔑" });
    } finally {
      setChangingPassword(false);
    }
  };

  // Sections are visible on desktop always; on mobile only when their tab is active.
  const showIf = (tab: MobileTab) => (mobileTab === tab ? "" : "hidden lg:block");

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto lg:max-w-6xl lg:px-8 lg:pb-8">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-4 lg:text-left lg:mb-6"
      >
        <h1 className="text-4xl font-display text-foreground">Profile</h1>
      </motion.div>

      {/* Mobile tab bar */}
      <div className="lg:hidden flex items-center gap-1 p-1 bg-muted rounded-xl mb-4">
        {(
          [
            { key: "training", label: "Training" },
            { key: "body", label: "Body" },
            { key: "account", label: "Account" },
          ] as { key: MobileTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setMobileTab(t.key)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all",
              mobileTab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Two-column grid on desktop, single column on mobile */}
      <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6 lg:items-start">
        {/* Left column */}
        <aside className="space-y-4">
          {/* Identity card */}
          <motion.section
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "relative rounded-2xl border-2 border-border bg-card p-6 text-center",
              showIf("account")
            )}
          >
            {!editingName && (
              <button
                onClick={handleStartEditName}
                aria-label="Edit name"
                className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}

            <div
              className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-display text-primary-foreground"
              style={{ backgroundColor: "#FF2D87" }}
            >
              {initials}
            </div>

            {editingName ? (
              <div className="flex flex-col gap-1 mb-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.currentTarget as HTMLInputElement).blur();
                    } else if (e.key === "Escape") {
                      setName(displayName);
                      setEditingName(false);
                    }
                  }}
                  placeholder="Your name"
                  className="border-2 border-primary/30 text-center"
                  autoFocus
                />
                <p className="text-[10px] font-bold text-muted-foreground">
                  Press Enter or click away to save · Esc to cancel
                </p>
              </div>
            ) : (
              <h2 className="text-2xl font-display text-foreground lg:text-3xl">
                {displayName || "—"}
              </h2>
            )}

            <p className="text-sm text-muted-foreground font-bold break-all">{user?.email}</p>

            {isAdmin && (
              <div className="mt-2">
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold uppercase">
                  Admin 👑
                </span>
              </div>
            )}
          </motion.section>

          {/* Stats card */}
          <motion.section
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn("grid grid-cols-3 gap-3", showIf("body"))}
          >
            {[
              {
                icon: Dumbbell,
                label: "Workouts",
                value: String(stats.workouts),
                color: "text-secondary",
              },
              {
                icon: Flame,
                label: "Best Streak",
                value: String(stats.bestStreak),
                color: "text-accent",
              },
              {
                icon: Trophy,
                label: "Weeks Won",
                value: "—",
                color: "text-primary",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-xl border-2 border-border p-3 text-center"
              >
                <stat.icon className={cn("w-6 h-6 mx-auto mb-1", stat.color)} />
                <p className="font-display text-2xl text-foreground tabular-nums">{stat.value}</p>
                <p className="text-xs font-bold text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.section>

          {/* Strength Levels reference card */}
          <motion.section
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "rounded-2xl border-2 border-border bg-card p-4",
              showIf("body")
            )}
          >
            <div className="mb-3">
              <h3 className="font-display text-lg text-foreground">Your Strength Levels</h3>
              <p className="text-[11px] font-bold text-muted-foreground">
                {bw
                  ? `Based on your body weight (${bw} kg)`
                  : "Set your body weight to see your ranges"}
              </p>
            </div>
            {bw && (
              <div className="space-y-2">
                {STRENGTH_LEVELS.map((level, idx) => {
                  const val = Math.round(STRENGTH_RATIOS[idx] * bw);
                  const prevVal = idx > 0 ? Math.round(STRENGTH_RATIOS[idx - 1] * bw) : 0;
                  const range =
                    idx === 0
                      ? `< ${val} kg`
                      : idx === STRENGTH_LEVELS.length - 1
                      ? `≥ ${val} kg`
                      : `${prevVal}–${val} kg`;
                  return (
                    <div key={level.label} className="flex items-center gap-3">
                      <span className="text-xl w-6 text-center shrink-0">{level.icon}</span>
                      <span className="text-sm font-bold text-foreground flex-1 truncate">
                        {level.label}
                      </span>
                      <span className="text-sm font-bold text-muted-foreground tabular-nums shrink-0">
                        {range}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.section>

          {/* Account rows card */}
          <motion.section
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "rounded-2xl border-2 border-border bg-card overflow-hidden divide-y divide-border",
              showIf("account")
            )}
          >
            {/* Body weight (expandable) */}
            <div>
              <button
                onClick={() => setWeightExpanded((v) => !v)}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left"
              >
                <Scale className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    Body weight
                  </p>
                  <p className="text-sm font-bold text-foreground">{bw ? `${bw} kg` : "Not set"}</p>
                </div>
                <ChevronRight
                  className={cn(
                    "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
                    weightExpanded && "rotate-90"
                  )}
                />
              </button>
              {weightExpanded && (
                <div className="px-4 pb-4 space-y-1.5">
                  <Input
                    type="number"
                    placeholder={bw ? String(bw) : "kg"}
                    value={bodyWeight}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    className="h-9 text-sm border-2 border-border"
                  />
                  <div className="flex items-center justify-between min-h-[16px]">
                    <p className="text-[10px] font-bold text-muted-foreground">
                      Saves automatically
                    </p>
                    <SavedIndicator show={weightSaved} />
                  </div>
                </div>
              )}
            </div>

            {/* Change password — opens modal */}
            <button
              onClick={() => setPasswordOpen(true)}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left"
            >
              <KeyRound className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  Security
                </p>
                <p className="text-sm font-bold text-foreground">Change password</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>

            {/* Edit profile name — triggers inline edit on Identity card */}
            <button
              onClick={handleStartEditName}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left"
            >
              <Pencil className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                  Profile
                </p>
                <p className="text-sm font-bold text-foreground">Edit profile name</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </motion.section>

          {/* Sign out */}
          <Button
            onClick={signOut}
            variant="outline"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
            }}
            className={cn(
              "h-12 font-bold text-destructive border-destructive/30 hover:bg-destructive/10",
              showIf("account")
            )}
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </aside>

        {/* Right column — Training preferences (+ admin tools) */}
        <main className={cn(showIf("training"), "space-y-4")}>
          <TrainingPreferences />
          {isAdmin && <AdminApiUsage />}
        </main>
      </div>

      {/* Password modal */}
      <Dialog
        open={passwordOpen}
        onOpenChange={(open) => {
          setPasswordOpen(open);
          if (!open) resetPasswordFields();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-foreground">Change Password</DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col gap-3 mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleChangePassword();
            }}
          >
            <input
              type="email"
              name="username"
              autoComplete="username"
              value={user?.email ?? ""}
              readOnly
              hidden
              tabIndex={-1}
            />
            <PasswordField
              id="current-password"
              label="Current Password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrent}
              onToggleShow={() => setShowCurrent((v) => !v)}
            />
            <PasswordField
              id="new-password"
              label="New Password"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPassword}
              show={showNew}
              onToggleShow={() => setShowNew((v) => !v)}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm New Password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirm}
              onToggleShow={() => setShowConfirm((v) => !v)}
            />
            <Button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="h-11 mt-1 gradient-primary text-primary-foreground font-bold"
            >
              {changingPassword ? "Updating…" : "Update Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
