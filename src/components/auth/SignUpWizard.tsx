import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { setKeepLoggedIn } from "@/integrations/supabase/authStorage";
import { useIsMobile } from "@/hooks/use-mobile";
import { DEFAULT_TRAINING_DAYS, WEEKDAYS, WEEKDAY_FULL, type PlanSource, type Weekday } from "@/lib/plan";
import { markJustSignedUp, parseBodyWeight, type LiftingLevel, type OnboardingAnswers } from "@/lib/onboarding";

// Sign-up steps from sign-up.dc.html / mobile-sign-up.dc.html: account, about
// you, your week, membership. The account is created on the last step; all
// answers travel on the auth user's metadata and are applied on the first
// session (useOnboarding), so nothing is lost if email confirmation is on.

const C = {
  bg: "#FBF9FB", ink: "#2B1736", sub: "#77677E", body: "#5E4E66", pink: "#C21C70", magenta: "#E8308C",
  hl: "#FFD6EA", lilac: "#F1E9FE", border: "#E4DAE7", warn: "#A3165E", purpleText: "#5B21B6",
  grad: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)",
};
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const STEPS = ["Account", "About you", "Your week", "Membership"];

const field: React.CSSProperties = { width: "100%", height: 52, padding: "0 16px", border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", fontSize: 17, color: C.ink, boxSizing: "border-box", fontFamily: "inherit" };
const label: React.CSSProperties = { fontWeight: 800, fontSize: 15 };

const LEVELS: [LiftingLevel, string, string][] = [
  ["new", "New to lifting", "We start light and teach you the moves."],
  ["some", "Some experience", "I know the basics and have lifted before."],
  ["regular", "I lift regularly", "I know my weights and want to push."],
];
const SOURCES: [PlanSource, string, string, string, string][] = [
  ["recommended", "Recommended plan", "Our plan: power start + 5 strength exercises a day.", "Most people pick this", "#A3165E"],
  ["ai_import", "Upload my own plan", "Screenshot from a trainer or app. AI turns it into your plan.", "Uses AI", "#5B21B6"],
  ["custom", "Build it myself", "Pick your own exercises from the library.", "", C.body],
];

const ArrowLeft = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block" }}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
const Heart = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill={C.hl} aria-hidden="true" style={{ display: "inline-block" }}><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" /></svg>
);

/** Friendly text for the errors Supabase returns at sign-up (often a 422). */
const signUpErrorText = (err: unknown): string => {
  const e = err as { message?: string; code?: string };
  const msg = e?.message ?? "";
  if (/already registered|already been registered|user_already_exists/i.test(msg + (e?.code ?? ""))) return "There's already an account with this email. Log in instead, or reset your password.";
  if (/password/i.test(msg) && /(weak|short|least|character)/i.test(msg)) return "Pick a stronger password: at least 8 characters.";
  if (/email/i.test(msg) && /invalid/i.test(msg)) return "That email doesn't look right. Check it and try again.";
  if (/rate limit|too many/i.test(msg)) return "Too many tries. Wait a minute and try again.";
  return msg || "Something went wrong. Try again.";
};

