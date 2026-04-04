import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Clock, ShoppingCart, Utensils } from "lucide-react";
import { weeklyMealPlan, groceryList, type DayPlan, type Meal } from "@/data/mealPlan";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";

function MealCard({ label, emoji, meal }: { label: string; emoji: string; meal: Meal }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-lg mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-tight">{meal.name}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[10px] font-extrabold text-primary">{meal.protein}g protein</span>
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground">
            <Clock className="w-3 h-3" />
            {meal.cookTime}min
          </span>
        </div>
      </div>
    </div>
  );
}

function DayCard({ day, index }: { day: DayPlan; index: number }) {
  const [open, setOpen] = useState(false);
  const proteinPct = Math.min((day.totalProtein / 120) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left">
            <div className="flex items-center gap-3">
              <span className="text-xl">{day.emoji}</span>
              <div>
                <p className="text-sm font-extrabold text-foreground">{day.day}</p>
                <p className="text-[10px] font-bold text-muted-foreground">{day.totalProtein}g protein</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16">
                <Progress value={proteinPct} className="h-1.5" />
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-1 border-t border-border pt-3">
              <MealCard label="Breakfast" emoji="🍳" meal={day.breakfast} />
              <MealCard label="Lunch" emoji="🥗" meal={day.lunch} />
              <MealCard label="Dinner" emoji="🍽️" meal={day.dinner} />
              <MealCard label="Snack" emoji="🥜" meal={day.snack} />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
}

export default function MealPlan() {
  const [tab, setTab] = useState<"plan" | "grocery">("plan");
  const avgProtein = Math.round(weeklyMealPlan.reduce((s, d) => s + d.totalProtein, 0) / 7);

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-4 bg-card rounded-2xl border-2 border-border"
      >
        <p className="text-3xl mb-1">🥗</p>
        <h2 className="text-xl font-display text-foreground">Meal Plan</h2>
        <p className="text-xs font-bold text-muted-foreground mt-1">
          High-protein • 7 days • Avg {avgProtein}g/day
        </p>
      </motion.div>

      {/* Tab switcher */}
      <div className="flex rounded-xl border-2 border-border overflow-hidden">
        <button
          onClick={() => setTab("plan")}
          className={cn(
            "flex-1 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5",
            tab === "plan"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          <Utensils className="w-3.5 h-3.5" />
          Weekly Plan
        </button>
        <button
          onClick={() => setTab("grocery")}
          className={cn(
            "flex-1 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5",
            tab === "grocery"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Grocery List
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {tab === "plan" ? (
          <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {weeklyMealPlan.map((day, i) => (
              <DayCard key={day.day} day={day} index={i} />
            ))}
          </motion.div>
        ) : (
          <motion.div key="grocery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {groceryList.map((cat) => (
              <div key={cat.category} className="rounded-2xl border-2 border-border bg-card p-4">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 mb-3">
                  <span>{cat.emoji}</span>
                  {cat.category}
                </h3>
                <ul className="space-y-1.5">
                  {cat.items.map((item) => (
                    <li key={item} className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
