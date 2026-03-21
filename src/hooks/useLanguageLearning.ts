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
  {
    day: "Monday", focus: "Listening", emoji: "🎧", title: "Tuning In",
    description: "Train your ear for sounds, rhythm, and intonation.",
    tasks: [
      "🎙️ Listen to a short podcast in your target language",
      "🧠 Write down 5 words or phrases you recognize",
      "🎶 Listen to a song and translate one verse",
      "🕒 Goal: Recognize patterns, not understand everything",
    ],
  },
  {
    day: "Tuesday", focus: "Speaking", emoji: "💬", title: "Say It Out Loud",
    description: "Build speaking confidence & pronunciation.",
    tasks: [
      "💭 Talk for 2–3 min about your morning (record yourself)",
      "🎙️ Practice repeating after a native speaker (shadowing)",
      "🪞 Have a short exchange with someone",
      "🕒 Goal: Don't aim for perfect — aim for flow",
    ],
  },
  {
    day: "Wednesday", focus: "Reading", emoji: "📖", title: "Expand Vocabulary",
    description: "Learn natural expressions through text.",
    tasks: [
      "📱 Read a short news article or Instagram caption",
      "🖊️ Highlight 5 useful words or idioms",
      "💡 Look them up and write one sentence each",
      "🕒 Goal: Discover words in context, not from a list",
    ],
  },
  {
    day: "Thursday", focus: "Grammar & Structure", emoji: "🧩", title: "Understand the Why",
    description: "Make sense of how the language works.",
    tasks: [
      "📚 Watch a short explainer on one grammar topic",
      "✏️ Do a mini exercise (app or notebook)",
      "🔁 Break down a tricky sentence from this week",
      "🕒 Goal: Connect grammar to real-life phrases",
    ],
  },
  {
    day: "Friday", focus: "Writing", emoji: "✍️", title: "Reflect & Create",
    description: "Turn your week into words.",
    tasks: [
      "🧘 Write a short journal entry in your target language",
      "💬 Send it to a friend or AI for gentle correction",
      "🔁 Review all words learned during the week",
      "🕒 Goal: Express yourself authentically",
    ],
  },
  {
    day: "Weekend", focus: "Culture & Connection", emoji: "🌍", title: "Bonus",
    description: "Optional — immerse yourself in the culture.",
    tasks: [
      "🎬 Watch a movie or video with subtitles",
      "🗣️ Go out and speak — markets, cafés, anywhere!",
      "📓 Add new words to your notebook or second brain",
    ],
  },
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
