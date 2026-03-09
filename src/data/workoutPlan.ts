export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  suggestedWeight: string;
  progression: string;
  isBodyweight?: boolean;
  isTimeBased?: boolean;
}

export interface WorkoutDay {
  day: string;
  label: string;
  emoji: string;
  isRest: boolean;
  isRecovery?: boolean;
  restNote?: string;
  exercises: Exercise[];
}

export const weeklyPlan: WorkoutDay[] = [
  {
    day: "Monday",
    label: "Lower Body",
    emoji: "🦵",
    isRest: false,
    exercises: [
      { name: "Goblet Squat", sets: 4, reps: "8", suggestedWeight: "14–20 kg", progression: "+2 to 2.5 kg/week" },
      { name: "Romanian Deadlift", sets: 4, reps: "8", suggestedWeight: "20–30 kg", progression: "+2 to 2.5 kg" },
      { name: "Smith Machine Lunges", sets: 3, reps: "10 each leg", suggestedWeight: "20–30 kg", progression: "+2 to 2.5 kg" },
      { name: "Hip Thrust", sets: 4, reps: "10", suggestedWeight: "40–55 kg", progression: "+2 to 2.5 kg" },
      { name: "Plank", sets: 3, reps: "40 sec", suggestedWeight: "Bodyweight", progression: "Increase time", isBodyweight: true, isTimeBased: true },
    ],
  },
  {
    day: "Tuesday",
    label: "Rest",
    emoji: "🧘",
    isRest: true,
    restNote: "Light walk or mobility. Recovery day.",
    exercises: [],
  },
  {
    day: "Wednesday",
    label: "Upper Body + Core",
    emoji: "💪",
    isRest: false,
    exercises: [
      { name: "Lat Pulldown", sets: 4, reps: "10", suggestedWeight: "25–35 kg", progression: "+2 to 2.5 kg" },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "10", suggestedWeight: "6–8 kg", progression: "+1 to 2 kg" },
      { name: "Seated Row", sets: 3, reps: "10", suggestedWeight: "25–30 kg", progression: "+2 to 2.5 kg" },
      { name: "Push Ups", sets: 3, reps: "8", suggestedWeight: "Bodyweight", progression: "Add reps", isBodyweight: true },
      { name: "Dead Bug", sets: 3, reps: "12", suggestedWeight: "Bodyweight", progression: "Slow controlled movement", isBodyweight: true },
      { name: "Side Plank", sets: 3, reps: "30 sec each side", suggestedWeight: "Bodyweight", progression: "Increase time", isBodyweight: true, isTimeBased: true },
    ],
  },
  {
    day: "Thursday",
    label: "Power / HIIT",
    emoji: "⚡",
    isRest: false,
    exercises: [
      { name: "Kettlebell Swings", sets: 4, reps: "15", suggestedWeight: "12–16 kg", progression: "+2 kg" },
      { name: "Box Jumps", sets: 4, reps: "8", suggestedWeight: "Bodyweight", progression: "Increase height", isBodyweight: true },
      { name: "Battle Ropes", sets: 4, reps: "20 sec", suggestedWeight: "—", progression: "Increase intensity", isTimeBased: true },
      { name: "Bike Sprint (20s all-in + 3min rest)", sets: 4, reps: "4 rounds", suggestedWeight: "—", progression: "+1 round/week" },
    ],
  },
  {
    day: "Friday",
    label: "Lower Body",
    emoji: "🦵",
    isRest: false,
    exercises: [
      { name: "Barbell Squat", sets: 4, reps: "6", suggestedWeight: "30–40 kg", progression: "+2 to 2.5 kg" },
      { name: "Hip Thrust", sets: 4, reps: "10", suggestedWeight: "45–60 kg", progression: "+2 to 5 kg" },
      { name: "Step Ups", sets: 3, reps: "10 each leg", suggestedWeight: "10 kg dumbbells", progression: "+2 kg" },
      { name: "Cable Kickbacks", sets: 3, reps: "12", suggestedWeight: "Moderate", progression: "Increase load" },
      { name: "Hanging Knee Raises", sets: 3, reps: "12", suggestedWeight: "Bodyweight", progression: "Add reps", isBodyweight: true },
    ],
  },
  {
    day: "Saturday",
    label: "Core + Back",
    emoji: "🔥",
    isRest: false,
    exercises: [
      { name: "Back Extension", sets: 3, reps: "12", suggestedWeight: "BW or 5 kg", progression: "+2 kg" },
      { name: "Cable Row", sets: 3, reps: "10", suggestedWeight: "25–35 kg", progression: "+2 to 2.5 kg" },
      { name: "Russian Twists", sets: 3, reps: "20", suggestedWeight: "6–10 kg", progression: "+2 kg" },
      { name: "Bird Dog", sets: 3, reps: "12", suggestedWeight: "Bodyweight", progression: "Slow controlled", isBodyweight: true },
      { name: "Farmer Carry", sets: 3, reps: "40 sec", suggestedWeight: "10–16 kg/hand", progression: "Increase weight", isTimeBased: true },
    ],
  },
  {
    day: "Sunday",
    label: "Recovery",
    emoji: "🌿",
    isRest: false,
    isRecovery: true,
    restNote: "Walk • Stretch • Sauna. Focus on recovery.",
    exercises: [],
  },
];
