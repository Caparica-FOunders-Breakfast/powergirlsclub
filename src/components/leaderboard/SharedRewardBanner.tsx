import { motion } from "framer-motion";
import { Users } from "lucide-react";

interface SharedRewardBannerProps {
  tiedCount: number;
}

export function SharedRewardBanner({ tiedCount }: SharedRewardBannerProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="mb-4 p-4 rounded-2xl border-2 border-accent bg-gradient-to-r from-accent/10 to-secondary/10 text-center"
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <Users className="w-5 h-5 text-accent" />
        <span className="font-display text-lg text-foreground">Shared Reward Week Activated</span>
      </div>
      <p className="text-xs font-bold text-muted-foreground">
        🤝 {tiedCount} users are tied — they all get to configure this week's reward together!
      </p>
    </motion.div>
  );
}
