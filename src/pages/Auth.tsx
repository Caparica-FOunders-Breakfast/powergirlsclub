import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { setKeepLoggedIn } from "@/integrations/supabase/authStorage";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlags } from "@/hooks/useAppSettings";

// Palette ported from the "Harley" login design (claude.ai design canvas).
const C = {
  bg: "#FBF9FB",
  ink: "#2B1736",
  grad: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)",
  hl: "#FFD6EA",
  sub: "#77677E",
  pink: "#C21C70",
  lilac: "#F1E9FE",
  rowBg: "#F6F1F7",
  rowBorder: "#E4DAE7",
  tile: "#E8308C",
  purple: "#6B2FB3",
};

const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const fieldStyle: React.CSSProperties = {
  height: 52,
  padding: "0 16px",
  border: `2px solid ${C.ink}`,
  borderRadius: 12,
  background: "#FFFFFF",
  font: "inherit",
  color: C.ink,
  boxSizing: "border-box",
  width: "100%",
};
const labelStyle: React.CSSProperties = { fontWeight: 800, fontSize: 15 };
const primaryBtn: React.CSSProperties = {
  marginTop: 28,
  width: "100%",
  height: 56,
  background: C.pink,
  color: "#FFFFFF",
  border: `2px solid ${C.ink}`,
  borderRadius: 14,
  boxShadow: `4px 4px 0 ${C.ink}`,
  font: "inherit",
  fontWeight: 800,
  fontSize: 18,
  cursor: "pointer",
};

// Static illustration of a member's week (the real tracker lives in the app).
const weekDays: { label: string; state: "done" | "today" | "empty" }[] = [
  { label: "Mon", state: "done" },
  { label: "Tue", state: "empty" },
  { label: "Wed", state: "done" },
  { label: "Thu", state: "today" },
  { label: "Fri", state: "empty" },
  { label: "Sat", state: "empty" },
  { label: "Sun", state: "empty" },
];

const Heart = ({ size = 22, fill = C.hl }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden="true">
    <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
  </svg>
);

