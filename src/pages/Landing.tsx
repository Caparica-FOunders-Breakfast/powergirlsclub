import { Link } from "react-router-dom";
import { StatusBarBackdrop } from "@/components/StatusBarBackdrop";

// Palette ported from the "Harley" design (claude.ai design canvas). Kept as a
// single constant rather than inline hexes so the whole page stays consistent.
const C = {
  bg: "#FBF9FB",
  ink: "#2B1736",
  heroBg: "linear-gradient(135deg, #D1207A 0%, #6B2FB3 100%)",
  heroText: "#FFFFFF",
  heroSub: "rgba(255,255,255,0.92)",
  hl: "#FFD6EA",
  cardShadow: "#2B1736",
  cta: "#FFE14D",
  ctaText: "#2B1736",
  pinkText: "#C21C70",
  heart: "#8B5CF6",
  tile: "#E8308C",
  tileIcon: "#FFFFFF",
  chip: "#EBDDFB",
  band: "#6B2FB3",
  bandText: "#FFFFFF",
  shadow: "#E8308C",
  btn: "#C21C70",
  footAccent: "#FF8AC4",
  sub: "#77677E",
  body: "#5E4E66",
  rowBg: "#F6F1F7",
};

const SIGNUP = "/auth?mode=signup";
const LOGIN = "/auth?mode=login";

