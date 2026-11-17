import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useMemberPlan } from "@/hooks/usePlan";
import { usePersonalWorkoutPlan } from "@/hooks/usePersonalWorkoutPlan";
import { useProfile, signUpFirstName } from "@/hooks/useProfile";
import { SignUpMobileBar, SignUpSidePanel } from "@/components/auth/SignUpWizard";
import { clearJustSignedUp, readOnboarding } from "@/lib/onboarding";
import { WEEKDAYS, WEEKDAY_FULL } from "@/lib/plan";

const C = { bg: "#FBF9FB", ink: "#2B1736", sub: "#77677E", body: "#5E4E66", pink: "#C21C70", magenta: "#E8308C", border: "#E4DAE7", yellow: "#FFE14D" };
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;

/**
 * "Welcome to the club" (sign-up step 5). Shown right after the account is
 * created. Waits while the recommended plan is being saved; a member who chose
 * to upload or build their plan goes straight on to plan setup.
 */
export default function Welcome() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { status, error } = useOnboarding();
  const { plan } = usePersonalWorkoutPlan();
  const { data: memberPlan } = useMemberPlan();
  const { data: profile } = useProfile();
  const answers = readOnboarding(user);

  useEffect(() => { clearJustSignedUp(); }, []);

  if (status === "needs-plan") return <Navigate to="/plan-setup" replace />;

  const firstName = profile?.display_name?.trim() || signUpFirstName(user);
  const ready = status === "ready";
  const trainingIdx = plan.map((d, i) => (d.isRest ? -1 : i)).filter((i) => i >= 0);
  const firstIdx = trainingIdx[0];
  const firstDay = firstIdx !== undefined ? WEEKDAY_FULL[WEEKDAYS[firstIdx]] : "";
  const firstLabel = firstIdx !== undefined ? plan[firstIdx].label : "";
  const weekText = trainingIdx.map((i) => WEEKDAY_FULL[WEEKDAYS[i]]).join(", ");
  const manual = memberPlan?.base_mode === "manual" || answers?.lifting_level === "regular";
  const baseText = manual
    ? "type in the weights you use now, or let week 1 find them."
    : "your first session is a test: 3 rounds of 10, where the last 3 reps feel challenging. The app sets your weights from how it went.";

  const body = !ready ? (
    <div role="status" style={{ textAlign: "center" }}>
      <h2 style={{ margin: 0, ...bangers, fontSize: isMobile ? 38 : 48, letterSpacing: 1, lineHeight: 1 }}>{error ? "Almost there" : "Setting up your plan"}</h2>
      <p style={{ margin: "10px auto 0", maxWidth: 420, color: C.body }}>
        {error ? `We couldn't finish your plan: ${error}` : "This takes a second."}
      </p>
      {error && (
        <Link to="/plan-setup" style={{ marginTop: 22, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 56, background: C.pink, color: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `4px 4px 0 ${C.ink}`, textDecoration: "none", fontWeight: 800, fontSize: 18 }}>
          Set up my plan
        </Link>
      )}
    </div>
  ) : (
    <>
      <div style={{ textAlign: "center" }}>
        <span style={{ margin: "0 auto", width: 80, height: 80, borderRadius: 999, background: C.magenta, border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block" }}><path d="M5 12l5 5L20 7" /></svg>
        </span>
        <h2 style={{ margin: "18px 0 0", ...bangers, fontSize: isMobile ? 42 : 52, letterSpacing: 1, lineHeight: 1 }}>Welcome to the club{firstName ? `, ${firstName}` : ""}</h2>
        <p style={{ margin: "10px auto 0", maxWidth: 420, color: C.body }}>Your plan is ready. Here's what's next.</p>
      </div>
      <div style={{ marginTop: 24, background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", background: "#FFF0F7", borderBottom: `2px solid ${C.border}` }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.body }}>YOUR FIRST WORKOUT</p>
          <p style={{ margin: "2px 0 0", fontWeight: 800, fontSize: 20 }}>{firstDay} · {firstLabel}</p>
        </div>
        <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8, fontSize: 15 }}>
          <p style={{ margin: 0 }}><strong>Your week:</strong> {weekText}</p>
          <p style={{ margin: 0 }}><strong>Starting weights:</strong> {baseText}</p>
        </div>
      </div>
    </>
  );

  const actions = ready && (
    <>
      <Link to="/week" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: isMobile ? 54 : 56, background: C.yellow, color: C.ink, border: `2px solid ${C.ink}`, borderRadius: 14, boxShadow: `${isMobile ? 3 : 4}px ${isMobile ? 3 : 4}px 0 ${C.ink}`, textDecoration: "none", fontWeight: 800, fontSize: isMobile ? 17 : 18 }}>See my first week</Link>
      <Link to="/profile" style={{ display: "block", marginTop: isMobile ? 6 : 12, textAlign: "center", fontWeight: 800, fontSize: isMobile ? 14 : 15, padding: isMobile ? "10px 0" : "8px 0", color: C.pink }}>Look at my full plan</Link>
    </>
  );

  if (isMobile) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: C.bg, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 16, lineHeight: 1.5 }}>
        <SignUpMobileBar left={<span style={{ width: 44 }} />} />
        <main style={{ flex: 1, padding: "22px 16px 16px" }}>{body}</main>
        {actions && <footer style={{ position: "sticky", bottom: 0, padding: "12px 16px calc(20px + env(safe-area-inset-bottom))", background: "#FFFFFF", borderTop: `2px solid ${C.border}` }}>{actions}</footer>}
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", flexWrap: "wrap", background: C.bg, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 17, lineHeight: 1.5 }}>
      <SignUpSidePanel step={5} />
      <section style={{ flex: "999 1 520px", minWidth: 0, padding: "36px 56px 48px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 0" }}>
          <div style={{ width: "100%", maxWidth: 520 }}>
            {body}
            {actions && <div style={{ marginTop: 22 }}>{actions}</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
