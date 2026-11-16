import { looseExerciseKey } from "@/lib/plan";

/**
 * "Why this exercise" notes shown behind the info icon in Profile → Your
 * training plan. Keyed by the exercise library name and matched loosely
 * (looseExerciseKey), so "Goblet Squats" or "Romanian deadlift" in an imported
 * plan still find their note. Plain language, no em dashes (brief rule).
 */
const BENEFITS: Record<string, string> = {
  // Power
  "Jump squats": "Trains your legs to produce force fast, the power you lose first with age. Builds springy legs, stronger bones and better balance for quick moves like catching a fall.",
  "Med ball chest throws": "Teaches your chest, shoulders and arms to push explosively. Great for upper-body power, which most women rarely train, and it is fun stress relief.",
  "Kettlebell swings": "A powerful hip snap that builds strong glutes and hamstrings and gets your heart rate up. Strengthens the back of the body that protects your lower back.",
  "Pogo jumps": "Quick, small bounces that make your calves, ankles and Achilles springy and resilient. The light impact also helps keep bones strong.",
  "Box jumps": "Builds explosive leg power and teaches you to land softly and with control. Good for strong knees, quick reactions and confidence.",
  "Lateral bounds": "Side-to-side jumps that build power and stability in a direction we rarely train. Strengthens hips and knees for sports, hiking and uneven ground.",
  // Sprint
  "Bike sprints": "Short all-out efforts that boost heart and lung fitness in very little time. Improves how your body handles blood sugar while being easy on the joints.",
  // Strength
  "Barbell squat": "The king of leg exercises. Builds strong thighs and glutes, loads your spine and hips to keep bones dense, and makes everyday moves like standing up, climbing stairs and lifting easier.",
  "Dumbbell Romanian deadlift": "Strengthens your hamstrings, glutes and lower back and teaches you to hinge at the hips. That is the safe way to pick things up, so it helps protect your back.",
  "Hip thrust": "The best glute builder. Strong glutes support your lower back, knees and posture, and power every walk, run and jump.",
  "Bulgarian split squat": "Trains one leg at a time, so it fixes left-right differences and builds balance. Works your thighs and glutes hard with only light weights.",
  "Dumbbell shoulder press": "Builds strong, stable shoulders for lifting things overhead, like putting a suitcase in the overhead bin. Your core works too to keep you upright.",
  "Single-arm dumbbell row": "Strengthens your upper back and lats, which pull your shoulders back for better posture. Balances out all the time we spend hunched over phones and desks.",
  "Dumbbell pullover": "Stretches and strengthens your lats and chest together. Improves shoulder mobility and helps you breathe and stand tall.",
  "Push ups": "A full upper-body move: chest, shoulders, arms and core in one. Builds pushing strength you can train anywhere, no equipment needed.",
  "Assisted pull ups": "Builds your back and arms toward a full pull up. Strong pulling muscles improve posture and shoulder health.",
  "Goblet squat": "A beginner-friendly squat that builds strong legs and glutes and teaches good squat form. Holding the weight in front keeps you upright and works your core.",
  "Dumbbell bench press": "Builds chest, shoulder and arm strength for pushing. Dumbbells let each arm work on its own, which evens out strength between sides.",
  "Farmer carry": "Walking with heavy weights builds grip, core and shoulder strength. Grip strength is one of the best predictors of healthy ageing, and it makes carrying groceries easy.",
  // Core
  "Plank": "Builds a strong, stable core that protects your lower back. Teaches your body to stay steady while your arms and legs do the work.",
  "Dead bug": "Trains your deep core muscles to keep your lower back steady while your arms and legs move. Gentle on the back and great for posture and pelvic floor support.",
  "Copenhagen plank": "Strengthens your inner thighs and the sides of your core. Helps protect your groin and knees and keeps your hips stable.",
};

const BY_KEY = new Map(Object.entries(BENEFITS).map(([name, text]) => [looseExerciseKey(name), text]));

/** The "why" note for an exercise, or undefined if we don't have one. */
export const exerciseBenefit = (name: string | undefined): string | undefined =>
  name ? BY_KEY.get(looseExerciseKey(name)) : undefined;
