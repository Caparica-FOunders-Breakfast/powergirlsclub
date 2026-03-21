import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { WEEKLY_PLAN } from "@/hooks/useLanguageLearning";
import { Button } from "@/components/ui/button";

interface WeeklyPlanPreviewProps {
  language: { name: string; flag: string };
  onStart: () => void;
}

export function WeeklyPlanPreview({ language, onStart }: WeeklyPlanPreviewProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="rounded-2xl border-2 border-border bg-card p-5 space-y-4"
    >
      <div className="text-center space-y-1">
        <p className="text-3xl">{language.flag}</p>
        <h3 className="text-lg font-display text-foreground">Your weekly rhythm</h3>
        <p className="text-xs font-bold text-muted-foreground">{language.name} — 5 days of focused practice</p>
      </div>

      <div className="space-y-2">
        {WEEKLY_PLAN.map((day, i) => (
          <motion.div
            key={day.day}
            initial={{ x: -12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/40"
          >
            <span className="text-lg">{day.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-foreground">{day.day}</p>
              <p className="text-[10px] font-bold text-muted-foreground">{day.focus}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Button onClick={onStart} className="w-full font-bold">
        Start this plan
      </Button>
    </motion.div>
  );
}
