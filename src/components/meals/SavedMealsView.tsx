import { motion } from "framer-motion";
import { Heart, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedMeal {
  id: string;
  meal_type: string;
  title: string;
  protein: number;
  prep_time: number;
  is_favorite: boolean;
}

interface Props {
  meals: SavedMeal[];
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onRemove: (id: string) => void;
}

const mealEmojis: Record<string, string> = {
  breakfast: "🥤",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🥜",
};

export function SavedMealsView({ meals, onToggleFavorite, onRemove }: Props) {
  if (meals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm font-bold">
        No saved meals yet. Save meals from your Power Routine!
      </div>
    );
  }

  const grouped = meals.reduce<Record<string, SavedMeal[]>>((acc, meal) => {
    acc[meal.meal_type] = acc[meal.meal_type] || [];
    acc[meal.meal_type].push(meal);
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {Object.entries(grouped).map(([type, typeMeals]) => (
        <div key={type} className="rounded-2xl border-2 border-border bg-card p-4">
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 mb-3 capitalize">
            <span>{mealEmojis[type] || "🍽️"}</span>
            {type}
          </h3>
          <div className="space-y-2">
            {typeMeals.map((meal) => (
              <div
                key={meal.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-bold text-foreground">{meal.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-extrabold text-primary">{meal.protein}g protein</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-bold">
                      <Clock className="w-3 h-3" />
                      {meal.prep_time}m
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onToggleFavorite(meal.id, !meal.is_favorite)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Heart
                      className={cn(
                        "w-4 h-4",
                        meal.is_favorite ? "text-primary fill-primary" : "text-muted-foreground"
                      )}
                    />
                  </button>
                  <button
                    onClick={() => onRemove(meal.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
