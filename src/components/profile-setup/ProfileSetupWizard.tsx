import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  Lock,
  Minus,
  Plus,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { KlaritaSplitPreview } from "@/components/profile-setup/KlaritaSplitPreview";
import {
  KLARITA_DAY_OPTIONS,
  OWN_DAY_OPTIONS,
  type PlanSource,
  type PlanType,
  type UseProfileSetup,
  type WizardStep,
} from "@/hooks/useProfileSetup";
import {
  PROGRESSION_MAX,
  PROGRESSION_MIN,
  PROGRESSION_STEP,
  PROGRESSION_WARN_AT,
  progressionPreset,
} from "@/hooks/useUserPreferences";

export const WEIGHT_MIN = 30;
export const WEIGHT_MAX = 250;

/** Example lift used in the progression projection line (kg). */
const PROJECTION_BASE = 30;
const PROJECTION_WEEKS = 12;

const STEPS: { n: WizardStep; label: string }[] = [
  { n: 1, label: "Weight" },
  { n: 2, label: "Plan" },
  { n: 3, label: "Progression" },
  { n: 4, label: "Done" },
];

interface WizardProps {
  setup: UseProfileSetup;
  /** own + import → open the existing import flow. */
  onImport: () => void;
  /** own + generate → open the generator with {days, kgPerWeek}. */
  onGenerate: () => void;
  /** klarita → go to this week. */
  onGoToWeek: () => void;
}

/* ── Stepper ─────────────────────────────────────────────────────────── */

function SetupStepper({ setup }: { setup: UseProfileSetup }) {
  const { state, isStepComplete, isStepClickable, goToStep } = setup;
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = isStepComplete(s.n) && s.n < state.step;
        const active = s.n === state.step;
        const clickable = isStepClickable(s.n);
        return (
          <div key={s.n} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && goToStep(s.n)}
              className={cn(
                "flex items-center gap-2",
                clickable ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold transition-colors",
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : s.n}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-extrabold uppercase tracking-wider sm:inline",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded-full",
                  s.n < state.step ? "bg-emerald-500/50" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Step 1 · Weight ─────────────────────────────────────────────────── */

function StepWeight({ setup }: { setup: UseProfileSetup }) {
  const [value, setValue] = useState(
    setup.state.weightKg != null ? String(setup.state.weightKg) : "",
  );
  const num = parseFloat(value);
  const valid = Number.isFinite(num) && num >= WEIGHT_MIN && num <= WEIGHT_MAX;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-foreground lg:text-3xl">
          Your body weight 💪
        </h2>
        <p className="text-sm font-semibold text-muted-foreground">
          We'll calculate your personal strength levels from this.
        </p>
      </div>
      <div>
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 63"
            min={WEIGHT_MIN}
            max={WEIGHT_MAX}
            className="h-12 border-2 border-border pr-12 text-lg font-bold"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-muted-foreground">
            kg
          </span>
        </div>
        {value !== "" && !valid && (
          <p className="mt-1.5 text-[11px] font-bold text-destructive">
            Enter a weight between {WEIGHT_MIN} and {WEIGHT_MAX} kg.
          </p>
        )}
      </div>
      <Button
        disabled={!valid || setup.saving}
        onClick={() => valid && setup.saveWeightAndContinue(num)}
        className="h-12 w-full gap-2 gradient-primary font-bold text-primary-foreground"
      >
        {setup.saving ? "Saving…" : "Calculate my levels"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ── Step 2 · Plan ───────────────────────────────────────────────────── */

function BranchCard({
  active,
  onClick,
  title,
  badge,
  badgeClass,
  copy,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  badge: string;
  badgeClass: string;
  copy: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border-2 p-4 text-left transition-all",
        active
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-background hover:border-primary/30",
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider",
          badgeClass,
        )}
      >
        {badge}
      </span>
      <p className="mt-2 font-extrabold text-base text-foreground">{title}</p>
      <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{copy}</p>
    </button>
  );
}

function DayPills({
  options,
  value,
  onChange,
}: {
  options: readonly number[];
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={selected}
            className={cn(
              "flex h-11 w-14 flex-col items-center justify-center rounded-2xl border-2 transition-all",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_rgba(255,45,135,0.55)]"
                : "border-border bg-background hover:border-primary/30",
            )}
          >
            <span className="font-display text-xl leading-none tabular-nums">{n}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider">days</span>
          </button>
        );
      })}
    </div>
  );
}

