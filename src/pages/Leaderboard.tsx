import { motion } from "framer-motion";
import { Crown, Flame, Trophy, TrendingUp } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";

const RANK_COLORS = [
  "from-primary to-neon-blue",
  "from-secondary to-neon-blue",
  "from-accent to-primary",
];

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/** Tiny SVG sparkline showing cumulative power over the week */
function PowerSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 28;
  const padding = 2;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (w - padding * 2);
    const y = h - padding - (val / max) * (h - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `${linePath} L${w - padding},${h - padding} L${padding},${h - padding} Z`;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={w} height={h} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${color})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Current point dot */}
        {data.length > 0 && (() => {
          let lastIdx = -1;
          for (let i = data.length - 1; i >= 0; i--) { if (data[i] > 0) { lastIdx = i; break; } }
          if (lastIdx < 0) return null;
          const cx = padding + (lastIdx / (data.length - 1)) * (w - padding * 2);
          const cy = h - padding - (data[lastIdx] / max) * (h - padding * 2);
          return <circle cx={cx} cy={cy} r={2.5} fill={color} />;
        })()}
      </svg>
      <div className="flex gap-[6px]">
        {DAY_LABELS.map((d, i) => (
          <span
            key={i}
            className={cn(
              "text-[8px] font-bold leading-none",
              data[i] > 0 ? "text-foreground/60" : "text-muted-foreground/40"
            )}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

const SPARKLINE_COLORS = [
  "hsl(330, 80%, 55%)",  // primary pink
  "hsl(280, 50%, 65%)",  // secondary lilac
  "hsl(45, 90%, 55%)",   // accent gold
  "hsl(260, 60%, 60%)",  // blue
  "hsl(168, 70%, 48%)",  // teal
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
          <Trophy className="inline w-8 h-8 text-accent mr-2" />
          Scorecard
        </h1>
        <p className="text-muted-foreground font-bold text-sm mt-1">Who's gaining momentum this week? 💪</p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
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
            const sparkColor = SPARKLINE_COLORS[index % SPARKLINE_COLORS.length];
            const powerData = (score as any).powerData || [0, 0, 0, 0, 0, 0, 0];
            const hasMomentum = powerData.some((v: number) => v > 0);

            return (
              <motion.div
                key={score.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.08 }}
                className={cn(
                  "relative rounded-2xl border-2 transition-all overflow-hidden",
                  isWinner
                    ? "bg-gradient-to-r from-primary/8 to-accent/8 border-primary neon-glow-pink"
                    : "bg-card border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center gap-3 p-4">
                  {/* Rank Badge */}
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-display text-lg shrink-0",
                    index < 3
                      ? `bg-gradient-to-br ${RANK_COLORS[index]} text-primary-foreground`
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isWinner ? <Crown className="w-4 h-4" /> : index + 1}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-display text-primary-foreground comic-border shrink-0"
                    style={{ backgroundColor: profile?.avatar_color || "#FF2D87" }}
                  >
                    {profile?.display_name?.[0]?.toUpperCase() || "?"}
                  </div>

                  {/* Name + Stats */}
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-sm text-foreground truncate flex items-center gap-1">
                      {profile?.display_name}
                      {isWinner && <span className="text-xs">👑</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-primary">{score.points} pts</span>
                      {score.streak > 0 && (
                        <span className="flex items-center gap-0.5 text-accent text-xs font-bold">
                          <Flame className="w-3 h-3" />
                          {score.streak}
                        </span>
                      )}
                      {hasMomentum && (
                        <span className="flex items-center gap-0.5 text-secondary text-[10px] font-bold">
                          <TrendingUp className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    {score.points > 0 && (() => {
                      const streakBonus = score.streak > 1 ? (score.streak - 1) * 2 : 0;
                      const dayPoints = score.points - streakBonus;
                      const days = dayPoints / 10;
                      return (
                        <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                          {days} day{days !== 1 ? "s" : ""} × 10pts{streakBonus > 0 ? ` + ${streakBonus} streak bonus` : ""}
                        </p>
                      );
                    })()}
                  </div>

                  {/* Power Sparkline */}
                  <div className="shrink-0">
                    <PowerSparkline data={powerData} color={sparkColor} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {scores && scores.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-3 rounded-xl bg-muted/50 text-center"
        >
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            📈 Power Graph = cumulative exercises completed this week
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default Leaderboard;