export function SignUpWizard({ onLogin }: { onLogin: () => void }) {
  const isMobile = useIsMobile();
  const { signUp } = useAuth();

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [news, setNews] = useState(false);
  // Step 2
  const [level, setLevel] = useState<LiftingLevel>("some");
  const [weight, setWeight] = useState("");
  // Step 3
  const [count, setCount] = useState<2 | 3 | 4>(3);
  const [days, setDays] = useState<Record<string, boolean>>(() => Object.fromEntries(DEFAULT_TRAINING_DAYS[3].map((d) => [d, true])));
  const [source, setSource] = useState<PlanSource>("recommended");

  const firstName = name.trim();
  const picked = WEEKDAYS.filter((d) => days[d]);
  const daysOk = picked.length === count;
  const weightNum = parseBodyWeight(weight);

  const validate = (): string | null => {
    if (step === 1) {
      if (!firstName) return "Tell us your first name.";
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Add a valid email.";
      if (password.length < 8) return "Your password needs at least 8 characters.";
      if (!agree) return "Please agree to the Terms and Privacy policy.";
    }
    if (step === 2 && weightNum === null) return "Add your body weight, between 25 and 300 kg.";
    if (step === 3 && !daysOk) return `Pick ${count} days. You have ${picked.length}.`;
    return null;
  };

  const createAccount = async () => {
    setBusy(true);
    setError(null);
    try {
      const onboarding: OnboardingAnswers = {
        days_per_week: count,
        training_days: picked as Weekday[],
        plan_source: source,
        lifting_level: level,
        news_opt_in: news,
      };
      setKeepLoggedIn(true);
      // Set before the session starts: /auth then redirects to /welcome.
      markJustSignedUp();
      const { hasSession } = await signUp(email.trim(), password, firstName, { body_weight: weightNum, onboarding });
      if (!hasSession) setCheckEmail(true);
    } catch (e) {
      setError(signUpErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    const problem = validate();
    if (problem) { setError(problem); return; }
    setError(null);
    if (step < 4) setStep(step + 1);
    else void createAccount();
  };
  const back = () => { setError(null); setStep((s) => Math.max(1, s - 1)); };

  const nextLabel = busy
    ? "Creating your account..."
    : step === 3
      ? source === "recommended" ? "Continue" : source === "ai_import" ? "Upload my plan next" : "Build my plan next"
      : step === 4 ? "Create my account" : "Continue";

  const setCountAndDays = (n: 2 | 3 | 4) => {
    setCount(n);
    setDays(Object.fromEntries(DEFAULT_TRAINING_DAYS[n].map((d) => [d, true])));
  };

  const radioCard = (on: boolean, onClick: () => void, title: string, desc: string, tag?: string, tagFg?: string) => (
    <button
      key={title}
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: `2px solid ${C.ink}`, borderRadius: 16, background: on ? "#FFF5FA" : "#FFFFFF", boxShadow: on ? `4px 4px 0 ${C.magenta}` : "none", color: C.ink, cursor: "pointer", fontFamily: "inherit", width: "100%" }}
    >
      <span style={{ flex: "none", width: 22, height: 22, borderRadius: 999, border: `2px solid ${C.ink}`, background: on ? C.magenta : "#FFFFFF" }} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontWeight: 800 }}>{title}</span>
        <span style={{ display: "block", fontSize: 14, color: C.body }}>{desc}</span>
      </span>
      {tag && <span style={{ fontSize: 12, fontWeight: 800, color: tagFg }}>{tag}</span>}
    </button>
  );

  const h2 = (text: string) => (
    <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 38 : 48, letterSpacing: 1, lineHeight: 1 }}>{text}</h2>
  );

  // ── Step content ─────────────────────────────────────────────────────────
  const content = checkEmail ? (
    <div style={{ textAlign: "center" }}>
      {h2(`Check your email${firstName ? `, ${firstName}` : ""}`)}
      <p style={{ margin: "12px auto 0", maxWidth: 420, color: C.body }}>
        We sent a link to <strong>{email.trim()}</strong>. Tap it to confirm your account, then log in. Your plan will be ready.
      </p>
      <button type="button" onClick={onLogin} style={{ marginTop: 24, width: "100%", minHeight: 56, background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, fontWeight: 800, fontSize: 18, cursor: "pointer", fontFamily: "inherit" }}>
        Go to log in
      </button>
    </div>
  ) : step === 1 ? (
    <>
      {h2(isMobile ? "Join the club" : "Create your account")}
      <p style={{ margin: "6px 0 0", color: C.body, fontSize: isMobile ? 15 : 17 }}>
        {isMobile && "Takes about 2 minutes. "}Already a member?{" "}
        <button type="button" onClick={onLogin} style={{ font: "inherit", fontWeight: 800, color: C.pink, background: "transparent", border: 0, padding: 0, cursor: "pointer", textDecoration: "underline" }}>Log in</button>
      </p>
      <div style={{ marginTop: isMobile ? 20 : 26, display: "flex", flexDirection: "column", gap: isMobile ? 14 : 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="su-name" style={label}>First name</label>
          <input id="su-name" type="text" autoComplete="given-name" placeholder="What should we call you?" value={name} onChange={(e) => setName(e.target.value)} style={field} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="su-email" style={label}>Email</label>
          <input id="su-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={field} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label htmlFor="su-pw" style={label}>Password</label>
          <div style={{ position: "relative" }}>
            <input id="su-pw" type={showPw ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...field, padding: "0 56px 0 16px" }} />
            <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 4, top: 4, width: 44, height: 44, border: 0, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3, width: 20, height: 20, accentColor: C.pink, flex: "none" }} />
          <span>I agree to the <Link to="/terms" style={{ fontWeight: 800, color: C.pink }}>Terms</Link> and <Link to="/privacy" style={{ fontWeight: 800, color: C.pink }}>Privacy policy</Link></span>
        </label>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 15, fontWeight: 600, color: C.body, cursor: "pointer" }}>
          <input type="checkbox" checked={news} onChange={(e) => setNews(e.target.checked)} style={{ marginTop: 3, width: 20, height: 20, accentColor: C.pink, flex: "none" }} />
          <span>Send me club news and challenge invites (optional)</span>
        </label>
      </div>
    </>
  ) : step === 2 ? (
    <>
      {h2(`Nice to meet you${firstName ? `, ${firstName}` : ""}`)}
      <p style={{ margin: "6px 0 0", color: C.body }}>Two quick things so we can set the right weights for you.</p>
      <p style={{ margin: "26px 0 10px", fontWeight: 800 }}>How much have you lifted before?</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {LEVELS.map(([id, n, d]) => radioCard(level === id, () => setLevel(id), n, d))}
      </div>
      <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="su-weight" style={{ fontWeight: 800 }}>Your body weight</label>
        <div style={{ display: "flex", alignItems: "center", height: 52, maxWidth: 220, border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", overflow: "hidden" }}>
          <input id="su-weight" type="text" inputMode="decimal" placeholder="63" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ flex: 1, minWidth: 0, height: "100%", border: 0, padding: "0 16px", fontSize: 18, fontWeight: 800, color: C.ink, fontFamily: "inherit", background: "transparent" }} />
          <span style={{ padding: "0 16px", fontWeight: 700, color: C.sub }}>kg</span>
        </div>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: C.body }}>Used to work out your strength level. Only you can see it.</p>
      </div>
    </>
  ) : step === 3 ? (
    <>
      {h2("Your training week")}
      <p style={{ margin: "6px 0 0", color: C.body }}>You can change this anytime in your profile.</p>
      <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <span style={{ fontWeight: 800 }}>Days a week</span>
        <div role="group" aria-label="Days a week" style={{ display: "flex", border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden" }}>
          {([2, 3, 4] as const).map((n) => (
            <button key={n} type="button" onClick={() => setCountAndDays(n)} aria-pressed={n === count} style={{ minWidth: 56, minHeight: 44, border: 0, background: n === count ? C.ink : "#FFFFFF", color: n === count ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>{n}</button>
          ))}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.sub }}>3 is our standard</span>
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
        {WEEKDAYS.map((d) => {
          const on = !!days[d];
          return (
            <button key={d} type="button" onClick={() => setDays((p) => ({ ...p, [d]: !on }))} aria-pressed={on} aria-label={`${WEEKDAY_FULL[d]}: ${on ? "train" : "rest"}`} style={{ minHeight: 64, border: `2px solid ${C.ink}`, borderRadius: 14, background: on ? C.magenta : "#FFFFFF", color: on ? "#FFFFFF" : C.body, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: 0, fontFamily: "inherit" }}>
              <span style={{ ...bangers, fontSize: isMobile ? 17 : 20, letterSpacing: 1, lineHeight: 1 }}>{d}</span>
              <span style={{ fontSize: 11, fontWeight: 800 }}>{on ? "Train" : "Rest"}</span>
            </button>
          );
        })}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 700, color: daysOk ? C.purpleText : C.warn }}>
        {daysOk ? `You train ${picked.map((d) => WEEKDAY_FULL[d]).join(", ")}.` : `Pick ${count} days. You have ${picked.length}.`}
      </p>
      <p style={{ margin: "22px 0 10px", fontWeight: 800 }}>Your plan</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SOURCES.map(([id, n, d, tag, tagFg]) => radioCard(source === id, () => setSource(id), n, d, tag, tagFg))}
      </div>
    </>
  ) : (
    <>
      {h2("Your membership")}
      <p style={{ margin: "6px 0 0", color: C.body }}>Simple. No card needed today.</p>
      <div style={{ marginTop: 24, background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22, boxShadow: `6px 6px 0 ${C.magenta}`, padding: isMobile ? 20 : 26 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <p style={{ margin: 0, ...bangers, fontSize: 30, letterSpacing: 1 }}>Power Club</p>
          <p style={{ margin: 0, ...bangers, fontSize: 56, lineHeight: 1, color: C.pink }}>€5<span style={{ fontFamily: "Nunito, sans-serif", fontSize: 16, fontWeight: 700, color: C.sub }}> /month</span></p>
        </div>
        <p style={{ margin: "12px 0 0", padding: "12px 14px", borderRadius: 12, background: C.lilac, fontWeight: 700, fontSize: 15 }}>Nothing to pay today. At the end of your first month, we'll ask you for €5.</p>
        <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {[`${count} workouts a week, about 35 minutes each`, "Your plan with how-to videos for every exercise", "Scorecard, streaks and strength levels", "Team challenges and travel mode"].map((x) => (
            <li key={x} style={{ display: "flex", gap: 12, alignItems: "center", fontWeight: 600 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.pink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none", display: "inline-block" }}><path d="M4 12l5 5L20 6" /></svg>{x}
            </li>
          ))}
        </ul>
        <p style={{ margin: "18px 0 0", fontSize: 14, color: C.body }}>Cancel anytime from your profile.</p>
      </div>
    </>
  );

  const errorBox = error && (
    <p role="alert" style={{ margin: "18px 0 0", padding: "10px 14px", borderRadius: 12, background: "#FFF5FA", border: `2px solid ${C.magenta}`, fontSize: 15, fontWeight: 700 }}>{error}</p>
  );

  const nextBtn = !checkEmail && (
    <button type="button" onClick={next} disabled={busy} style={{ width: "100%", minHeight: isMobile ? 54 : 56, background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `${isMobile ? 3 : 4}px ${isMobile ? 3 : 4}px 0 ${C.ink}`, fontWeight: 800, fontSize: isMobile ? 17 : 18, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.75 : 1, fontFamily: "inherit" }}>
      {nextLabel}
    </button>
  );

  const backOrHome = (compact: boolean) =>
    step > 1 && !checkEmail ? (
      <button type="button" onClick={back} aria-label="Back" style={compact ? { width: 44, height: 44, border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", color: C.ink, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" } : { display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", color: C.ink, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
        <ArrowLeft size={compact ? 18 : 16} />{!compact && "Back"}
      </button>
    ) : (
      <Link to="/" aria-label="Back to home" style={compact ? { width: 44, height: 44, border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", color: C.ink, display: "flex", alignItems: "center", justifyContent: "center" } : { display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 16px", border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", color: C.ink, textDecoration: "none", fontWeight: 800, fontSize: 15 }}>
        <ArrowLeft size={compact ? 18 : 16} />{!compact && "Back to home"}
      </Link>
    );

  // ── Mobile layout ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5 }}>
        <SignUpMobileBar left={backOrHome(true)} right={checkEmail ? "" : `${step}/4`} step={checkEmail ? undefined : step} />
        <main style={{ flex: 1, padding: "22px 16px 16px" }}>
          {content}
          {errorBox}
        </main>
        {!checkEmail && (
          <footer style={{ position: "sticky", bottom: 0, flex: "none", padding: "12px 16px calc(20px + env(safe-area-inset-bottom))", background: "#FFFFFF", borderTop: `2px solid ${C.border}` }}>
            {nextBtn}
            <p style={{ margin: "8px 0 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.sub }}>€5 a month, paid at the end of the month · Cancel anytime</p>
          </footer>
        )}
      </div>
    );
  }

  // ── Desktop layout ───────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexWrap: "wrap", background: C.bg, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 17, lineHeight: 1.5 }}>
      <SignUpSidePanel step={checkEmail ? 5 : step} />

      <section style={{ flex: "999 1 520px", minWidth: 0, padding: "36px 56px 48px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          {backOrHome(false)}
          <span style={{ fontSize: 14, fontWeight: 800, color: C.sub }}>{checkEmail ? "" : `Step ${step} of 4`}</span>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
          <div style={{ width: "100%", maxWidth: 520 }}>
            {content}
            {errorBox}
            {nextBtn && <div style={{ marginTop: 28 }}>{nextBtn}</div>}
          </div>
        </div>
        <nav aria-label="Footer" style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 14, fontWeight: 700 }}>
          <Link to="/privacy" style={{ color: C.sub, textDecoration: "none", padding: "8px 0" }}>Privacy</Link>
          <Link to="/terms" style={{ color: C.sub, textDecoration: "none", padding: "8px 0" }}>Terms</Link>
          <a href="mailto:hello@caparicafoundersbreakfast.com" style={{ color: C.sub, textDecoration: "none", padding: "8px 0" }}>Contact</a>
        </nav>
      </section>
    </div>
  );
}

/** Left gradient panel of the sign-up pages (desktop). step 5 = all done. */
export function SignUpSidePanel({ step }: { step: number }) {
  return (
    <section style={{ flex: "1 1 400px", minWidth: 0, maxWidth: 560, background: C.grad, color: "#FFFFFF", borderRight: `2px solid ${C.ink}`, padding: "44px 48px", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 36 }}>
      <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#FFFFFF", textDecoration: "none", ...bangers, fontSize: 32, letterSpacing: 1, alignSelf: "flex-start" }}>
        Power Club <Heart />
      </Link>
      <div>
        <h1 style={{ margin: 0, ...bangers, fontSize: "clamp(48px, 5vw, 72px)", lineHeight: 0.95, letterSpacing: 1.5 }}>
          Join the club.<span style={{ display: "block", color: C.hl }}>Get strong.</span>
        </h1>
        <p style={{ margin: "16px 0 0", maxWidth: 400, fontSize: 18, color: "rgba(255,255,255,0.92)" }}>Takes about 2 minutes. Your first workout is ready right after.</p>
        <ol style={{ margin: "32px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10, maxWidth: 380 }}>
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            const cur = n === step;
            return (
              <li key={s} aria-current={cur ? "step" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, background: cur ? "rgba(255,255,255,0.22)" : "transparent", color: done || cur ? "#FFFFFF" : "rgba(255,255,255,0.75)" }}>
                <span style={{ flex: "none", width: 30, height: 30, borderRadius: 999, background: done ? "#FFE14D" : cur ? "#FFFFFF" : "transparent", color: C.ink, border: `2px solid ${C.ink}`, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block" }}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  ) : n}
                </span>
                <span style={{ fontWeight: 800 }}>{s}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.88)" }}>€5 a month, paid at the end of the month · Cancel anytime</p>
    </section>
  );
}

/** Gradient top bar of the sign-up pages (mobile). */
export function SignUpMobileBar({ left, right, step }: { left: React.ReactNode; right?: string; step?: number }) {
  return (
    <header style={{ flex: "none", background: C.grad, color: "#FFFFFF", padding: "calc(14px + env(safe-area-inset-top)) 16px 16px", borderBottom: `2px solid ${C.ink}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 44 }}>
        {left}
        <span style={{ ...bangers, fontSize: 26, letterSpacing: 1 }}>Power Club</span>
        <span style={{ width: 44, textAlign: "right", fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>{right ?? ""}</span>
      </div>
      {step !== undefined && (
        <div aria-hidden="true" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
          {[1, 2, 3, 4].map((n) => <span key={n} style={{ height: 6, borderRadius: 999, background: n <= step ? "#FFFFFF" : "rgba(255,255,255,0.3)" }} />)}
        </div>
      )}
    </header>
  );
}
