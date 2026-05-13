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

export const useAiImportEnabled = () => useAppSetting<boolean>("ai_import_enabled", true);
