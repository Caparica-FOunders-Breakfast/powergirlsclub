import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, format } from "date-fns";

export interface Language {
  id: string;
  language_code: string;
  language_name: string;
  flag_emoji: string;
}

export const AVAILABLE_LANGUAGES = [
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
];

export const WEEKLY_PLAN = [
  { day: "Monday", focus: "Listening", emoji: "🎧", description: "Immerse yourself in native audio", tasks: ["Listen to a 10-min podcast", "Repeat 5 key phrases aloud", "Note 3 new words you heard"] },
  { day: "Tuesday", focus: "Speaking", emoji: "💬", description: "Practice pronunciation & fluency", tasks: ["Record yourself reading a passage", "Have a 5-min conversation (or self-talk)", "Practice 5 tongue twisters"] },
  { day: "Wednesday", focus: "Reading", emoji: "📖", description: "Build vocabulary through text", tasks: ["Read a short article or story", "Highlight 5 unknown words", "Write a summary in target language"] },
  { day: "Thursday", focus: "Grammar", emoji: "🧩", description: "Understand the structure", tasks: ["Study one grammar rule", "Complete 10 practice exercises", "Write 5 sentences using the rule"] },
  { day: "Friday", focus: "Writing", emoji: "✍️", description: "Express yourself in writing", tasks: ["Write a short journal entry", "Translate 5 sentences", "Review and correct yesterday's writing"] },
];

function getCurrentWeekStart(): string {
  const now = new Date();
  const ws = startOfWeek(now, { weekStartsOn: 1 });
  return format(ws, "yyyy-MM-dd");
}

export const useUserLanguages = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-languages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_languages" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return data as any as Language[];
    },
    enabled: !!user,
  });
};

export const useAddLanguage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lang: { code: string; name: string; flag: string }) => {
      const { error } = await supabase
        .from("user_languages" as any)
        .insert({ user_id: user!.id, language_code: lang.code, language_name: lang.name, flag_emoji: lang.flag } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-languages"] }),
  });
};

export const useRemoveLanguage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (languageCode: string) => {
      const { error } = await supabase
        .from("user_languages" as any)
        .delete()
        .eq("user_id", user!.id)
        .eq("language_code", languageCode);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-languages"] }),
  });
};

export const useLanguageTasks = (languageCode: string | null, weekStart: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["language-tasks", user?.id, languageCode, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("language_daily_tasks" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("language_code", languageCode!)
        .eq("week_start", weekStart);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && !!languageCode,
  });
};

export const useToggleTask = (weekStart: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ languageCode, dayIndex, taskIndex, completed }: {
      languageCode: string;
      dayIndex: number;
      taskIndex: number;
      completed: boolean;
    }) => {
      const { error } = await supabase
        .from("language_daily_tasks" as any)
        .upsert({
          user_id: user!.id,
          language_code: languageCode,
          week_start: weekStart,
          day_index: dayIndex,
          task_index: taskIndex,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        } as any, { onConflict: "user_id,language_code,week_start,day_index,task_index" });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["language-tasks", user?.id, vars.languageCode, weekStart] });
    },
  });
};

export const getCompletedDays = (tasks: any[]): number => {
  const dayCompletion = new Map<number, { total: number; done: number }>();
  for (let d = 0; d < 5; d++) {
    dayCompletion.set(d, { total: 3, done: 0 });
  }
  tasks?.forEach((t) => {
    if (t.completed) {
      const entry = dayCompletion.get(t.day_index);
      if (entry) entry.done++;
    }
  });
  let completed = 0;
  dayCompletion.forEach((v) => { if (v.done >= v.total) completed++; });
  return completed;
};