const Auth = () => {
  const [searchParams] = useSearchParams();
  // Landing-page CTAs open this in a specific mode (/auth?mode=signup|login).
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);
  // Checked → session persists in localStorage; unchecked → sessionStorage
  // (cleared when the browser closes). Applied in handleSubmit before sign-in.
  const [keepLoggedIn, setKeepLoggedInState] = useState(true);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const { data: flags } = useFeatureFlags();
  const signupsEnabled = flags?.signups_enabled ?? true;

  // If signups are turned off mid-flow, snap the user back to login.
  useEffect(() => {
    if (!signupsEnabled && !isLogin) setIsLogin(true);
  }, [signupsEnabled, isLogin]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Check your email! 📧",
        description: "We sent you a link to reset your password.",
      });
      setIsForgotPassword(false);
    } catch (err: any) {
      toast({ title: "Oops!", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Decide where the session is stored before it's created. Signups always
      // persist; logins honor the "Keep me logged in" checkbox.
      setKeepLoggedIn(isLogin ? keepLoggedIn : true);
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
        toast({
          title: "Welcome to Power Club!",
          description: "Check your email to confirm your account.",
        });
      }
    } catch (err: any) {
      toast({ title: "Oops!", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const heading = isForgotPassword ? "Reset password" : isLogin ? "Welcome back!" : "Join the club!";
  const subheading = isForgotPassword
    ? "Enter your email and we'll send you a reset link."
    : isLogin
      ? "Good to see you again. Ready to train?"
      : "Create your account and start this week.";
  const submitLabel = isForgotPassword
    ? loading
      ? "Sending..."
      : "Send reset link"
    : loading
      ? "Loading..."
      : isLogin
        ? "Let's go!"
        : "Join for €5/month";

  return (
    <div
      className="pc-auth min-h-screen flex flex-col-reverse lg:flex-row"
      style={{ background: C.bg, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 17, lineHeight: 1.5 }}
    >
      {/* BRAND PANEL */}
      <section
        className="lg:flex-1 lg:border-r-2 px-6 py-10 lg:px-14 lg:py-12 flex flex-col justify-between gap-10"
        style={{ background: C.grad, color: "#FFFFFF", borderColor: C.ink }}
      >
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#FFFFFF", textDecoration: "none", ...bangers, fontSize: 32, letterSpacing: 1, alignSelf: "flex-start" }}>
          Power Club
          <Heart />
        </Link>

        <div>
          <h1 style={{ margin: 0, ...bangers, fontSize: "clamp(52px, 6vw, 80px)", lineHeight: 0.95, letterSpacing: 1.5 }}>
            Your plan is waiting.
            <span style={{ display: "block", color: C.hl }}>Let's lift.</span>
          </h1>
          <p style={{ margin: "20px 0 0", maxWidth: 440, fontSize: 19, color: "rgba(255,255,255,0.92)" }}>
            Log in to see this week's workouts, your streak and your progress over time.
          </p>

          {/* Preview card — static illustration */}
          <div style={{ marginTop: 36, maxWidth: 440, background: "#FFFFFF", color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 20, boxShadow: `6px 6px 0 ${C.ink}`, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <p style={{ margin: 0, ...bangers, fontSize: 26, letterSpacing: 0.5 }}>This week</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.sub }}>2 workouts this week</p>
            </div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, textAlign: "center", fontSize: 13, fontWeight: 800 }}>
              {weekDays.map((d, i) => {
                const box =
                  d.state === "done"
                    ? { background: C.tile, border: `2px solid ${C.ink}` }
                    : d.state === "today"
                      ? { background: "#FFFFFF", border: `2px dashed ${C.purple}` }
                      : { background: C.rowBg, border: `2px solid ${C.rowBorder}` };
                const labelColor = d.state === "today" ? C.purple : d.state === "empty" ? C.sub : C.ink;
                return (
                  <div key={i}>
                    <div style={{ height: 36, borderRadius: 10, ...box }} />
                    <span style={{ display: "block", marginTop: 4, color: labelColor }}>{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: C.lilac, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 700 }}>
              <span>Current streak</span>
              <span style={{ color: C.purple }}>3 days 🔥</span>
            </div>
          </div>
        </div>

        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.88)" }}>
          Stronger together, anywhere · Part of Caparica Founders Breakfast
        </p>
      </section>

      {/* FORM PANEL */}
      <section className="lg:flex-1 px-6 py-8 lg:px-14 flex flex-col">
        <Link to="/" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", color: C.ink, textDecoration: "none", fontWeight: 800, fontSize: 15 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Back to home
        </Link>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
          <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} style={{ width: "100%", maxWidth: 420 }}>
            <h2 style={{ margin: 0, ...bangers, fontSize: 52, letterSpacing: 1 }}>{heading}</h2>
            <p style={{ margin: "4px 0 0", color: C.sub }}>{subheading}</p>

            {/* Name (signup only) */}
            {!isLogin && !isForgotPassword && (
              <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="name" style={labelStyle}>Your name</label>
                <input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Sofia"
                  required
                  style={fieldStyle}
                />
              </div>
            )}

            {/* Email */}
            <div style={{ marginTop: isLogin || isForgotPassword ? 32 : 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={fieldStyle}
              />
            </div>

            {/* Password (not on forgot) */}
            {!isForgotPassword && (
              <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <label htmlFor="password" style={labelStyle}>Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      style={{ fontSize: 14, fontWeight: 700, color: C.pink, background: "transparent", border: 0, cursor: "pointer", padding: 0 }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLogin ? "Your password" : "Create a password (min 6 chars)"}
                    required
                    minLength={6}
                    style={{ ...fieldStyle, padding: "0 56px 0 16px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    style={{ position: "absolute", right: 4, top: 4, width: 44, height: 44, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {showPw ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 12s3.5-7 10-7c2 0 3.8.6 5.3 1.5M22 12s-3.5 7-10 7c-2 0-3.8-.6-5.3-1.5M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Keep me logged in (login only) */}
            {isLogin && !isForgotPassword && (
              <label style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedInState(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: C.pink }}
                />
                Keep me logged in
              </label>
            )}

            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {submitLabel}
            </button>

            {/* Secondary actions */}
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                style={{ marginTop: 24, width: "100%", textAlign: "center", fontWeight: 800, color: C.pink, background: "transparent", border: 0, cursor: "pointer", fontSize: 15 }}
              >
                Back to log in
              </button>
            ) : (
              <>
                <div style={{ margin: "32px 0 0", display: "flex", alignItems: "center", gap: 12, color: C.sub, fontSize: 14, fontWeight: 700 }}>
                  <span style={{ flex: 1, height: 2, background: C.rowBorder }} />
                  {isLogin ? "New to Power Club?" : "Already a member?"}
                  <span style={{ flex: 1, height: 2, background: C.rowBorder }} />
                </div>

                {isLogin ? (
                  signupsEnabled ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsLogin(false)}
                        style={{ marginTop: 20, display: "block", width: "100%", textAlign: "center", padding: "14px 20px", border: `2px solid ${C.ink}`, borderRadius: 14, background: C.lilac, color: C.ink, fontWeight: 800, font: "inherit", cursor: "pointer" }}
                      >
                        Join the club for €5/month
                      </button>
                      <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 14, color: C.sub }}>
                        Flat €5/month. Cancel anytime.
                      </p>
                    </>
                  ) : (
                    <p style={{ margin: "20px 0 0", textAlign: "center", fontSize: 14, fontWeight: 700, color: C.sub }}>
                      New signups are temporarily paused.
                    </p>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    style={{ marginTop: 20, display: "block", width: "100%", textAlign: "center", padding: "14px 20px", border: `2px solid ${C.ink}`, borderRadius: 14, background: C.lilac, color: C.ink, fontWeight: 800, font: "inherit", cursor: "pointer" }}
                  >
                    Log in instead
                  </button>
                )}
              </>
            )}
          </form>
        </div>

        <nav aria-label="Footer" style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 14, fontWeight: 700 }}>
          <Link to="/privacy" style={{ color: C.sub, textDecoration: "none", padding: "8px 0" }}>Privacy</Link>
          <Link to="/terms" style={{ color: C.sub, textDecoration: "none", padding: "8px 0" }}>Terms</Link>
          <a href="mailto:hello@caparicafoundersbreakfast.com" style={{ color: C.sub, textDecoration: "none", padding: "8px 0" }}>Contact</a>
        </nav>
      </section>
    </div>
  );
};

export default Auth;