function StepPlan({ setup }: { setup: UseProfileSetup }) {
  const { state, setPlanType, setDays, setPlanSource, step2Answered, savePlanAndContinue, saving } = setup;
  const dayOptions = state.planType === "own" ? OWN_DAY_OPTIONS : KLARITA_DAY_OPTIONS;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground lg:text-3xl">Pick your plan 📋</h2>
        <p className="text-sm font-semibold text-muted-foreground">
          Go with the proven split, or bring your own.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <BranchCard
          active={state.planType === "klarita"}
          onClick={() => setPlanType("klarita")}
          title="Klarita's plan"
          badge="Recommended ⭐"
          badgeClass="bg-primary/10 text-primary"
          copy="The proven Power Club split. Just pick how many days — the rest is done for you."
        />
        <BranchCard
          active={state.planType === "own"}
          onClick={() => setPlanType("own")}
          title="My own plan"
          badge="Full control"
          badgeClass="bg-secondary/15 text-secondary"
          copy="Bring your own program or let us generate one for you."
        />
      </div>

      {state.planType && (
        <div>
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            How many days per week?
          </p>
          <DayPills options={dayOptions} value={state.daysPerWeek} onChange={setDays} />
        </div>
      )}

      {state.planType === "klarita" && state.daysPerWeek != null && (
        <KlaritaSplitPreview daysPerWeek={state.daysPerWeek} />
      )}

      {state.planType === "own" && state.daysPerWeek != null && (
        <div>
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Do you already have a plan?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <BranchCard
              active={state.planSource === "import"}
              onClick={() => setPlanSource("import")}
              title="📥 Import my plan"
              badge="Bring your own"
              badgeClass="bg-secondary/15 text-secondary"
              copy="Paste or upload your program — we'll structure it into your week."
            />
            <BranchCard
              active={state.planSource === "generate"}
              onClick={() => setPlanSource("generate")}
              title="✨ Generate for me"
              badge="Guided"
              badgeClass="bg-accent/15 text-accent-foreground"
              copy="Answer 3 questions and get a plan built for your goal and equipment."
            />
          </div>
        </div>
      )}

      <Button
        disabled={!step2Answered || saving}
        onClick={() => savePlanAndContinue()}
        className="h-12 w-full gap-2 gradient-primary font-bold text-primary-foreground"
      >
        Next: progression <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ── Step 3 · Progression ────────────────────────────────────────────── */

function ProgressionCard({
  active,
  onClick,
  title,
  rate,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  rate?: string;
  badge?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-2xl border-2 p-4 text-left transition-all",
        active
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-background hover:border-primary/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold text-base text-foreground">{title}</p>
        {badge && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
            {badge}
          </span>
        )}
      </div>
      {rate && <p className="mt-0.5 text-sm font-bold text-primary">{rate}</p>}
      {children}
    </button>
  );
}

