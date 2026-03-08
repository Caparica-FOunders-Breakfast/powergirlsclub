import { motion } from "framer-motion";
import { Crown, Flame, Trophy } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";

const RANK_COLORS = [
  "from-neon-pink to-neon-blue",
  "from-neon-teal to-neon-blue",
  "from-neon-yellow to-neon-pink",
];

const Leaderboard = () => {
  const { data: scores, isLoading } = useLeaderboard();

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-6"
      >
        <h1 className="text-4xl font-display text-foreground">
          <Trophy className="inline w-8 h-8 text-neon-yellow mr-2" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground font-bold text-sm mt-1">Who's crushing it this week? 💪</p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !scores || scores.length === 0 ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-12 bg-card rounded-2xl comic-border"
        >
          <p className="text-5xl mb-3">🏋️‍♀️</p>
          <h2 className="text-2xl font-display text-foreground">No Scores Yet!</h2>
          <p className="text-muted-foreground font-semibold mt-2">
            Complete workouts to climb the ranks!
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {scores.map((score, index) => {
            const profile = score.profile as any;
            const isWinner = index === 0 && score.points > 0;

            return (
              <motion.div
                key={score.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                  isWinner
                    ? "bg-gradient-to-r from-neon-pink/10 to-neon-yellow/10 border-primary neon-glow-pink"
                    : "bg-card border-border hover:border-primary/30"
                )}
              >
                {/* Rank */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-display text-xl text-primary-foreground",
                  index < 3 ? `bg-gradient-to-br ${RANK_COLORS[index]}` : "bg-muted text-muted-foreground"
                )}>
                  {isWinner ? <Crown className="w-5 h-5" /> : index + 1}
                </div>

                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold comic-border"
                  style={{ backgroundColor: profile?.avatar_color || "#FF2D87" }}
                >
                  {profile?.display_name?.[0]?.toUpperCase() || "?"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-foreground truncate flex items-center gap-1">
                    {profile?.display_name}
                    {isWinner && <span className="text-xs">👑</span>}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-primary">{score.points} pts</span>
                    {score.streak > 0 && (
                      <span className="flex items-center gap-0.5 text-neon-yellow font-bold">
                        <Flame className="w-3.5 h-3.5" />
                        {score.streak}
                      </span>
                    )}
                  </div>
                </div>

                {isWinner && (
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-2xl"
                  >
                    🏆
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