const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;
const card = {
  background: "#FFFFFF",
  border: `2px solid ${C.ink}`,
  borderRadius: 18,
  boxShadow: `4px 4px 0 ${C.ink}`,
} as const;
const tile = {
  width: 48,
  height: 48,
  borderRadius: 12,
  background: C.tile,
  border: `2px solid ${C.ink}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const planRows = [
  ["Goblet squat", "20 kg", "22 kg"],
  ["Romanian deadlift", "30 kg", "32 kg"],
  ["Hip thrust", "40 kg", "42 kg"],
  ["Walking lunges", "8 kg", "10 kg"],
  ["Calf raises", "16 kg", "18 kg"],
];

const chips = ["Beginners", "Dancers", "Padel players", "Busy founders", "Women", "Men"];

// Small stroke-icon helper so the philosophy/feature SVGs stay consistent.
const Icon = ({ d, size = 24, stroke = C.tileIcon }: { d: React.ReactNode; size?: number; stroke?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const philosophy = [
  {
    icon: <Icon d={<><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 9.5h.01M15 9.5h.01" /></>} />,
    title: "Only what you enjoy",
    body: <>Find exercises that are fun. You will keep coming back to them.</>,
  },
  {
    icon: <Icon d={<><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></>} />,
    title: "Short but effective",
    body: <>30 minutes, 5 exercises, 10 reps, 3 times a week. That will get you there.</>,
  },
  {
    icon: <Icon d={<path d="M3 17l6-6 4 4 8-8M15 7h6v6" />} />,
    title: "Lift heavy",
    body: <>Find your starting weight, then add 1–2 kg every week. Every set should feel like a challenge.</>,
  },
  {
    icon: <Icon d={<><rect x="2" y="7" width="17" height="10" rx="2" /><path d="M22 11v2M6 10v4M10 10v4" /></>} />,
    title: "Train by readiness",
    body: (
      <>
        <p style={{ margin: 0, color: C.body, fontSize: 16 }}>
          <strong style={{ color: C.ink }}>Ready:</strong> push hard and go heavier than last time.
        </p>
        <p style={{ margin: "6px 0 0", color: C.body, fontSize: 16 }}>
          <strong style={{ color: C.ink }}>So-so:</strong> keep the same weight as last time.
        </p>
        <p style={{ margin: "6px 0 0", color: C.body, fontSize: 16 }}>
          <strong style={{ color: C.ink }}>Not ready:</strong> we scale it down to a lighter version for you.
        </p>
      </>
    ),
    rawBody: true,
  },
  {
    icon: <Icon d={<path d="M7 4v16M17 4v16M4 8h6M14 16h6" />} />,
    title: "Leg day, arm day",
    body: <>Alternate so each body part fully rests.</>,
  },
  {
    icon: <Icon d={<><path d="M9 8a3 3 0 0 1 6 0" /><path d="M7.5 9.5h9l1.5 3.5a6 6 0 1 1-12 0z" /></>} />,
    title: "Use free weights",
    body: <>Dumbbells, kettlebells and barbells over machines. Your body works to keep you stable, so more muscles join in.</>,
  },
];

const features = [
  {
    icon: <Icon d={<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>} size={22} />,
    title: "Your weekly plan",
    body: "A 4-day split (lower body, upper body + core) with 5 exercises a day. Drag days around to fit your week.",
  },
  {
    icon: <Icon d={<path d="M12 19V5M5 12l7-7 7 7" />} size={22} />,
    title: "Progressive overload, built in",
    body: "Every exercise shows last week's weight and suggests the next step, like 20 kg → try 22 kg.",
  },
  {
    icon: <Icon d={<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />} size={22} />,
    title: "Scorecard",
    body: "A yearly activity heatmap, streaks, personal records and your strength level for each exercise.",
  },
  {
    icon: <Icon d={<path d="M2 16l20-8-6 12-3-5-5-1z" />} size={22} />,
    title: "Travel mode",
    body: "Switch to bodyweight and calisthenics workouts when you're away from the gym.",
  },
  {
    icon: <Icon d={<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.8 3 2.6 3.5 5.2" /></>} size={22} />,
    title: "Teams and 4-week challenges",
    body: "Train with friends using a join code.",
  },
];

const faqs = [
  ["Do I need experience?", "No. Power Club works from whatever your starting point is."],
  ["How much time does it take?", "30 to 40 minutes per session."],
  ["Can I train at home?", "Yes. Travel mode switches you to bodyweight and calisthenics workouts."],
  ["How much does it cost?", "€5 a month, paid at the end of the month. Cancel anytime."],
  ["Can I cancel anytime?", "Yes, anytime."],
];

const check = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.pinkText} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12l5 5L20 6" />
  </svg>
);

const Landing = () => {
  return (
    <>
    <StatusBarBackdrop />
    <div style={{ width: "100%", background: C.bg, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 17, lineHeight: 1.55 }}>
      {/* NAV */}
      <header style={{ background: C.bg, borderBottom: `2px solid ${C.ink}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: C.pinkText, ...bangers, fontSize: 30, letterSpacing: 1 }}>
            Power Club
            <svg width="22" height="22" viewBox="0 0 24 24" fill={C.heart} aria-hidden="true">
              <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
            </svg>
          </Link>
          <nav aria-label="Main" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link to={LOGIN} style={{ color: C.ink, fontWeight: 700, textDecoration: "none", padding: "12px 14px" }}>Log in</Link>
            <Link to={SIGNUP} style={{ background: C.ink, color: "#FFFFFF", fontWeight: 800, textDecoration: "none", padding: "12px 20px", borderRadius: 12, border: `2px solid ${C.ink}` }}>Join for €5</Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: C.heroBg, borderBottom: `2px solid ${C.ink}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "88px 24px 96px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 56 }}>
          <div style={{ flex: "1 1 460px", minWidth: 0 }}>
            <p style={{ margin: "0 0 20px", display: "inline-block", padding: "6px 14px", borderRadius: 999, background: "rgba(255,255,255,0.12)", color: C.heroText, fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}>A strength club for busy people</p>
            <h1 style={{ margin: 0, ...bangers, fontSize: "clamp(56px, 8vw, 96px)", lineHeight: 0.95, letterSpacing: 1.5, color: C.heroText }}>
              Get strong in 30 minutes.
              <span style={{ display: "block", color: C.hl }}>Have fun doing it.</span>
            </h1>
            <p style={{ margin: "28px 0 0", maxWidth: 520, fontSize: 19, color: C.heroSub }}>Five exercises, three rounds of ten reps, a little more weight every week. No endless hours at the gym.</p>
            <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18 }}>
              <Link to={SIGNUP} style={{ background: C.cta, color: C.ctaText, fontWeight: 800, fontSize: 18, textDecoration: "none", padding: "16px 28px", borderRadius: 14, border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}` }}>Join Power Club for €5</Link>
              <span style={{ color: C.heroSub, fontSize: 15, fontWeight: 600 }}>€5 a month, paid at the end of the month.</span>
            </div>
          </div>

          {/* Product card */}
          <div style={{ flex: "1 1 360px", minWidth: 0, maxWidth: 440 }}>
            <div style={{ background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 20, boxShadow: `8px 8px 0 ${C.cardShadow}`, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <p style={{ margin: 0, ...bangers, fontSize: 30, letterSpacing: 1 }}>Leg day</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.sub }}>Week 6 · 3 × 10</p>
              </div>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {planRows.map(([name, from, to]) => (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: C.rowBg }}>
                    <span style={{ fontWeight: 700 }}>{name}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      <span style={{ color: C.sub }}>{from} →</span> <span style={{ color: C.pinkText }}>{to}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700, color: C.sub }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.pinkText} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-5 2 1 3 3 3 3" />
                </svg>
                12-day streak · 34 min avg
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR PHILOSOPHY */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "104px 24px 32px" }}>
        <h2 style={{ margin: 0, ...bangers, fontSize: 56, letterSpacing: 1, textAlign: "center" }}>Our philosophy</h2>
        <p style={{ margin: "8px auto 0", textAlign: "center", color: C.sub, fontSize: 19, maxWidth: 560 }}>Simple enough to remember. Effective enough to work.</p>
        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {philosophy.map((p) => (
            <div key={p.title} style={{ ...card, padding: 24 }}>
              <div style={tile}>{p.icon}</div>
              <h3 style={{ margin: "18px 0 6px", ...bangers, fontSize: 26, letterSpacing: 0.5 }}>{p.title}</h3>
              {p.rawBody ? p.body : <p style={{ margin: 0, color: C.body, fontSize: 16 }}>{p.body}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 24px 32px", textAlign: "center" }}>
        <h2 style={{ margin: 0, ...bangers, fontSize: 56, letterSpacing: 1 }}>Who it's for</h2>
        <p style={{ margin: "8px auto 0", color: C.sub, fontSize: 19, maxWidth: 620 }}>Anyone who wants to build muscle without living at the gym. Women and men, whatever your starting point.</p>
        <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
          {chips.map((c) => (
            <span key={c} style={{ padding: "10px 20px", borderRadius: 999, background: C.chip, border: `2px solid ${C.ink}`, fontWeight: 800 }}>{c}</span>
          ))}
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 24px 104px" }}>
        <h2 style={{ margin: 0, ...bangers, fontSize: 56, letterSpacing: 1, textAlign: "center" }}>What you get inside</h2>
        <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} style={{ display: "flex", gap: 18, alignItems: "flex-start", background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 18, padding: 22 }}>
              <div style={{ flex: "none", width: 44, height: 44, borderRadius: 12, background: C.tile, border: `2px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{f.icon}</div>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 800 }}>{f.title}</h3>
                <p style={{ margin: 0, color: C.body, fontSize: 16 }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BAND */}
      <section style={{ background: C.band, borderTop: `2px solid ${C.ink}`, borderBottom: `2px solid ${C.ink}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "72px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 28 }}>
          <div style={{ flex: "1 1 480px", minWidth: 0 }}>
            <h2 style={{ margin: 0, ...bangers, fontSize: "clamp(44px, 6vw, 64px)", lineHeight: 1, letterSpacing: 1, color: C.bandText }}>Stronger together, anywhere</h2>
            <p style={{ margin: "12px 0 0", fontSize: 19, fontWeight: 600, color: C.bandText }}>Train at the gym or at home and share your progress with the club.</p>
          </div>
          <Link to={SIGNUP} style={{ flex: "none", background: "#FFFFFF", color: C.ink, fontWeight: 800, fontSize: 18, textDecoration: "none", padding: "16px 28px", borderRadius: 14, border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}` }}>Join the club</Link>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "104px 24px 32px" }}>
        <h2 style={{ margin: 0, ...bangers, fontSize: 56, letterSpacing: 1, textAlign: "center" }}>Simple pricing</h2>
        <div style={{ margin: "40px auto 0", maxWidth: 460, background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22, boxShadow: `8px 8px 0 ${C.shadow}`, padding: "36px 32px", textAlign: "center" }}>
          <p style={{ margin: 0, ...bangers, fontSize: 88, lineHeight: 1, color: C.pinkText }}>
            €5<span style={{ fontFamily: "Nunito, sans-serif", fontSize: 20, fontWeight: 700, color: C.sub }}> /month</span>
          </p>
          <p style={{ margin: "10px 0 0", fontWeight: 700, color: C.body }}>Paid at the end of the month · Cancel anytime</p>
          <ul style={{ margin: "28px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
            {["Your weekly 4-day plan", "Progressive overload tracking", "Scorecard, streaks and records", "Travel mode and team challenges"].map((item) => (
              <li key={item} style={{ display: "flex", gap: 12, alignItems: "center", fontWeight: 600 }}>{check}{item}</li>
            ))}
          </ul>
          <Link to={SIGNUP} style={{ marginTop: 30, display: "block", background: C.btn, color: "#FFFFFF", fontWeight: 800, fontSize: 18, textDecoration: "none", padding: "16px 24px", borderRadius: 14, border: `2px solid ${C.ink}`, boxShadow: `4px 4px 0 ${C.ink}` }}>Join for €5/month</Link>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "96px 24px 112px" }}>
        <h2 style={{ margin: "0 0 32px", ...bangers, fontSize: 56, letterSpacing: 1, textAlign: "center" }}>Questions?</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map(([q, a]) => (
            <details key={q} style={{ background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 14, padding: "18px 22px" }}>
              <summary style={{ fontWeight: 800, fontSize: 18, cursor: "pointer", listStyle: "none" }}>{q}</summary>
              <p style={{ margin: "10px 0 0", color: C.body }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.ink, color: "#FFFFFF" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "40px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div>
            <p style={{ margin: 0, ...bangers, fontSize: 28, letterSpacing: 1, color: C.footAccent }}>Power Club</p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: "rgba(255,255,255,0.75)" }}>
              Part of{" "}
              <a href="https://caparicafoundersbreakfast.com/" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.75)" }}>
                Caparica Founders Breakfast
              </a>
            </p>
          </div>
          <nav aria-label="Footer" style={{ display: "flex", gap: 20, fontWeight: 700, fontSize: 15 }}>
            <Link to="/privacy" style={{ color: "#FFFFFF", textDecoration: "none", padding: "8px 0" }}>Privacy</Link>
            <Link to="/terms" style={{ color: "#FFFFFF", textDecoration: "none", padding: "8px 0" }}>Terms</Link>
            <a href="mailto:hello@caparicafoundersbreakfast.com" style={{ color: "#FFFFFF", textDecoration: "none", padding: "8px 0" }}>Contact</a>
          </nav>
        </div>
      </footer>
    </div>
    </>
  );
};

export default Landing;
