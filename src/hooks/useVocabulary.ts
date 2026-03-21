import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VocabEntry {
  id: string;
  user_id: string;
  language_code: string;
  day_index: number | null;
  week_start: string | null;
  original_text: string;
  english_translation: string | null;
  alt_translation: string | null;
  alt_language_code: string | null;
  created_at: string;
}

export const useVocabulary = (languageCode: string | null) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["vocabulary", user?.id, languageCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("language_vocabulary" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("language_code", languageCode!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any as VocabEntry[];
    },
    enabled: !!user && !!languageCode,
  });
};

export const useAddVocab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      languageCode: string;
      dayIndex?: number;
      weekStart?: string;
      originalText: string;
      englishTranslation?: string;
      altTranslation?: string;
      altLanguageCode?: string;
    }) => {
      const { error } = await supabase
        .from("language_vocabulary" as any)
        .insert({
          user_id: user!.id,
          language_code: entry.languageCode,
          day_index: entry.dayIndex ?? null,
          week_start: entry.weekStart ?? null,
          original_text: entry.originalText,
          english_translation: entry.englishTranslation || null,
          alt_translation: entry.altTranslation || null,
          alt_language_code: entry.altLanguageCode || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary", user?.id, vars.languageCode] });
    },
  });
};

export const useDeleteVocab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, languageCode }: { id: string; languageCode: string }) => {
      const { error } = await supabase
        .from("language_vocabulary" as any)
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["vocabulary", user?.id, vars.languageCode] });
    },
  });
};
