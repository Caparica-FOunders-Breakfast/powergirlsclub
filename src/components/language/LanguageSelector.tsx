import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Globe, ChevronRight } from "lucide-react";
import {
  AVAILABLE_LANGUAGES,
  useUserLanguages,
  useAddLanguage,
  type Language,
} from "@/hooks/useLanguageLearning";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  onLanguageAdded?: () => void;
}

export function LanguageSelector({ onLanguageAdded }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: userLangs = [] } = useUserLanguages();
  const addLanguage = useAddLanguage();

  const addedCodes = new Set(userLangs.map((l) => l.language_code));
  const available = AVAILABLE_LANGUAGES.filter((l) => !addedCodes.has(l.code));

  const handleAdd = async (lang: typeof AVAILABLE_LANGUAGES[0]) => {
    await addLanguage.mutateAsync({ code: lang.code, name: lang.name, flag: lang.flag });
    onLanguageAdded?.();
    if (available.length <= 1) setOpen(false);
  };

  return (
    <>
      <motion.button
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-primary/30 text-primary hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-bold">Add Language</span>
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-base font-extrabold">Choose a Language</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            {available.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🌍</p>
                <p className="text-sm font-bold text-muted-foreground">You've added all available languages!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {available.map((lang) => (
                  <motion.button
                    key={lang.code}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleAdd(lang)}
                    disabled={addLanguage.isPending}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-border bg-card hover:border-primary/30 transition-all active:scale-[0.98]"
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-sm font-extrabold text-foreground flex-1 text-left">{lang.name}</span>
                    <Plus className="w-4 h-4 text-primary shrink-0" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
