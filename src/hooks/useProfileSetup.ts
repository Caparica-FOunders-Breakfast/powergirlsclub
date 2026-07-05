import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import {
  useUserPreferences,
  useSaveUserPreferences,
  usePlanType,
  useSetPlanType,
  FREQUENCY_DEFAULT_DAYS,
  PROGRESSION_DEFAULT,
  progressionPreset,
  type ProgressGoal,
  type DbPlanType,
} from "@/hooks/useUserPreferences";
import { track } from "@/lib/analytics";

export type WizardStep = 1 | 2 | 3 | 4;
export type PlanType = "klarita" | "own";
export type PlanSource = "import" | "generate";

export const KLARITA_DAY_OPTIONS = [3, 4, 5] as const;
export const OWN_DAY_OPTIONS = [3, 4, 5, 6] as const;

/** Default training-day layouts per days/week. Klarita reuses the app's
 *  existing 3/4/5 subsets; the "own" branch adds a 6-day (Mon–Sat) layout. */
export const SETUP_DEFAULT_DAYS: Record<number, number[]> = {
  ...FREQUENCY_DEFAULT_DAYS,
  6: [0, 1, 2, 3, 4, 5],
};

const todayKey = (): string => new Date().toISOString().slice(0, 10);
const planTypeToDb = (t: PlanType): DbPlanType =>
  t === "klarita" ? "default" : "custom";
// The old enum is deprecated but still NOT NULL — keep it roughly meaningful.
const progressGoalFor = (kg: number): ProgressGoal =>
  kg >= 2 ? "aggressive" : "healthy";

export interface ProfileSetupState {
  step: WizardStep;
  weightKg: number | null;
  planType: PlanType | null;
  daysPerWeek: number | null;
  planSource: PlanSource | null;
  kgPerWeek: number;
  /** Step-3 standalone edit (opened from "More settings"), not the full flow. */
  editMode: boolean;
  /** Whether the wizard takes over the page. Sticky from mount (so it stays
   *  through step 4 even once weight+prefs are saved) until the user finishes. */
  wizardActive: boolean;
}

type Action =
  | { type: "HYDRATE"; payload: Partial<ProfileSetupState> & { step: WizardStep } }
  | { type: "SET_STEP"; step: WizardStep }
  | { type: "SET_WEIGHT"; kg: number | null }
  | { type: "SET_PLAN_TYPE"; planType: PlanType }
  | { type: "SET_DAYS"; days: number }
  | { type: "SET_PLAN_SOURCE"; source: PlanSource }
  | { type: "SET_KG"; kg: number }
  | { type: "ENTER_PROGRESSION_EDIT" }
  | { type: "FINISH" };

const initialState: ProfileSetupState = {
  step: 1,
  weightKg: null,
  planType: null,
  daysPerWeek: null,
  planSource: null,
  kgPerWeek: PROGRESSION_DEFAULT,
  editMode: false,
  wizardActive: false,
};

function reducer(state: ProfileSetupState, action: Action): ProfileSetupState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_WEIGHT":
      return { ...state, weightKg: action.kg };
    case "SET_PLAN_TYPE":
      // Switching branch clears the days/source that belonged to the old one.
      return {
        ...state,
        planType: action.planType,
        daysPerWeek: null,
        planSource: null,
      };
    case "SET_DAYS":
      return { ...state, daysPerWeek: action.days };
    case "SET_PLAN_SOURCE":
      return { ...state, planSource: action.source };
    case "SET_KG":
      return { ...state, kgPerWeek: action.kg };
    case "ENTER_PROGRESSION_EDIT":
      return { ...state, step: 3, editMode: true };
    case "FINISH":
      return { ...state, wizardActive: false };
    default:
      return state;
  }
}

export interface UseProfileSetup {
  state: ProfileSetupState;
  /** Server data has loaded and the wizard has hydrated. */
  ready: boolean;
  /** Returning user with weight + a saved plan → render the normal Profile. */
  isSetupComplete: boolean;
  saving: boolean;
  // Derived
  isStepComplete: (step: WizardStep) => boolean;
  isStepClickable: (step: WizardStep) => boolean;
  step2Answered: boolean;
  // Local edits
  setWeight: (kg: number | null) => void;
  setPlanType: (t: PlanType) => void;
  setDays: (n: number) => void;
  setPlanSource: (s: PlanSource) => void;
  setKgPerWeek: (kg: number) => void;
  // Navigation
  goToStep: (step: WizardStep) => void;
  startWeightEdit: () => void;
  startProgressionEdit: () => void;
  // Persisted transitions
  saveWeightAndContinue: (kg: number) => Promise<void>;
  savePlanAndContinue: () => Promise<void>;
  saveProgression: () => Promise<void>;
  completeSetup: () => void;
}

