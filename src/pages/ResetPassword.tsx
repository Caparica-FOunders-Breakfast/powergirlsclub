import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// Palette ported from the "Harley" design (claude.ai design canvas).
const C = {
  ink: "#2B1736",
  grad: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)",
  sub: "#77677E",
  pink: "#C21C70",
};

const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const fieldStyle: React.CSSProperties = {
  height: 52,
  padding: "0 56px 0 16px",
  border: `2px solid ${C.ink}`,
  borderRadius: 12,
  background: "#FFFFFF",
  font: "inherit",
  color: C.ink,
  boxSizing: "border-box",
  width: "100%",
};
const labelStyle: React.CSSProperties = { fontWeight: 800, fontSize: 15 };

// Snapshot the URL synchronously at module load — before React mounts and
// before Supabase's detectSessionInUrl clears the hash/query.
const initialUrlSnapshot = (() => {
  if (typeof window === "undefined") return { hasRecoveryParams: false, errorDescription: null as string | null };
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const hasRecoveryParams =
    hash.get("type") === "recovery" ||
    hash.has("access_token") ||
    query.has("code");
  const errorDescription =
    hash.get("error_description") || query.get("error_description") || null;
  return { hasRecoveryParams, errorDescription };
})();

type Status = "checking" | "ready" | "invalid";

const EyeIcon = ({ off }: { off: boolean }) =>
  off ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7c2 0 3.8.6 5.3 1.5M22 12s-3.5 7-10 7c-2 0-3.8-.6-5.3-1.5M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialUrlSnapshot.errorDescription,
  );
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (initialUrlSnapshot.errorDescription) {
      setStatus("invalid");
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setStatus("ready");
        return;
      }
      if (event === "INITIAL_SESSION") {
        if (session) {
          setStatus("ready");
        } else if (!initialUrlSnapshot.hasRecoveryParams) {
          setStatus("invalid");
        }
      }
      if (event === "SIGNED_IN" && session) {
        setStatus("ready");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated!", description: "You can now log in with your new password." });
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Shared gradient shell.
  const shell = (children: React.ReactNode) => (
    <div
      className="pc-auth min-h-screen flex items-center justify-center p-6"
      style={{ background: C.grad, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif" }}
    >
      {children}
    </div>
  );

  if (status === "checking") {
    return shell(
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />,
    );
  }

  if (status === "invalid") {
    return shell(
      <div style={{ width: "100%", maxWidth: 420, background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 20, boxShadow: `8px 8px 0 ${C.ink}`, padding: 32, textAlign: "center" }}>
        <h2 style={{ margin: 0, ...bangers, fontSize: 40, letterSpacing: 1 }}>Link expired</h2>
        <p style={{ margin: "12px 0 0", color: C.sub }}>
          {errorMessage ?? "This password reset link is invalid or has expired. Request a new one from the log-in page."}
        </p>
        <button
          onClick={() => navigate("/auth")}
          style={{ marginTop: 24, width: "100%", height: 52, background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, font: "inherit", fontWeight: 800, fontSize: 17, cursor: "pointer" }}
        >
          Back to log in
        </button>
      </div>,
    );
  }

  return shell(
    <form
      onSubmit={handleReset}
      style={{ width: "100%", maxWidth: 420, background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 20, boxShadow: `8px 8px 0 ${C.ink}`, padding: 32 }}
    >
      <h2 style={{ margin: 0, ...bangers, fontSize: 44, letterSpacing: 1 }}>Set a new password</h2>
      <p style={{ margin: "6px 0 0", color: C.sub }}>Choose a new password for your account.</p>

      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 8 }}>
        <label htmlFor="new-password" style={labelStyle}>New password</label>
        <div style={{ position: "relative" }}>
          <input
            id="new-password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            autoComplete="new-password"
            style={fieldStyle}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            style={{ position: "absolute", right: 4, top: 4, width: 44, height: 44, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <EyeIcon off={showPw} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        <label htmlFor="confirm-password" style={labelStyle}>Confirm password</label>
        <input
          id="confirm-password"
          type={showPw ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your new password"
          required
          minLength={6}
          autoComplete="new-password"
          style={{ ...fieldStyle, padding: "0 16px" }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{ marginTop: 28, width: "100%", height: 56, background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, font: "inherit", fontWeight: 800, fontSize: 18, cursor: "pointer", opacity: loading ? 0.7 : 1 }}
      >
        {loading ? "Updating..." : "Update password"}
      </button>
    </form>,
  );
};

export default ResetPassword;
