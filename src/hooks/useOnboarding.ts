import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile, isPlaceholderName, signUpFirstName } from "@/hooks/useProfile";
import { usePersonalWorkoutPlan } from "@/hooks/usePersonalWorkoutPlan";
import { useRecommendedPlan, useSaveMemberPlan } from "@/hooks/usePlan";
import { readOnboarding, signUpBodyWeight } from "@/lib/onboarding";

/**
 * Applies the sign-up answers on a member's first session and reports whether
 * they have a plan:
 * - body weight from sign-up is saved to the profile if the profile has none;
 * - no plan + "Recommended plan" picked at sign-up: the recommended template
 *   for their days is saved as their plan (status "setting-up" meanwhile);
 * - no plan otherwise: status "needs-plan", the caller sends them to plan
 *   setup. Never falls back to the old 5-day default plan.
 */
export type OnboardingStatus = "loading" | "setting-up" | "needs-plan" | "ready";

export const useOnboarding = (): { status: OnboardingStatus; error: string | null } => {
  const { user } = useAuth();
  const answers = readOnboarding(user);
  const { hasPlan } = usePersonalWorkoutPlan();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const saveMemberPlan = useSaveMemberPlan();
  const wantsRecommended = answers?.plan_source === "recommended";
  const { data: recommended, isLoading: recLoading } = useRecommendedPlan(answers?.days_per_week ?? 3);

  const weightSaved = useRef(false);
  const planStarted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Body weight typed at sign-up (step 2) → profile, once.
  useEffect(() => {
    if (weightSaved.current || !profile || profile.body_weight != null) return;
    const bw = signUpBodyWeight(user);
    if (bw === null) return;
    weightSaved.current = true;
    updateProfile.mutate({ body_weight: bw });
  }, [profile, user, updateProfile]);

  // Profile still has a placeholder name ("New Member") → the sign-up name.
  const nameSaved = useRef(false);
  useEffect(() => {
    if (nameSaved.current || !profile || !isPlaceholderName(profile.display_name)) return;
    const name = signUpFirstName(user);
    if (!name) return;
    nameSaved.current = true;
    updateProfile.mutate({ display_name: name });
  }, [profile, user, updateProfile]);

  // Recommended plan picked at sign-up → save it, once.
  useEffect(() => {
    if (hasPlan !== false || !wantsRecommended || !answers || planStarted.current || recLoading) return;
    if (!recommended?.length) return;
    planStarted.current = true;
    saveMemberPlan
      .mutateAsync({ source: "recommended", daysPerWeek: answers.days_per_week, trainingDays: answers.training_days, baseMode: "auto", days: recommended })
      .catch((e: Error) => setError(e?.message ?? "Couldn't set up your plan."));
  }, [hasPlan, wantsRecommended, answers, recLoading, recommended, saveMemberPlan]);

  let status: OnboardingStatus;
  if (hasPlan === undefined) status = "loading";
  else if (hasPlan) status = "ready";
  else if (wantsRecommended && !error && (recLoading || (recommended?.length ?? 0) > 0)) status = "setting-up";
  else status = "needs-plan";

  return { status, error };
};
