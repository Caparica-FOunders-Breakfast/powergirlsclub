import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, BookOpen, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useVocabulary, useAddVocab, useDeleteVocab, type VocabEntry } from "@/hooks/useVocabulary";
import { useUserLanguages } from "@/hooks/useLanguageLearning";
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

  const [adding, setAdding] = useState(false);
  const [original, setOriginal] = useState("");
  const [english, setEnglish] = useState("");
  const [alt, setAlt] = useState("");
  const [altLangCode, setAltLangCode] = useState("");

  // Other languages user is learning (for alt translation)
  const otherLanguages = userLanguages.filter((l) => l.language_code !== languageCode);

  // Words added for this specific day (across all weeks)
  const dayVocab = allVocab.filter((v) => v.day_index === dayIndex);

  const handleAdd = () => {
    const text = original.trim();
    if (!text) return;
    addVocab.mutate({
      languageCode,
      dayIndex,
      weekStart,
      originalText: text,
      englishTranslation: english.trim() || undefined,
      altTranslation: alt.trim() || undefined,
      altLanguageCode: altLangCode || undefined,
    });
    setOriginal("");
    setEnglish("");
    setAlt("");
    setAdding(false);
  };

  const altLang = otherLanguages.find((l) => l.language_code === altLangCode);

  return (
    <div className="pt-1 space-y-2">
      {/* Existing words for this day */}
      {dayVocab.length > 0 && (
        <div className="space-y-1">
          {dayVocab.map((v) => (
            <VocabRow key={v.id} entry={v} languageCode={languageCode} otherLanguages={otherLanguages} onDelete={() => deleteVocab.mutate({ id: v.id, languageCode })} />
          ))}
        </div>
      )}

      {/* Add new word */}
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
                placeholder={`Word or phrase in ${languageName}…`}
                className="h-8 text-xs rounded-lg"
                maxLength={200}
              />
              <Input
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                placeholder="English translation…"
                className="h-8 text-xs rounded-lg"
                maxLength={200}
              />
              {otherLanguages.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={altLangCode}
                    onChange={(e) => setAltLangCode(e.target.value)}
                    className="h-8 text-xs rounded-lg border border-input bg-background px-2 flex-shrink-0"
                  >
                    <option value="">+ Language</option>
                    {otherLanguages.map((l) => (
                      <option key={l.language_code} value={l.language_code}>
                        {l.flag_emoji} {l.language_name}
                      </option>
                    ))}
                  </select>
                  {altLangCode && (
                    <Input
                      value={alt}
                      onChange={(e) => setAlt(e.target.value)}
                      placeholder={`${altLang?.language_name ?? "Alt"} translation…`}
                      className="h-8 text-xs rounded-lg flex-1"
                      maxLength={200}
                    />
                  )}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAdding(false); setOriginal(""); setEnglish(""); setAlt(""); }}>
                  Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!original.trim()}>
                  Save
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
