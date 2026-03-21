import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Trash2, X, ChevronDown } from "lucide-react";
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

  if (allVocab.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border-2 border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <BookOpen className="w-5 h-5 text-primary" />
        <div className="flex-1 text-left">
          <p className="text-sm font-extrabold text-foreground">
            My Words
          </p>
          <p className="text-[10px] font-bold text-muted-foreground">
            {allVocab.length} {allVocab.length === 1 ? "word" : "words"} saved
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Search */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search words…"
                  className="h-8 text-xs rounded-xl pl-8 pr-8"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              {search && (
                <p className="text-[10px] font-bold text-muted-foreground mt-1.5">
                  {filtered.length} {filtered.length === 1 ? "result" : "results"}
                </p>
              )}
            </div>

            {/* Word list grouped by day */}
            <div className="px-4 pb-4 space-y-3 max-h-[400px] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No words found</p>
              ) : (
                [...grouped.entries()]
                  .sort(([a], [b]) => (a ?? 99) - (b ?? 99))
                  .map(([dayIdx, words]) => (
                    <div key={dayIdx ?? "null"}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">{dayEmoji(dayIdx)}</span>
                        <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          {dayLabel(dayIdx)}
                        </p>
                        <span className="text-[10px] font-bold text-muted-foreground/60">{words.length}</span>
                      </div>
                      <div className="space-y-1 ml-5">
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
                                <p className="font-bold text-foreground">
                                  {v.original_text}
                                </p>
                                {v.english_translation && (
                                  <p className="text-muted-foreground">
                                    🇬🇧 {v.english_translation}
                                  </p>
                                )}
                                {v.alt_translation && altLang && (
                                  <p className="text-muted-foreground">
                                    {altLang.flag_emoji} {v.alt_translation}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() =>
                                  deleteVocab.mutate({
                                    id: v.id,
                                    languageCode,
                                  })
                                }
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}