export function useProfileSetup(): UseProfileSetup {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: prefs, isLoading: prefsLoading } = useUserPreferences();
  const { data: dbPlanType, isLoading: planTypeLoading } = usePlanType();
  const updateProfile = useUpdateProfile();
  const savePrefs = useSaveUserPreferences();
  const setDbPlanTypeMut = useSetPlanType();

  const [state, dispatch] = useReducer(reducer, initialState);

  const loading = profileLoading || prefsLoading || planTypeLoading;
  const weightKg = (profile?.body_weight ?? null) as number | null;
  const hasPrefs = !!prefs;
  // Progression is always present post-migration, so it never gates entry:
  // a returning user is "set up" once they have a body weight AND a plan.
  const isSetupComplete = weightKg != null && hasPrefs;

  // Hydrate once, landing on the first incomplete step (or step 4 if complete).
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (loading || hydratedRef.current) return;
    hydratedRef.current = true;
    const planType: PlanType | null =
      dbPlanType === "custom" ? "own" : dbPlanType === "default" ? "klarita" : null;
    const firstStep: WizardStep = weightKg == null ? 1 : !hasPrefs ? 2 : 4;
    dispatch({
      type: "HYDRATE",
      payload: {
        step: firstStep,
        weightKg,
        planType,
        daysPerWeek: prefs?.frequency ?? null,
        kgPerWeek: prefs?.progression_kg_per_week ?? PROGRESSION_DEFAULT,
        wizardActive: !isSetupComplete,
      },
    });
  }, [loading, weightKg, hasPrefs, prefs, dbPlanType, isSetupComplete]);

  const step2Answered = useMemo(
    () =>
      !!state.planType &&
      state.daysPerWeek != null &&
      (state.planType === "klarita" || state.planSource != null),
    [state.planType, state.daysPerWeek, state.planSource],
  );

  const isStepComplete = useCallback(
    (step: WizardStep): boolean => {
      if (step === 1) return state.weightKg != null;
      if (step === 2) return step2Answered;
      if (step === 3) return true; // progression always has a value
      return false;
    },
    [state.weightKg, step2Answered],
  );

  // Completed steps before the current one are clickable (jump back); the
  // current and future steps are not.
  const isStepClickable = useCallback(
    (step: WizardStep): boolean => step < state.step && isStepComplete(step),
    [state.step, isStepComplete],
  );

  const goToStep = useCallback(
    (step: WizardStep) => {
      if (step <= state.step) dispatch({ type: "SET_STEP", step });
    },
    [state.step],
  );

  const setWeight = useCallback((kg: number | null) => dispatch({ type: "SET_WEIGHT", kg }), []);
  const setPlanType = useCallback((t: PlanType) => dispatch({ type: "SET_PLAN_TYPE", planType: t }), []);
  const setDays = useCallback((n: number) => dispatch({ type: "SET_DAYS", days: n }), []);
  const setPlanSource = useCallback((s: PlanSource) => dispatch({ type: "SET_PLAN_SOURCE", source: s }), []);
  const setKgPerWeek = useCallback((kg: number) => dispatch({ type: "SET_KG", kg }), []);

  const startWeightEdit = useCallback(() => {
    // Returning users editing weight: prefill step 1, keep the rest of state.
    dispatch({ type: "SET_STEP", step: 1 });
  }, []);
  const startProgressionEdit = useCallback(() => dispatch({ type: "ENTER_PROGRESSION_EDIT" }), []);

  // Persist body weight, then advance to the plan step.
  const saveWeightAndContinue = useCallback(
    async (kg: number) => {
      await updateProfile.mutateAsync({ body_weight: kg });
      track("profile_weight_saved", { kg });
      dispatch({ type: "SET_WEIGHT", kg });
      dispatch({ type: "SET_STEP", step: 2 });
    },
    [updateProfile],
  );

  const persistPrefs = useCallback(async () => {
    const days = state.daysPerWeek ?? prefs?.frequency ?? 5;
    await savePrefs.mutateAsync({
      frequency: days,
      training_days: SETUP_DEFAULT_DAYS[days] ?? SETUP_DEFAULT_DAYS[5],
      start_date: prefs?.start_date ?? todayKey(),
      progress_goal: progressGoalFor(state.kgPerWeek),
      progression_kg_per_week: state.kgPerWeek,
    });
    if (state.planType) await setDbPlanTypeMut.mutateAsync(planTypeToDb(state.planType));
  }, [state.daysPerWeek, state.kgPerWeek, state.planType, prefs, savePrefs, setDbPlanTypeMut]);

  // Step 2 → 3: persist the plan choice + advance.
  const savePlanAndContinue = useCallback(async () => {
    await persistPrefs();
    if (state.planType && state.daysPerWeek != null) {
      track("plan_type_selected", { type: state.planType, days: state.daysPerWeek });
    }
    if (state.planSource) track("plan_source_selected", { source: state.planSource });
    dispatch({ type: "SET_STEP", step: 3 });
  }, [persistPrefs, state.planType, state.daysPerWeek, state.planSource]);

  // Step 3: persist progression. In edit mode we don't advance (standalone).
  const saveProgression = useCallback(async () => {
    await persistPrefs();
    track("progression_selected", {
      kg_per_week: state.kgPerWeek,
      preset: progressionPreset(state.kgPerWeek),
    });
    if (!state.editMode) dispatch({ type: "SET_STEP", step: 4 });
  }, [persistPrefs, state.kgPerWeek, state.editMode]);

  const completeSetup = useCallback(() => {
    track("profile_setup_completed", {
      type: state.planType ?? "unknown",
      days: state.daysPerWeek ?? 0,
      kg_per_week: state.kgPerWeek,
    });
    dispatch({ type: "FINISH" });
  }, [state.planType, state.daysPerWeek, state.kgPerWeek]);

  return {
    state,
    ready: !loading && hydratedRef.current,
    isSetupComplete,
    saving: updateProfile.isPending || savePrefs.isPending || setDbPlanTypeMut.isPending,
    isStepComplete,
    isStepClickable,
    step2Answered,
    setWeight,
    setPlanType,
    setDays,
    setPlanSource,
    setKgPerWeek,
    goToStep,
    startWeightEdit,
    startProgressionEdit,
    saveWeightAndContinue,
    savePlanAndContinue,
    saveProgression,
    completeSetup,
  };
}
