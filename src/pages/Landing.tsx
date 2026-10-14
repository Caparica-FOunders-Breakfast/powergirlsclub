import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Timer,
  Repeat,
  TrendingUp,
  CalendarDays,
  Smile,
  CalendarRange,
  Trophy,
  Plane,
  Users,
  Check,
} from "lucide-react";

const SIGNUP = "/auth?mode=signup";
const LOGIN = "/auth?mode=login";

const howItWorks = [
  {
    icon: Timer,
    title: "30–40 minutes",
    text: "Train 30–40 minutes. That's all it takes to build muscle.",
  },
  {
    icon: Repeat,
    title: "5 × 3 × 10",
    text: "5 exercises × 3 rounds × 10 reps. Simple and easy to remember.",
  },
  {
    icon: TrendingUp,
    title: "Add 1–2 kg a week",
    text: "Add 1–2 kg a week. You choose how fast you progress.",
  },
  {
    icon: CalendarDays,
    title: "Leg day & arm day",
    text: "Alternate leg day and arm day so each body part fully rests.",
  },
  {
    icon: Smile,
    title: "Only what you enjoy",
    text: "Only pick exercises you enjoy. If it's fun, you keep showing up.",
  },
];

const features = [
  {
    icon: CalendarRange,
    title: "Your weekly plan",
    text: "A 4-day split (lower body, upper body + core) with 5 exercises a day — and you can drag days to fit your week.",
  },
  {
    icon: TrendingUp,
    title: "Progressive overload built in",
    text: "Each exercise shows last week's weight and suggests the next step (e.g. 20 kg → try 22 kg).",
  },
  {
    icon: Trophy,
    title: "Scorecard",
    text: "A yearly activity heatmap, streaks, personal records and your strength level for each exercise.",
  },
  {
    icon: Plane,
    title: "Travel mode",
    text: "Switch to bodyweight and calisthenics workouts when you're away from the gym.",
  },
  {
    icon: Users,
    title: "Teams & 4-week challenges",
    text: "Train with friends using a join code.",
  },
];

const audience = ["Beginners", "Dancers", "Padel players", "Busy founders", "Women", "Men"];

