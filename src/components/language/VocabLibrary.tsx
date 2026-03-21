import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useVocabulary, useDeleteVocab, type VocabEntry } from "@/hooks/useVocabulary";
import { useUserLanguages, WEEKLY_PLAN } from "@/hooks/useLanguageLearning";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface VocabLibraryProps {
  languageCode: string;
  languageName: string;
  flag: string;
}

export function VocabLibrary({ languageCode, languageName, flag }: VocabLibraryProps) {
  const { data: allVocab = [], isLoading } = useVocabulary(languageCode);
  const { data: userLanguages = [] } = useUserLanguages();
  const deleteVocab = useDeleteVocab();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(true);

  const otherLanguages = userLanguages.filter((l) => l.language_code !== languageCode);

  const filtered = useMemo(() => {
    if (!search.trim()) return allVocab;
    const q = search.toLowerCase();
    return allVocab.filter(
      (v) =>
        v.original_text.toLowerCase().includes(q) ||
        v.english_translation?.toLowerCase().includes(q) ||
        v.alt_translation?.toLowerCase().includes(q)
    );
  }, [allVocab, search]);

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<number | null, VocabEntry[]>();
    for (const v of filtered) {
      const key = v.day_index;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return map;
  }, [filtered]);

  const dayLabel = (idx: number | null) => {
    if (idx === null || idx === undefined) return "Ungrouped";
    return WEEKLY_PLAN[idx]?.day ?? `Day ${idx}`;
  };

  const dayEmoji = (idx: number | null) => {
    if (idx === null || idx === undefined) return "📝";
    return WEEKLY_PLAN[idx]?.emoji ?? "📝";
  };

  if (allVocab.length === 0) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-12 bg-card rounded-2xl border-2 border-border"
      >
        <p className="text-4xl mb-3">📖</p>
        <h3 className="text-lg font-display text-foreground">No words yet</h3>
        <p className="text-muted-foreground font-semibold mt-1 text-sm px-6">
          Add words from your daily tasks — they'll appear here
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="space-y-3"
    >
      {/* Search */}
      <div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search words…"
            className="h-10 text-sm rounded-xl pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] font-bold text-muted-foreground">
            {search ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}` : `${allVocab.length} word${allVocab.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Word list grouped by day */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No words found</p>
        ) : (
          [...grouped.entries()]
            .sort(([a], [b]) => (a ?? 99) - (b ?? 99))
            .map(([dayIdx, words]) => (
              <div key={dayIdx ?? "null"} className="rounded-2xl border-2 border-border bg-card p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">{dayEmoji(dayIdx)}</span>
                  <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    {dayLabel(dayIdx)}
                  </p>
                  <span className="text-[10px] font-bold text-muted-foreground/60">{words.length}</span>
                </div>
                <div className="space-y-1.5">
                  {words.map((v) => {
                    const altLang = otherLanguages.find(
                      (l) => l.language_code === v.alt_language_code
                    );
                    return (
                      <div
                        key={v.id}
                        className="flex items-start gap-2 group/vocab text-xs py-1"
                      >
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="font-bold text-foreground">{v.original_text}</p>
                          {v.english_translation && (
                            <p className="text-muted-foreground">🇬🇧 {v.english_translation}</p>
                          )}
                          {v.alt_translation && altLang && (
                            <p className="text-muted-foreground">{altLang.flag_emoji} {v.alt_translation}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteVocab.mutate({ id: v.id, languageCode })}
                          className="opacity-0 group-hover/vocab:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>
    </motion.div>
  );
}
