import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useVocabulary, useAddVocab, useDeleteVocab, type VocabEntry } from "@/hooks/useVocabulary";
import { useUserLanguages, AVAILABLE_LANGUAGES } from "@/hooks/useLanguageLearning";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface VocabSectionProps {
  languageCode: string;
  languageName: string;
  dayIndex: number;
  weekStart: string;
}

export function VocabSection({ languageCode, languageName, dayIndex, weekStart }: VocabSectionProps) {
  const { data: allVocab = [] } = useVocabulary(languageCode);
  const { data: userLanguages = [] } = useUserLanguages();
  const addVocab = useAddVocab();
  const deleteVocab = useDeleteVocab();
  const { toast } = useToast();

  const [adding, setAdding] = useState(false);
  const [original, setOriginal] = useState("");
  const [translating, setTranslating] = useState(false);

  const otherLanguages = userLanguages.filter((l) => l.language_code !== languageCode);
  const dayVocab = allVocab.filter((v) => v.day_index === dayIndex);

  // Resolve full language name from code
  const langName = (code: string) =>
    AVAILABLE_LANGUAGES.find((l) => l.code === code)?.name ?? code;

  const handleSave = async () => {
    const text = original.trim();
    if (!text) return;

    setTranslating(true);

    // Build target languages: always English + any other user languages
    const targetLangs = ["en", ...otherLanguages.map((l) => l.language_code)];
    const uniqueTargets = [...new Set(targetLangs)];

    let translations: Record<string, string> = {};

    try {
      const { data, error } = await supabase.functions.invoke("translate-word", {
        body: {
          text,
          sourceLanguage: langName(languageCode),
          targetLanguages: uniqueTargets.map((c) => (c === "en" ? "English" : langName(c))),
        },
      });
      if (error) throw error;
      translations = data?.translations ?? {};
    } catch (e) {
      console.error("Translation failed:", e);
      toast({ description: "Auto-translate failed — saving word without translations.", variant: "destructive", duration: 3000 });
    }

    // Find the English translation
    const englishTranslation = translations["English"] || translations["en"] || "";

    // Find alt translation (first other language)
    let altTranslation = "";
    let altCode = "";
    for (const lang of otherLanguages) {
      const name = langName(lang.language_code);
      const val = translations[name] || translations[lang.language_code];
      if (val) {
        altTranslation = val;
        altCode = lang.language_code;
        break;
      }
    }

    addVocab.mutate({
      languageCode,
      dayIndex,
      weekStart,
      originalText: text,
      englishTranslation: englishTranslation || undefined,
      altTranslation: altTranslation || undefined,
      altLanguageCode: altCode || undefined,
    });

    setOriginal("");
    setTranslating(false);
    setAdding(false);
  };

  return (
    <div className="pt-1 space-y-2">
      {dayVocab.length > 0 && (
        <div className="space-y-1">
          {dayVocab.map((v) => (
            <VocabRow key={v.id} entry={v} languageCode={languageCode} otherLanguages={otherLanguages} onDelete={() => deleteVocab.mutate({ id: v.id, languageCode })} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {adding ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 rounded-xl bg-muted/50 p-3">
              <Input
                autoFocus
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && original.trim()) handleSave();
                  if (e.key === "Escape") { setAdding(false); setOriginal(""); }
                }}
                placeholder={`Word or phrase in ${languageName}…`}
                className="h-8 text-xs rounded-lg"
                maxLength={200}
                disabled={translating}
              />
              <p className="text-[10px] text-muted-foreground">
                Translations to English{otherLanguages.length > 0 ? ` & ${otherLanguages.map((l) => l.language_name).join(", ")}` : ""} will be added automatically
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAdding(false); setOriginal(""); }} disabled={translating}>
                  Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!original.trim() || translating}>
                  {translating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  {translating ? "Translating…" : "Save"}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            Add word or phrase
          </button>
        )}
      </AnimatePresence>
    </div>
  );
}

function VocabRow({ entry, languageCode, otherLanguages, onDelete }: {
  entry: VocabEntry;
  languageCode: string;
  otherLanguages: { language_code: string; flag_emoji: string; language_name: string }[];
  onDelete: () => void;
}) {
  const altLang = otherLanguages.find((l) => l.language_code === entry.alt_language_code);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 group/vocab text-xs py-1"
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-bold text-foreground">{entry.original_text}</p>
        {entry.english_translation && (
          <p className="text-muted-foreground">🇬🇧 {entry.english_translation}</p>
        )}
        {entry.alt_translation && altLang && (
          <p className="text-muted-foreground">{altLang.flag_emoji} {entry.alt_translation}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover/vocab:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
