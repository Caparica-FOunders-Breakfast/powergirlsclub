import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChefHat, Sparkles, Clock, Users, X, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMealCombos, type MealCombo } from "@/hooks/useMealCombos";
import { supabase } from "@/integrations/supabase/client";
import { useSavedMeals } from "@/hooks/useSavedMeals";

interface Ingredient {
  emoji: string;
  name: string;
}

interface Recipe {
  title: string;
  description: string;
  prep_time: string;
  cook_time: string;
  servings: number;
  ingredients: string[];
  steps: string[];
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
  tips?: string;
}

const PROTEINS: Ingredient[] = [
  { emoji: "🐔", name: "Chicken" },
  { emoji: "🥩", name: "Beef" },
  { emoji: "🐟", name: "Salmon" },
  { emoji: "🐠", name: "Tuna" },
  { emoji: "🥚", name: "Eggs" },
  { emoji: "🧈", name: "Tofu" },
  { emoji: "🦃", name: "Turkey" },
  { emoji: "🦐", name: "Shrimp" },
  { emoji: "🥛", name: "Greek Yogurt" },
  { emoji: "🫘", name: "Lentils" },
];

const VEGGIES: Ingredient[] = [
  { emoji: "🥦", name: "Broccoli" },
  { emoji: "🥬", name: "Spinach" },
  { emoji: "🫑", name: "Peppers" },
  { emoji: "🥕", name: "Carrots" },
  { emoji: "🥒", name: "Zucchini" },
  { emoji: "🍅", name: "Tomatoes" },
  { emoji: "🍄", name: "Mushrooms" },
  { emoji: "🌿", name: "Asparagus" },
  { emoji: "🫛", name: "Green Beans" },
  { emoji: "🥗", name: "Kale" },
];

const CARBS: Ingredient[] = [
  { emoji: "🍚", name: "Rice" },
  { emoji: "🥔", name: "Potatoes" },
  { emoji: "🍝", name: "Pasta" },
  { emoji: "🍠", name: "Sweet Potato" },
  { emoji: "🌾", name: "Quinoa" },
  { emoji: "🥣", name: "Oats" },
  { emoji: "🍞", name: "Bread" },
  { emoji: "🧆", name: "Couscous" },
  { emoji: "🌿", name: "Bulgur" },
  { emoji: "🌽", name: "Corn" },
];

const FATS: Ingredient[] = [
  { emoji: "🧀", name: "Feta" },
  { emoji: "🥜", name: "Almonds" },
  { emoji: "🥑", name: "Avocado" },
  { emoji: "🫒", name: "Olive Oil" },
  { emoji: "🥜", name: "Peanut Butter" },
  { emoji: "🌰", name: "Walnuts" },
  { emoji: "🥥", name: "Coconut" },
  { emoji: "🧈", name: "Butter" },
  { emoji: "🌻", name: "Seeds" },
  { emoji: "🫕", name: "Tahini" },
];

interface CategoryGridProps {
  label: string;
  emoji: string;
  items: Ingredient[];
  selected: string[];
  onToggle: (name: string) => void;
}

