import { ExerciseScorecard } from "@/components/scorecard/ExerciseScorecard";

const Leaderboard = () => {
  return (
    <div className="pb-24 px-4 pt-6 max-w-[1120px] mx-auto lg:px-8 lg:pb-10" style={{ background: "#FBF9FB" }}>
      <ExerciseScorecard />
    </div>
  );
};

export default Leaderboard;
