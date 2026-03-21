import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Flame, Trophy, TrendingUp, Users, BarChart3 } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";
import { PowerSparkline, SPARKLINE_COLORS } from "@/components/leaderboard/PowerSparkline";
import { SharedRewardBanner } from "@/components/leaderboard/SharedRewardBanner";
import { ExerciseScorecard } from "@/components/scorecard/ExerciseScorecard";

type Tab = "leaderboard" | "scorecard";

const Leaderboard = () => {
  const [tab, setTab] = useState<Tab>("leaderboard");
  const { data: scores, isLoading } = useLeaderboard();

  const topPoints = scores?.[0]?.points ?? 0;
  const tiedUserIds =
    scores && topPoints > 0
      ? scores.filter((s) => s.points === topPoints).map((s) => s.user_id)
      : [];
  const isTied = tiedUserIds.length > 1;

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-4"
      >
        <h1 className="text-4xl font-display text-foreground">
          <Trophy className="inline w-8 h-8 text-accent mr-2" />
          Scorecard
        </h1>
      </motion.div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-xl mb-5">
        <button
          onClick={() => setTab("leaderboard")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all",
            tab === "leaderboard"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Trophy className="w-3.5 h-3.5" /> Leaderboard
        </button>
        <button
          onClick={() => setTab("scorecard")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all",
            tab === "scorecard"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" /> My Progress
        </button>
      </div>

      {tab === "scorecard" ? (
        <ExerciseScorecard />
      ) : (
        <>
          <p className="text-muted-foreground font-bold text-sm text-center mb-4">Who's gaining momentum this week? 💪</p>

          {isTied && <SharedRewardBanner tiedCount={tiedUserIds.length} />}

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
                const isTiedWinner = isTied && tiedUserIds.includes(score.user_id);
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
                      isTiedWinner
                        ? "bg-gradient-to-r from-accent/10 to-secondary/10 border-accent neon-glow-pink"
                        : isWinner
                        ? "bg-gradient-to-r from-primary/8 to-accent/8 border-primary neon-glow-pink"
                        : "bg-card border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center font-display text-lg shrink-0",
                        index < 3
                          ? `bg-gradient-to-br ${["from-primary to-neon-blue", "from-secondary to-neon-blue", "from-accent to-primary"][index]} text-primary-foreground`
                          : "bg-muted text-muted-foreground"
                      )}>
                        {isTiedWinner ? <Users className="w-4 h-4" /> : isWinner ? <Crown className="w-4 h-4" /> : index + 1}
                      </div>

                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-display text-primary-foreground comic-border shrink-0"
                        style={{ backgroundColor: profile?.avatar_color || "#FF2D87" }}
                      >
                        {profile?.display_name?.[0]?.toUpperCase() || "?"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-sm text-foreground truncate flex items-center gap-1">
                          {profile?.display_name}
                          {isTiedWinner && <span className="text-xs">🤝</span>}
                          {isWinner && !isTied && <span className="text-xs">👑</span>}
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
                          {isTiedWinner && (
                            <span className="text-[10px] font-bold text-accent px-1.5 py-0.5 rounded-full bg-accent/10">
                              TIED
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

                      <div className="shrink-0">
                        <PowerSparkline data={powerData} color={sparkColor} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* How Scoring Works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 rounded-2xl border-2 border-border bg-card p-5"
          >
            <h2 className="text-sm font-display text-foreground mb-3 flex items-center gap-2">
              ⚡ How You Score
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">🏋️</span>
                <div>
                  <p className="text-xs font-extrabold text-foreground">Complete Your Day</p>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Finish all exercises for the day → earn <span className="text-primary font-extrabold">10 pts</span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">🔥</span>
                <div>
                  <p className="text-xs font-extrabold text-foreground">Build Your Streak</p>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Train consecutive days → <span className="text-accent font-extrabold">+2 bonus</span> per day in a row
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">📈</span>
                <div>
                  <p className="text-xs font-extrabold text-foreground">Power Graph</p>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Your sparkline shows cumulative exercises completed — momentum matters!
                  </p>
                </div>
              </div>
              {isTied && (
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">🤝</span>
                  <div>
                    <p className="text-xs font-extrabold text-foreground">Shared Reward Week</p>
                    <p className="text-[11px] text-muted-foreground font-semibold">
                      Tied at the top? All winners pick the reward together!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Leaderboard;
