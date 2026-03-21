import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Trash2 } from "lucide-react";
import {
  useUserLanguages,
  useRemoveLanguage,
  type Language,
} from "@/hooks/useLanguageLearning";
import { LanguageSelector } from "@/components/language/LanguageSelector";
import { WeeklyPlanPreview } from "@/components/language/WeeklyPlanPreview";
import { WeeklyPlan } from "@/components/language/WeeklyPlan";
import { VocabLibrary } from "@/components/language/VocabLibrary";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function LearnLanguage() {
  const { data: languages = [], isLoading } = useUserLanguages();
  const removeLanguage = useRemoveLanguage();
  const { toast } = useToast();
  const [activeLangCode, setActiveLangCode] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState<Language | null>(null);
  const [tab, setTab] = useState<"plan" | "words">("plan");

  // Auto-select first language if none selected
  const activeCode = activeLangCode || languages[0]?.language_code || null;

  const handleRemove = (lang: Language) => {
    removeLanguage.mutate(lang.language_code);
    toast({
      description: `${lang.language_name} removed`,
      action: (
        <Button variant="outline" size="sm" className="h-7 text-xs font-bold" onClick={() => {
          // Re-add would need the addLanguage hook, keeping it simple
        }}>
          OK
        </Button>
      ),
      duration: 3000,
    });
    if (activeCode === lang.language_code) {
      setActiveLangCode(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 pb-24 max-w-lg mx-auto space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  // No languages yet — onboarding
  if (languages.length === 0 && !previewLang) {
    return (
      <div className="p-4 pb-24 max-w-lg mx-auto space-y-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-12 bg-card rounded-2xl border-2 border-border"
        >
          <p className="text-5xl mb-3">🌍</p>
          <h2 className="text-2xl font-display text-foreground">Learn a Language</h2>
          <p className="text-muted-foreground font-semibold mt-2 text-sm px-6">
            Pick a language and follow a simple 5-day weekly rhythm
          </p>
        </motion.div>
        <LanguageSelector onLanguageAdded={() => {}} />
      </div>
    );
  }

  // Preview screen after adding first language
  if (previewLang) {
    return (
      <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
        <WeeklyPlanPreview
          language={{ name: previewLang.language_name, flag: previewLang.flag_emoji }}
          onStart={() => {
            setActiveLangCode(previewLang.language_code);
            setPreviewLang(null);
          }}
        />
      </div>
    );
  }

  const activeLang = languages.find((l) => l.language_code === activeCode);

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
      {/* Language toggle */}
      {languages.length > 1 && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex gap-2 overflow-x-auto no-scrollbar"
        >
          {languages.map((lang) => (
            <button
              key={lang.language_code}
              onClick={() => setActiveLangCode(lang.language_code)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all shrink-0 active:scale-[0.97]",
                activeCode === lang.language_code
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/20"
              )}
            >
              <span className="text-lg">{lang.flag_emoji}</span>
              <span className="text-xs font-extrabold">{lang.language_name}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Single language header with remove */}
      {languages.length === 1 && activeLang && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{activeLang.flag_emoji}</span>
            <span className="text-sm font-extrabold text-foreground">{activeLang.language_name}</span>
          </div>
        </motion.div>
      )}

      {/* Tab switcher */}
      {activeLang && (
        <div className="flex rounded-xl border-2 border-border overflow-hidden">
          <button
            onClick={() => setTab("plan")}
            className={cn(
              "flex-1 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors",
              tab === "plan"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            📅 Weekly Plan
          </button>
          <button
            onClick={() => setTab("words")}
            className={cn(
              "flex-1 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors",
              tab === "words"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            📖 My Words
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeLang && tab === "plan" && (
        <WeeklyPlan
          language={{ code: activeLang.language_code, name: activeLang.language_name, flag: activeLang.flag_emoji }}
        />
      )}

      {activeLang && tab === "words" && (
        <VocabLibrary
          languageCode={activeLang.language_code}
          languageName={activeLang.language_name}
          flag={activeLang.flag_emoji}
        />
      )}

      {/* Add another language */}
      {tab === "plan" && <LanguageSelector onLanguageAdded={() => {}} />}
    </div>
  );
}
