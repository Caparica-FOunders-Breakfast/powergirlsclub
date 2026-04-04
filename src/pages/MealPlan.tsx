import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Sparkles, ShoppingCart, Heart, Utensils, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMealPreferences } from "@/hooks/useMealPreferences";
import { useGeneratedMeals } from "@/hooks/useGeneratedMeals";
import { useSavedMeals } from "@/hooks/useSavedMeals";
import { PreferencesForm } from "@/components/meals/PreferencesForm";
import { MealCard } from "@/components/meals/MealCard";
import { GroceryListView } from "@/components/meals/GroceryListView";
import { SavedMealsView } from "@/components/meals/SavedMealsView";
import { weeklyMealPlan, groceryList } from "@/data/mealPlan";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Clock } from "lucide-react";

// Keep old static plan for reference mode
function StaticMealPlan() {
  const [tab, setTab] = useState<"plan" | "grocery">("plan");
  const avgProtein = Math.round(weeklyMealPlan.reduce((s, d) => s + d.totalProtein, 0) / 7);

  return (
    <div className="space-y-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-4 bg-card rounded-2xl border-2 border-border">
        <p className="text-3xl mb-1">📋</p>
        <h2 className="text-xl font-display text-foreground">Static Meal Plan</h2>
        <p className="text-xs font-bold text-muted-foreground mt-1">7-day reference • Avg {avgProtein}g/day</p>
      </motion.div>

      <div className="flex rounded-xl border-2 border-border overflow-hidden">
        <button onClick={() => setTab("plan")} className={cn("flex-1 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5", tab === "plan" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
          <Utensils className="w-3.5 h-3.5" /> Weekly Plan
        </button>
        <button onClick={() => setTab("grocery")} className={cn("flex-1 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5", tab === "grocery" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
          <ShoppingCart className="w-3.5 h-3.5" /> Grocery List
        </button>
      </div>

      {tab === "plan" ? (
        <div className="space-y-3">
          {weeklyMealPlan.map((day, i) => (
            <StaticDayCard key={day.day} day={day} index={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {groceryList.map((cat) => (
            <div key={cat.category} className="rounded-2xl border-2 border-border bg-card p-4">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 mb-3">
                <span>{cat.emoji}</span>{cat.category}
              </h3>
              <ul className="space-y-1.5">
                {cat.items.map((item) => (
                  <li key={item} className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StaticDayCard({ day, index }: { day: typeof weeklyMealPlan[0]; index: number }) {
  const [open, setOpen] = useState(false);
  const proteinPct = Math.min((day.totalProtein / 120) * 100, 100);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
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
              <div className="w-16"><Progress value={proteinPct} className="h-1.5" /></div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-1 border-t border-border pt-3">
              {[
                { emoji: "🍳", meal: day.breakfast },
                { emoji: "🥗", meal: day.lunch },
                { emoji: "🥜", meal: day.snack },
                { emoji: "🍽️", meal: day.dinner },
              ].map(({ emoji, meal }) => (
                <div key={meal.name} className="flex items-start gap-3 py-2">
                  <span className="text-lg mt-0.5">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground leading-tight">{meal.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-extrabold text-primary">{meal.protein}g protein</span>
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground">
                        <Clock className="w-3 h-3" />{meal.cookTime}min
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
}

// Main Power Routine component
function PowerRoutine() {
  const { preferences, isLoading: prefsLoading, upsert } = useMealPreferences();
  const { plan, isLoading: planLoading, generate } = useGeneratedMeals();
  const { savedMeals, saveMeal, removeMeal, toggleFavorite } = useSavedMeals();
  const { toast } = useToast();

  const [showPrefs, setShowPrefs] = useState(false);
  const [subTab, setSubTab] = useState<"meals" | "grocery" | "saved">("meals");

  const handleGenerate = () => {
    generate.mutate(
      { preferences },
      {
        onSuccess: () => toast({ description: "✨ Power Routine generated!" }),
        onError: (e) => toast({ description: `Error: ${e.message}`, variant: "destructive" }),
      }
    );
  };

  const handleShuffle = (mealType: string) => {
    generate.mutate(
      { preferences, shuffleMealType: mealType },
      {
        onSuccess: () => toast({ description: `🔄 New ${mealType} ideas generated!` }),
        onError: (e) => toast({ description: `Error: ${e.message}`, variant: "destructive" }),
      }
    );
  };

  const handleSaveMeal = (meal: any, mealType: string) => {
    saveMeal.mutate(
      { meal, mealType },
      {
        onSuccess: () => toast({ description: `❤️ ${meal.title} saved!` }),
      }
    );
  };

  const isMealSaved = (title: string) => savedMeals.some((m) => m.title === title);

  if (prefsLoading || planLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Protein progress
  const proteinEst = plan?.daily_protein_estimate || 0;
  const proteinTarget = preferences.daily_protein_target;
  const proteinPct = Math.min((proteinEst / proteinTarget) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-4 bg-card rounded-2xl border-2 border-border relative"
      >
        <button
          onClick={() => setShowPrefs(!showPrefs)}
          className="absolute top-3 right-3 p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
        <p className="text-3xl mb-1">💪</p>
        <h2 className="text-xl font-display text-foreground">Power Routine</h2>
        <p className="text-xs font-bold text-muted-foreground mt-1">
          Simple meals • High protein • Repeat & win
        </p>

        {/* Protein progress */}
        {plan && (
          <div className="mt-3 px-8">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-muted-foreground">Daily Protein</span>
              <span className="text-[10px] font-extrabold text-primary">
                {proteinEst}g / {proteinTarget}g
              </span>
            </div>
            <Progress value={proteinPct} className="h-2" />
            {proteinEst < proteinTarget && (
              <p className="text-[10px] font-bold text-muted-foreground mt-1">
                💡 Add {proteinTarget - proteinEst}g more — try an extra scoop or Greek yogurt
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Preferences form */}
      <AnimatePresence>
        {showPrefs && (
          <PreferencesForm
            preferences={preferences}
            onSave={(prefs) => {
              upsert.mutate(prefs, {
                onSuccess: () => {
                  toast({ description: "✅ Preferences saved!" });
                  setShowPrefs(false);
                },
              });
            }}
            onClose={() => setShowPrefs(false)}
            isSaving={upsert.isPending}
          />
        )}
      </AnimatePresence>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={generate.isPending}
        className="w-full rounded-xl font-extrabold h-12"
      >
        {generate.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Generating your routine...
          </>
        ) : plan ? (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Regenerate Routine
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate My Power Routine
          </>
        )}
      </Button>

      {/* Sub-tabs */}
      {plan && (
        <>
          <div className="flex rounded-xl border-2 border-border overflow-hidden">
            {[
              { key: "meals" as const, label: "Meals", icon: Utensils },
              { key: "grocery" as const, label: "Grocery", icon: ShoppingCart },
              { key: "saved" as const, label: "Saved", icon: Heart },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSubTab(key)}
                className={cn(
                  "flex-1 py-2 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5",
                  subTab === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {subTab === "meals" && (
              <motion.div key="meals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <MealCard
                  mealType="Breakfast"
                  emoji="🥤"
                  variations={plan.meals.breakfast || []}
                  onShuffle={() => handleShuffle("breakfast")}
                  onSave={(meal) => handleSaveMeal(meal, "breakfast")}
                  isSaved={plan.meals.breakfast?.some((m) => isMealSaved(m.title)) || false}
                  isShuffling={generate.isPending}
                />
                <MealCard
                  mealType="Lunch"
                  emoji="🥗"
                  variations={plan.meals.lunch || []}
                  onShuffle={() => handleShuffle("lunch")}
                  onSave={(meal) => handleSaveMeal(meal, "lunch")}
                  isSaved={plan.meals.lunch?.some((m) => isMealSaved(m.title)) || false}
                  isShuffling={generate.isPending}
                />
                <MealCard
                  mealType="Snack"
                  emoji="🥜"
                  variations={plan.meals.snack || []}
                  onShuffle={() => handleShuffle("snack")}
                  onSave={(meal) => handleSaveMeal(meal, "snack")}
                  isSaved={plan.meals.snack?.some((m) => isMealSaved(m.title)) || false}
                  isShuffling={generate.isPending}
                />
                <MealCard
                  mealType="Dinner"
                  emoji="🍽️"
                  variations={plan.meals.dinner || []}
                  onShuffle={() => handleShuffle("dinner")}
                  onSave={(meal) => handleSaveMeal(meal, "dinner")}
                  isSaved={plan.meals.dinner?.some((m) => isMealSaved(m.title)) || false}
                  isShuffling={generate.isPending}
                />
              </motion.div>
            )}

            {subTab === "grocery" && (
              <motion.div key="grocery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <GroceryListView groceryList={plan.grocery_list} />
              </motion.div>
            )}

            {subTab === "saved" && (
              <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SavedMealsView
                  meals={savedMeals}
                  onToggleFavorite={(id, fav) => toggleFavorite.mutate({ id, isFavorite: fav })}
                  onRemove={(id) => removeMeal.mutate(id)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// Main page with mode toggle
export default function MealPlan() {
  const [mode, setMode] = useState<"power" | "static">("power");

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl border-2 border-border overflow-hidden">
        <button
          onClick={() => setMode("power")}
          className={cn(
            "flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5",
            mode === "power"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Power Routine
        </button>
        <button
          onClick={() => setMode("static")}
          className={cn(
            "flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5",
            mode === "static"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          <Utensils className="w-3.5 h-3.5" />
          7-Day Plan
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "power" ? (
          <motion.div key="power" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PowerRoutine />
          </motion.div>
        ) : (
          <motion.div key="static" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <StaticMealPlan />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
