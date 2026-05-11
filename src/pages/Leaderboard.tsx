import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { ExerciseScorecard } from "@/components/scorecard/ExerciseScorecard";

const Leaderboard = () => {
  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto lg:max-w-5xl lg:px-8 lg:pb-8">
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

      <ExerciseScorecard />
    </div>
  );
};

export default Leaderboard;