export function StepProgression({
  setup,
  onSaved,
}: {
  setup: UseProfileSetup;
  onSaved?: () => void;
}) {
  const { state, setKgPerWeek, saveProgression, saving } = setup;
  const preset = progressionPreset(state.kgPerWeek);
  // The custom stepper remembers a value even while a preset is selected.
  const [customKg, setCustomKg] = useState(preset === "custom" ? state.kgPerWeek : 1.5);

  const clampCustom = (n: number) =>
    Math.min(PROGRESSION_MAX, Math.max(PROGRESSION_MIN, Math.round(n / PROGRESSION_STEP) * PROGRESSION_STEP));

  const chooseCustom = (n: number) => {
    const v = clampCustom(n);
    setCustomKg(v);
    setKgPerWeek(v);
  };

  const projected = PROJECTION_BASE + state.kgPerWeek * PROJECTION_WEEKS;
  const warn = state.kgPerWeek >= PROGRESSION_WARN_AT;

  const ctaLabel = state.editMode
    ? "Save progression"
    : state.planType === "own"
      ? state.planSource === "generate"
        ? "Finish & generate my plan"
        : "Finish & import my plan"
      : "Start my plan 🔥";

  const handleSave = async () => {
    await saveProgression();
    onSaved?.();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-foreground lg:text-3xl">
          📈 How hard do you want to push?
        </h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Muscles grow through progressive overload — adding a little weight every week.
          Pick how much we add to your working weights each week. This applies to every
          plan — Klarita's, imported or generated. We'll bump your targets automatically
          and back off if you miss reps.
        </p>
      </div>

      <div className="grid gap-3">
        <ProgressionCard
          active={preset === "healthy"}
          onClick={() => setKgPerWeek(1)}
          title="Healthy"
          rate="+1 kg/week"
          badge="Recommended ⭐"
        />
        <ProgressionCard
          active={preset === "aggressive"}
          onClick={() => setKgPerWeek(2)}
          title="Aggressive"
          rate="+2 kg/week"
        />
        <ProgressionCard active={preset === "custom"} onClick={() => chooseCustom(customKg)} title="Custom">
          <div className="mt-3 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Decrease"
              onClick={() => chooseCustom(customKg - PROGRESSION_STEP)}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-background text-foreground hover:border-primary/40"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-display text-2xl tabular-nums text-foreground">
              +{customKg.toFixed(1)} kg
            </span>
            <button
              type="button"
              aria-label="Increase"
              onClick={() => chooseCustom(customKg + PROGRESSION_STEP)}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-background text-foreground hover:border-primary/40"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {PROGRESSION_MIN}–{PROGRESSION_MAX} kg / week
            </span>
          </div>
        </ProgressionCard>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border-2 border-border bg-background p-3">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-[13px] font-semibold text-foreground">
          At +{state.kgPerWeek} kg/week: your {PROJECTION_BASE} kg squat becomes{" "}
          <span className="font-extrabold text-primary">{projected} kg</span> in{" "}
          {PROJECTION_WEEKS} weeks.
        </p>
      </div>

      {warn && (
        <div className="flex items-start gap-2 rounded-2xl border-2 border-accent/50 bg-accent/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
          <p className="text-[13px] font-semibold text-foreground">
            ⚠️ +{state.kgPerWeek} kg/week is a lot — make sure sleep and food keep up, or
            you'll stall in a few weeks.
          </p>
        </div>
      )}

      <Button
        disabled={saving}
        onClick={handleSave}
        className="h-12 w-full gap-2 gradient-primary font-bold text-primary-foreground"
      >
        {saving ? "Saving…" : ctaLabel}
      </Button>
    </div>
  );
}

/* ── Step 4 · Done ───────────────────────────────────────────────────── */

function StepDone({ setup, onImport, onGenerate, onGoToWeek }: WizardProps) {
  const { state, goToStep, completeSetup } = setup;

  const finish = () => {
    completeSetup();
    if (state.planType === "own") {
      if (state.planSource === "generate") onGenerate();
      else onImport();
    } else {
      onGoToWeek();
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 p-5 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl text-foreground">You're all set! 🎉</h2>
        <div className="mx-auto mt-3 max-w-xs space-y-1 text-sm font-semibold text-foreground">
          <p>{state.daysPerWeek} days / week</p>
          <p>+{state.kgPerWeek} kg / week progression</p>
          <p>Levels calibrated to your body weight</p>
        </div>
      </div>

      <Button
        onClick={finish}
        className="h-12 w-full gap-2 gradient-primary font-bold text-primary-foreground"
      >
        {state.planType === "own" ? (
          <>
            {state.planSource === "generate" ? (
              <>
                <Sparkles className="h-4 w-4" /> Generate my plan
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Import my plan
              </>
            )}
          </>
        ) : (
          "Go to this week 💪"
        )}
      </Button>

      <Button
        variant="ghost"
        onClick={() => goToStep(3)}
        className="h-10 w-full font-bold text-muted-foreground hover:text-foreground"
      >
        Change progression
      </Button>
    </div>
  );
}

/* ── Locked strength-levels helper (shown in the left column) ────────── */

export function LockedStrengthLevelsNote() {
  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-dashed border-border bg-background p-3">
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="text-[13px] font-semibold text-muted-foreground">
        Set your body weight in step 1 and we'll calculate your personal strength levels.
      </p>
    </div>
  );
}

/* ── Wizard shell ────────────────────────────────────────────────────── */

export function ProfileSetupWizard(props: WizardProps) {
  const { setup } = props;
  return (
    <motion.section
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border-2 border-border bg-card p-5 lg:p-6"
    >
      <SetupStepper setup={setup} />
      <div className="mt-6">
        {setup.state.step === 1 && <StepWeight setup={setup} />}
        {setup.state.step === 2 && <StepPlan setup={setup} />}
        {setup.state.step === 3 && <StepProgression setup={setup} />}
        {setup.state.step === 4 && <StepDone {...props} />}
      </div>
    </motion.section>
  );
}
