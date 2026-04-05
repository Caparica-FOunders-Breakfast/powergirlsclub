import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Sparkles, ShoppingCart, Heart, Utensils, Loader2, ChevronDown, Clock, CalendarDays, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMealPreferences } from "@/hooks/useMealPreferences";
import { useGeneratedMeals, type GeneratedPlan } from "@/hooks/useGeneratedMeals";
import { useSavedMeals } from "@/hooks/useSavedMeals";
import { useMealCompletions } from "@/hooks/useMealCompletions";
import { PreferencesForm } from "@/components/meals/PreferencesForm";
import { MealCard } from "@/components/meals/MealCard";
import { GroceryListView } from "@/components/meals/GroceryListView";
import { SavedMealsView } from "@/components/meals/SavedMealsView";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ─── 7-Day Plan built from Power Routine ───

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dayEmojis = ["💪", "🔥", "🥦", "⚡", "🎉", "🌿", "🧘"];

interface RoutineMealInfo {
  emoji: string;
  title: string;
  protein: number;
  prepTime: number;
}

function RoutineDayCard({ day, emoji, meals, totalProtein, proteinTarget, index, dayIndex, isCompleted, onToggle, completedCount }: {
  day: string; emoji: string; meals: RoutineMealInfo[]; totalProtein: number; proteinTarget: number; index: number;
  dayIndex: number; isCompleted: (mealIndex: number) => boolean; onToggle: (mealIndex: number) => void; completedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const proteinPct = Math.min((totalProtein / proteinTarget) * 100, 100);
  const allDone = completedCount === meals.length;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className={cn("rounded-2xl border-2 bg-card overflow-hidden transition-colors", allDone ? "border-primary/40 bg-primary/5" : "border-border")}>
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left">
            <div className="flex items-center gap-3">
              <span className="text-xl">{allDone ? "✅" : emoji}</span>
              <div>
                <p className="text-sm font-extrabold text-foreground">{day}</p>
                <p className="text-[10px] font-bold text-muted-foreground">
                  {completedCount}/{meals.length} meals • {totalProtein}g protein
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16"><Progress value={proteinPct} className="h-1.5" /></div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-1 border-t border-border pt-3">
              {meals.map((m, i) => {
                const done = isCompleted(i);
                return (
                  <div key={i} className={cn("flex items-center gap-3 py-2 rounded-lg px-2 -mx-2 transition-colors", done && "opacity-60")}>
                    <span className="text-lg">{m.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-bold text-foreground leading-tight", done && "line-through")}>{m.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-extrabold text-primary">{m.protein}g protein</span>
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground">
                          <Clock className="w-3 h-3" />{m.prepTime}min
                        </span>
                      </div>
                    </div>
                    <Checkbox
                      checked={done}
                      onCheckedChange={() => onToggle(i)}
                    />
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
}

// Rotation pattern: 3 variations across 7 days, each used at least 2x
const variationPattern = [0, 0, 1, 1, 2, 2, 0];

function WeeklyFromRoutine({ plan, proteinTarget }: { plan: GeneratedPlan; proteinTarget: number }) {
  const [tab, setTab] = useState<"plan" | "grocery">("plan");
  const { isCompleted, completedCountForDay, toggle } = useMealCompletions();

  const avgProtein = variationPattern.reduce((sum, vi) => {
    const b = plan.meals.breakfast?.[vi] || plan.meals.breakfast?.[0];
    const l = plan.meals.lunch?.[vi] || plan.meals.lunch?.[0];
    const d = plan.meals.dinner?.[vi] || plan.meals.dinner?.[0];
    const s = plan.meals.snack?.[vi] || plan.meals.snack?.[0];
    return sum + (b?.protein || 0) + (l?.protein || 0) + (d?.protein || 0) + (s?.protein || 0);
  }, 0) / 7;

  return (
    <div className="space-y-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-4 bg-card rounded-2xl border-2 border-border">
        <p className="text-3xl mb-1">📋</p>
        <h2 className="text-xl font-display text-foreground">Your Weekly Plan</h2>
        <p className="text-xs font-bold text-muted-foreground mt-1">
          Based on your Power Routine • ~{Math.round(avgProtein)}g/day avg
        </p>
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
          {dayNames.map((day, i) => {
            const vi = variationPattern[i];
            const breakfast = plan.meals.breakfast?.[vi] || plan.meals.breakfast?.[0];
            const lunch = plan.meals.lunch?.[vi] || plan.meals.lunch?.[0];
            const snack = plan.meals.snack?.[vi] || plan.meals.snack?.[0];
            const dinner = plan.meals.dinner?.[vi] || plan.meals.dinner?.[0];
            const totalProtein = (breakfast?.protein || 0) + (lunch?.protein || 0) + (snack?.protein || 0) + (dinner?.protein || 0);
            const meals: RoutineMealInfo[] = [
              { emoji: "🍳", title: breakfast?.title || "Breakfast", protein: breakfast?.protein || 0, prepTime: breakfast?.prep_time || 0 },
              { emoji: "🥗", title: lunch?.title || "Lunch", protein: lunch?.protein || 0, prepTime: lunch?.prep_time || 0 },
              { emoji: "🥜", title: snack?.title || "Snack", protein: snack?.protein || 0, prepTime: snack?.prep_time || 0 },
              { emoji: "🍽️", title: dinner?.title || "Dinner", protein: dinner?.protein || 0, prepTime: dinner?.prep_time || 0 },
            ];
            return <RoutineDayCard key={day} day={day} emoji={dayEmojis[i]} meals={meals} totalProtein={totalProtein} proteinTarget={proteinTarget} index={i} dayIndex={i} isCompleted={(mealIndex) => isCompleted(i, mealIndex)} onToggle={(mealIndex) => toggle.mutate({ dayIndex: i, mealIndex })} completedCount={completedCountForDay(i)} />;
          })}
        </div>
      ) : (
        <GroceryListView groceryList={plan.grocery_list} />
      )}
    </div>
  );
}

function EmptyWeeklyPlan() {
  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12 bg-card rounded-2xl border-2 border-border">
      <p className="text-4xl mb-3">📋</p>
      <h2 className="text-xl font-display text-foreground">No Plan Yet</h2>
      <p className="text-sm font-bold text-muted-foreground mt-2 px-6">
        Generate a Power Routine first — your 7-day plan will be built from it automatically.
      </p>
    </motion.div>
  );
}

// ─── Power Routine ───

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
      { onSuccess: () => toast({ description: `❤️ ${meal.title} saved!` }) }
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

  const proteinEst = plan?.daily_protein_estimate || 0;
  const proteinTarget = preferences.daily_protein_target;
  const proteinPct = Math.min((proteinEst / proteinTarget) * 100, 100);

  return (
    <div className="space-y-4">
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

      <Button onClick={handleGenerate} disabled={generate.isPending} className="w-full rounded-xl font-extrabold h-12">
        {generate.isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating your routine...</>
        ) : plan ? (
          <><Sparkles className="w-4 h-4 mr-2" />Regenerate Routine</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" />Generate My Power Routine</>
        )}
      </Button>

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
                  subTab === key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {subTab === "meals" && (
              <motion.div key="meals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <MealCard mealType="Breakfast" emoji="🥤" variations={plan.meals.breakfast || []} onShuffle={() => handleShuffle("breakfast")} onSave={(meal) => handleSaveMeal(meal, "breakfast")} isSaved={plan.meals.breakfast?.some((m) => isMealSaved(m.title)) || false} isShuffling={generate.isPending} />
                <MealCard mealType="Lunch" emoji="🥗" variations={plan.meals.lunch || []} onShuffle={() => handleShuffle("lunch")} onSave={(meal) => handleSaveMeal(meal, "lunch")} isSaved={plan.meals.lunch?.some((m) => isMealSaved(m.title)) || false} isShuffling={generate.isPending} />
                <MealCard mealType="Snack" emoji="🥜" variations={plan.meals.snack || []} onShuffle={() => handleShuffle("snack")} onSave={(meal) => handleSaveMeal(meal, "snack")} isSaved={plan.meals.snack?.some((m) => isMealSaved(m.title)) || false} isShuffling={generate.isPending} />
                <MealCard mealType="Dinner" emoji="🍽️" variations={plan.meals.dinner || []} onShuffle={() => handleShuffle("dinner")} onSave={(meal) => handleSaveMeal(meal, "dinner")} isSaved={plan.meals.dinner?.some((m) => isMealSaved(m.title)) || false} isShuffling={generate.isPending} />
              </motion.div>
            )}
            {subTab === "grocery" && (
              <motion.div key="grocery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <GroceryListView groceryList={plan.grocery_list} />
              </motion.div>
            )}
            {subTab === "saved" && (
              <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SavedMealsView meals={savedMeals} onToggleFavorite={(id, fav) => toggleFavorite.mutate({ id, isFavorite: fav })} onRemove={(id) => removeMeal.mutate(id)} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ─── Main page ───

export default function MealPlan() {
  const [mode, setMode] = useState<"power" | "weekly">("power");
  const { plan, isLoading } = useGeneratedMeals();
  const { preferences } = useMealPreferences();

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
      <div className="flex rounded-xl border-2 border-border overflow-hidden">
        <button
          onClick={() => setMode("power")}
          className={cn(
            "flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5",
            mode === "power" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Power Routine
        </button>
        <button
          onClick={() => setMode("weekly")}
          className={cn(
            "flex-1 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5",
            mode === "weekly" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          7-Day Plan
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === "power" ? (
          <motion.div key="power" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PowerRoutine />
          </motion.div>
        ) : (
          <motion.div key="weekly" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : plan ? (
              <WeeklyFromRoutine plan={plan} proteinTarget={preferences.daily_protein_target} />
            ) : (
              <EmptyWeeklyPlan />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