function CategoryGrid({ label, emoji, items, selected, onToggle }: CategoryGridProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <span>{emoji}</span> {label}
      </p>
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => {
          const isSelected = selected.includes(item.name);
          return (
            <button
              key={item.name}
              onClick={() => onToggle(item.name)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all text-center",
                isSelected
                  ? "border-primary bg-primary/10 scale-[1.02]"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className={cn("text-[10px] font-bold leading-tight", isSelected ? "text-primary" : "text-muted-foreground")}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RecipeCard({ recipe, onClose, onSave, isSaving }: { recipe: Recipe; onClose: () => void; onSave: () => void; isSaving: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-primary/30 bg-card p-5 space-y-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-foreground">{recipe.title}</h3>
          <p className="text-xs font-bold text-muted-foreground mt-1">{recipe.description}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
          <Clock className="w-3.5 h-3.5" /> Prep {recipe.prep_time}
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
          <Clock className="w-3.5 h-3.5" /> Cook {recipe.cook_time}
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
          <Users className="w-3.5 h-3.5" /> {recipe.servings} servings
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Cal", value: recipe.nutrition.calories },
          { label: "Protein", value: `${recipe.nutrition.protein}g` },
          { label: "Carbs", value: `${recipe.nutrition.carbs}g` },
          { label: "Fat", value: `${recipe.nutrition.fat}g` },
        ].map((n) => (
          <div key={n.label} className="rounded-xl bg-primary/5 border border-primary/20 p-2 text-center">
            <p className="text-xs font-extrabold text-primary">{n.value}</p>
            <p className="text-[10px] font-bold text-muted-foreground">{n.label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">Ingredients</p>
        <ul className="space-y-1">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="text-sm font-bold text-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span> {ing}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">Steps</p>
        <ol className="space-y-2">
          {recipe.steps.map((step, i) => (
            <li key={i} className="text-sm font-bold text-foreground flex items-start gap-2">
              <span className="text-xs font-extrabold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {recipe.tips && (
        <div className="rounded-xl bg-accent/50 p-3">
          <p className="text-xs font-bold text-muted-foreground">💡 {recipe.tips}</p>
        </div>
      )}

      <Button onClick={onSave} disabled={isSaving} variant="secondary" className="w-full rounded-xl font-extrabold h-11">
        <Bookmark className="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save to My Meals"}
      </Button>
    </motion.div>
  );
}

function SavedComboCard({ combo, onRemove }: { combo: MealCombo; onRemove: () => void }) {
  const all = [...combo.proteins, ...combo.veggies, ...combo.carbs, ...(combo.fats || [])];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 border-border bg-card p-4"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          {combo.name ? (
            <p className="text-sm font-extrabold text-foreground truncate">{combo.name}</p>
          ) : (
            <p className="text-sm font-bold text-muted-foreground italic">Unnamed combo</p>
          )}
          <p className="text-xs font-bold text-muted-foreground mt-1 line-clamp-2">
            {all.join(" • ")}
          </p>
        </div>
        <button onClick={onRemove} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function MealBuilder() {
  const { combos, isLoading, save, remove } = useMealCombos();
  const { toast } = useToast();

  const [proteins, setProteins] = useState<string[]>([]);
  const [veggies, setVeggies] = useState<string[]>([]);
  const [carbs, setCarbs] = useState<string[]>([]);
  const [fats, setFats] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [generating, setGenerating] = useState(false);

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const hasSelection = proteins.length > 0 || veggies.length > 0 || carbs.length > 0 || fats.length > 0;

  const handleSave = () => {
    save.mutate(
      { name: name.trim(), proteins, veggies, carbs, fats },
      {
        onSuccess: () => {
          toast({ description: "✅ Combo saved!" });
          setProteins([]);
          setVeggies([]);
          setCarbs([]);
          setFats([]);
          setName("");
        },
        onError: (e) => toast({ description: `Error: ${e.message}`, variant: "destructive" }),
      }
    );
  };

  const handleGenerateRecipe = async () => {
    setGenerating(true);
    setRecipe(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipe", {
        body: { proteins, veggies, carbs, fats },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRecipe(data.recipe);
    } catch (e: any) {
      toast({ description: e.message || "Failed to generate recipe", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-4 bg-card rounded-2xl border-2 border-border">
        <p className="text-3xl mb-1">🍽️</p>
        <h2 className="text-xl font-display text-foreground">Build Your Plate</h2>
        <p className="text-xs font-bold text-muted-foreground mt-1">Pick your proteins, veggies, carbs & fats</p>
      </motion.div>

      <CategoryGrid label="Proteins" emoji="🥩" items={PROTEINS} selected={proteins} onToggle={(n) => toggle(proteins, setProteins, n)} />
      <CategoryGrid label="Veggies" emoji="🥦" items={VEGGIES} selected={veggies} onToggle={(n) => toggle(veggies, setVeggies, n)} />
      <CategoryGrid label="Carbs" emoji="🍚" items={CARBS} selected={carbs} onToggle={(n) => toggle(carbs, setCarbs, n)} />
      <CategoryGrid label="Fats" emoji="🥑" items={FATS} selected={fats} onToggle={(n) => toggle(fats, setFats, n)} />

      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3"
          >
            <p className="text-xs font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <ChefHat className="w-3.5 h-3.5" /> Your Plate
            </p>
            <p className="text-sm font-bold text-foreground">
              {[...proteins, ...veggies, ...carbs, ...fats].join(" + ")}
            </p>
            <Input
              placeholder="Name your combo (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={save.isPending} className="flex-1 rounded-xl font-extrabold h-11">
                <Plus className="w-4 h-4 mr-2" /> Save Combo
              </Button>
              <Button
                onClick={handleGenerateRecipe}
                disabled={generating}
                variant="secondary"
                className="flex-1 rounded-xl font-extrabold h-11"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? "Generating..." : "Generate Recipe"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recipe && (
          <RecipeCard recipe={recipe} onClose={() => setRecipe(null)} />
        )}
      </AnimatePresence>

      {combos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Saved Combos</p>
          {combos.map((c) => (
            <SavedComboCard key={c.id} combo={c} onRemove={() => remove.mutate(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
