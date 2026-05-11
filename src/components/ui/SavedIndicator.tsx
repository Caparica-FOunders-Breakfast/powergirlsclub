import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedIndicatorProps {
  show: boolean;
  label?: string;
  className?: string;
}

export function SavedIndicator({ show, label = "Saved", className }: SavedIndicatorProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-bold text-primary",
            className,
          )}
          role="status"
          aria-live="polite"
        >
          <Check className="w-3.5 h-3.5" />
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
