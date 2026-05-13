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

export const useSetAppSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Json }) => {
      const { data, error } = await supabase
        .from("app_settings")
        .upsert({ key, value }, { onConflict: "key" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["app-setting", vars.key] });
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
