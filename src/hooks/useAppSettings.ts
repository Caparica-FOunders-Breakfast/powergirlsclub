import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const useAppSetting = <T = unknown>(key: string, fallback: T) => {
  return useQuery({
    queryKey: ["app-setting", key],
    queryFn: async (): Promise<T> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      if (!data) return fallback;
      return data.value as T;
    },
    // Settings are read-mostly and the kill switch must propagate quickly
    // once an admin flips it, so don't cache too long.
    staleTime: 30_000,
  });
};

// Supabase's PostgrestError isn't an Error instance — log its fields explicitly
// and re-throw a real Error so React Query's onError + the UI toast can show
// something useful instead of the opaque "Couldn't update setting" message.
const supabaseErrorMessage = (err: unknown): string => {
  if (!err) return "unknown error";
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint, e.code ? `(code ${e.code})` : null].filter(Boolean);
    if (parts.length > 0) return parts.join(" — ");
  }
  return String(err);
};

export const useSetAppSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Json }) => {
      const { data, error } = await supabase
        .from("app_settings")
        .upsert({ key, value }, { onConflict: "key" })
        .select()
        .single();
      if (error) {
        console.error("[useSetAppSetting] upsert failed:", { key, value, error });
        // PGRST116 = "no rows returned" — happens when RLS silently filters
        // the upsert result. 42501 = postgres permission_denied. In both
        // cases the most likely cause is a missing admin role on user_roles.
        const code = (error as { code?: string }).code;
        if (code === "PGRST116" || code === "42501" || /permission/i.test(error.message ?? "")) {
          throw new Error(
            "RLS blocked the write — your admin role row is missing. Apply the latest migrations and sign back in.",
          );
        }
        throw new Error(supabaseErrorMessage(error));
      }
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["app-setting", vars.key] });
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    },
  });
};

export const FEATURE_FLAGS = {
  aiImport: "ai_import_enabled",
  language: "language_enabled",
  meals: "meals_enabled",
  signups: "signups_enabled",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export interface FeatureFlags {
  ai_import_enabled: boolean;
  language_enabled: boolean;
  meals_enabled: boolean;
  signups_enabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  ai_import_enabled: true,
  language_enabled: true,
  meals_enabled: true,
  signups_enabled: true,
};

/**
 * Reads every known feature flag in a single query. All gated UI should
 * funnel through this so an admin toggle in app_settings takes effect
 * within a render or two.
 */
export const useFeatureFlags = () => {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: async (): Promise<FeatureFlags> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", Object.values(FEATURE_FLAGS));
      if (error) throw error;
      const merged = { ...DEFAULT_FLAGS };
      for (const row of data ?? []) {
        if (row.key in merged && typeof row.value === "boolean") {
          (merged as Record<string, boolean>)[row.key] = row.value;
        }
      }
      return merged;
    },
    staleTime: 30_000,
  });
};

export const useAiImportEnabled = () => useAppSetting<boolean>(FEATURE_FLAGS.aiImport, true);
