import type { User } from "@supabase/supabase-js";
import { DEFAULT_TRAINING_DAYS, WEEKDAYS, type PlanSource, type Weekday } from "@/lib/plan";

/**
 * Answers from the sign-up steps (sign-up.dc.html). They're stored on the auth
 * user's metadata at sign-up, so they survive email confirmation and are
 * applied on the member's first session (see useOnboarding).
 */
export type LiftingLevel = "new" | "some" | "regular";

export interface OnboardingAnswers {
  days_per_week: 2 | 3 | 4;
  training_days: Weekday[]; // ["Mon","Wed","Fri"]
  plan_source: PlanSource;
  lifting_level: LiftingLevel;
  news_opt_in: boolean;
}

export const BODY_WEIGHT_MIN = 25;
export const BODY_WEIGHT_MAX = 300;

/**
 * Body weight typed by a member: "63", "63,5" or "63.5" kg. Returns the number
 * when it's within 25 to 300 kg, otherwise null.
 */
export const parseBodyWeight = (raw: string | number | null | undefined): number | null => {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n) || n < BODY_WEIGHT_MIN || n > BODY_WEIGHT_MAX) return null;
  return Math.round(n * 10) / 10;
};

/** Onboarding answers saved at sign-up, or null for accounts made before. */
export const readOnboarding = (user: User | null | undefined): OnboardingAnswers | null => {
  const raw = user?.user_metadata?.onboarding as Partial<OnboardingAnswers> | undefined;
  if (!raw || typeof raw !== "object") return null;
  const count = [2, 3, 4].includes(Number(raw.days_per_week)) ? (Number(raw.days_per_week) as 2 | 3 | 4) : 3;
  const days = Array.isArray(raw.training_days)
    ? WEEKDAYS.filter((d) => (raw.training_days as string[]).includes(d))
    : [];
  return {
    days_per_week: count,
    training_days: days.length === count ? days : DEFAULT_TRAINING_DAYS[count],
    plan_source: raw.plan_source === "ai_import" || raw.plan_source === "custom" ? raw.plan_source : "recommended",
    lifting_level: raw.lifting_level === "new" || raw.lifting_level === "regular" ? raw.lifting_level : "some",
    news_opt_in: !!raw.news_opt_in,
  };
};

/** Body weight typed at sign-up (step 2), or null. */
export const signUpBodyWeight = (user: User | null | undefined): number | null =>
  parseBodyWeight(user?.user_metadata?.body_weight as number | string | undefined);

// After "Create my account" the member should see the welcome screen, not the
// default landing. The flag lives for this browser session only.
const JUST_SIGNED_UP = "pc-just-signed-up";
export const markJustSignedUp = () => {
  try { sessionStorage.setItem(JUST_SIGNED_UP, "1"); } catch { /* ignore */ }
};
export const isJustSignedUp = (): boolean => {
  try {
    return sessionStorage.getItem(JUST_SIGNED_UP) === "1";
  } catch {
    return false;
  }
};
export const clearJustSignedUp = () => {
  try { sessionStorage.removeItem(JUST_SIGNED_UP); } catch { /* ignore */ }
};