const faqs = [
  {
    q: "Do I need experience?",
    a: "No, beginners are welcome. Start light and add weight weekly.",
  },
  {
    q: "How much time does it take?",
    a: "30–40 minutes per session.",
  },
  {
    q: "Can I train at home?",
    a: "Yes, with dumbbells or whatever you have.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel before the trial ends and you pay nothing.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-body overflow-x-hidden">
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b-2 border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl font-display text-primary tracking-wider leading-none">
              Power Club
            </span>
            <span aria-hidden className="text-lg">💜</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to={LOGIN}
              className="text-sm font-bold text-foreground hover:text-primary px-2 py-2 transition-colors"
            >
              Log in
            </Link>
            <Button
              asChild
              className="h-10 px-4 font-bold gradient-primary text-primary-foreground comic-border border-primary-foreground/20 hover:opacity-90"
            >
              <Link to={SIGNUP}>Start free trial</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative gradient-primary overflow-hidden">
        <div className="absolute top-10 left-6 w-24 h-24 rounded-full bg-accent/30 blur-xl" />
        <div className="absolute bottom-12 right-8 w-32 h-32 rounded-full bg-secondary/40 blur-xl" />
        <div className="absolute top-1/2 right-1/4 w-16 h-16 rounded-full bg-primary-foreground/10 blur-lg" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <h1 className="font-display text-primary-foreground tracking-wide text-4xl sm:text-6xl md:text-7xl drop-shadow-lg leading-tight">
            Get strong in 30 minutes.
            <br />
            Have fun doing it.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg font-semibold text-primary-foreground/90">
            Power Club is a strength club for busy people. Five exercises, three rounds of ten
            reps, a little more weight every week. No endless hours at the gym.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              asChild
              className="h-14 px-8 text-lg font-bold bg-background text-primary comic-border border-foreground hover:bg-background/90"
            >
              <Link to={SIGNUP}>Start your 2-week free trial 💜</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm font-bold text-primary-foreground/80">
            €10/month after. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 className="font-display text-3xl sm:text-5xl text-center text-foreground">
          How it works
        </h2>
        <p className="mt-3 text-center font-semibold text-muted-foreground">
          Simple enough to remember. Effective enough to work.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {howItWorks.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl bg-card comic-border p-6 flex flex-col gap-3"
            >
              <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                <Icon className="w-6 h-6 text-accent-foreground" />
              </div>
              <h3 className="font-display text-xl text-foreground tracking-wide">{title}</h3>
              <p className="text-sm font-semibold text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Who it's for ---------- */}
      <section className="bg-muted/50 border-y-2 border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="font-display text-3xl sm:text-5xl text-foreground">Who it's for</h2>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg font-semibold text-muted-foreground">
            Anyone who wants to build muscle without living at the gym. Women and men, whatever
            your starting point.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {audience.map((a) => (
              <span
                key={a}
                className="px-4 py-2 rounded-full bg-card comic-border font-bold text-sm text-foreground"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- What you get inside ---------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 className="font-display text-3xl sm:text-5xl text-center text-foreground">
          What you get inside
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-card comic-border p-6 flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-xl text-foreground tracking-wide">{title}</h3>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Stronger Together, Anywhere ---------- */}
      <section className="gradient-accent border-y-2 border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <h2 className="font-display text-3xl sm:text-5xl text-accent-foreground">
            Stronger Together, Anywhere 💜
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg font-bold text-accent-foreground/90">
            Train at the gym or at home and share your progress with the club.
          </p>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 className="font-display text-3xl sm:text-5xl text-center text-foreground">
          Simple pricing
        </h2>
        <div className="mt-10 rounded-3xl bg-card comic-border p-8 sm:p-10 text-center">
          <div className="flex items-end justify-center gap-1">
            <span className="font-display text-6xl sm:text-7xl text-primary tracking-wide">€10</span>
            <span className="mb-2 font-bold text-muted-foreground">/month</span>
          </div>
          <p className="mt-2 font-bold text-foreground">First 2 weeks free · Cancel anytime</p>
          <ul className="mt-6 space-y-2 text-left max-w-xs mx-auto">
            {[
              "Your weekly 4-day plan",
              "Progressive overload tracking",
              "Scorecard, streaks & records",
              "Travel mode & team challenges",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Check className="w-4 h-4 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <Button
            asChild
            className="mt-8 w-full h-14 text-lg font-bold gradient-primary text-primary-foreground comic-border border-primary-foreground/20 hover:opacity-90"
          >
            <Link to={SIGNUP}>Start free trial</Link>
          </Button>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <h2 className="font-display text-3xl sm:text-5xl text-center text-foreground">
          Questions?
        </h2>
        <Accordion type="single" collapsible className="mt-8">
          {faqs.map(({ q, a }) => (
            <AccordionItem
              key={q}
              value={q}
              className="rounded-2xl bg-card comic-border px-5 mb-4 border-b-[3px]"
            >
              <AccordionTrigger className="font-display text-lg text-foreground tracking-wide hover:no-underline text-left">
                {q}
              </AccordionTrigger>
              <AccordionContent className="font-semibold text-muted-foreground">
                {a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="bg-muted/50 border-t-2 border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-display text-xl text-primary tracking-wider">Power Club 💜</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Part of{" "}
              <a
                href="https://caparicafoundersbreakfast.com/"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Caparica Founders Breakfast
              </a>
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold text-muted-foreground">
            <Link to="/privacy" className="hover:text-primary">Privacy</Link>
            <Link to="/terms" className="hover:text-primary">Terms</Link>
            <a href="mailto:hello@caparicafoundersbreakfast.com" className="hover:text-primary">
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
