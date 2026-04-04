import { useState } from "react";
import { motion } from "framer-motion";
import { Shuffle, Heart, Lock, Clock, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MealVariation } from "@/hooks/useGeneratedMeals";

interface Props {
  mealType: string;
  emoji: string;
  variations: MealVariation[];
  onShuffle: () => void;
  onSave: (meal: MealVariation) => void;
  isSaved: boolean;
  isShuffling: boolean;
}

export function MealCard({ mealType, emoji, variations, onShuffle, onSave, isSaved, isShuffling }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showRecipe, setShowRecipe] = useState(false);

  const meal = variations[activeIndex];
  if (!meal) return null;

  const cycleVariation = () => {
    setActiveIndex((i) => (i + 1) % variations.length);
    setShowRecipe(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {mealType}
            </p>
            <p className="text-sm font-bold text-foreground leading-tight">{meal.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold text-primary">{meal.protein}g</span>
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-bold">
            <Clock className="w-3 h-3" />
            {meal.prep_time}m
          </span>
        </div>
      </div>

      {/* Variation dots */}
      {variations.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {variations.map((_, i) => (
            <button
              key={i}
              onClick={() => { setActiveIndex(i); setShowRecipe(false); }}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i === activeIndex ? "bg-primary" : "bg-border"
              )}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-4 pb-3">
        <button
          onClick={cycleVariation}
          disabled={variations.length <= 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <Shuffle className="w-3 h-3" />
          Swap
        </button>
        <button
          onClick={onShuffle}
          disabled={isShuffling}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <Shuffle className="w-3 h-3" />
          {isShuffling ? "..." : "New ideas"}
        </button>
        <button
          onClick={() => onSave(meal)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors",
            isSaved
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className={cn("w-3 h-3", isSaved && "fill-primary")} />
          {isSaved ? "Saved" : "Save"}
        </button>
        <button
          onClick={() => setShowRecipe(!showRecipe)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors ml-auto"
        >
          <BookOpen className="w-3 h-3" />
          Recipe
          {showRecipe ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Recipe expandable */}
      {showRecipe && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-border px-4 py-3 space-y-3"
        >
          {/* Ingredients */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
              Ingredients
            </p>
            <ul className="space-y-1">
              {meal.ingredients.map((ing, i) => (
                <li key={i} className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                  <span className="text-muted-foreground">{ing.quantity}</span> {ing.item}
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
              Steps
            </p>
            <ol className="space-y-1.5">
              {meal.steps.map((step, i) => (
                <li key={i} className="text-xs font-semibold text-foreground flex gap-2">
                  <span className="text-primary font-extrabold shrink-0">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
