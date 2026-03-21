import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Plus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AddExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All exercises that have logged data */
  allExercises: string[];
  /** Currently hidden exercise names */
  hiddenExercises: string[];
  onAdd: (name: string) => void;
}

export function AddExerciseModal({ open, onOpenChange, allExercises, hiddenExercises, onAdd }: AddExerciseModalProps) {
  const [search, setSearch] = useState("");

  // Only show exercises that are currently hidden (i.e. removable from scorecard = can be re-added)
  const available = allExercises.filter((name) => hiddenExercises.includes(name));
  const filtered = available.filter((name) => name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-extrabold">Add Exercise to Scorecard</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 border-2 border-border"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-sm font-bold text-muted-foreground">
                {available.length === 0 ? "All exercises are on your Scorecard" : "No matching exercises"}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((name) => (
                <motion.button
                  key={name}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    onAdd(name);
                    if (filtered.length <= 1) onOpenChange(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 border-border bg-card hover:border-primary/30 transition-colors active:scale-[0.98]"
                >
                  <span className="text-sm font-extrabold text-foreground truncate">{name}</span>
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
