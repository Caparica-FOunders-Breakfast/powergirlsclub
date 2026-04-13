import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMealCombos, type MealCombo } from "@/hooks/useMealCombos";

interface Ingredient {
  emoji: string;
  name: string;
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

function SavedComboCard({ combo, onRemove }: { combo: MealCombo; onRemove: () => void }) {
  const all = [...combo.proteins, ...combo.veggies, ...combo.carbs];
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
  const [name, setName] = useState("");

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const hasSelection = proteins.length > 0 || veggies.length > 0 || carbs.length > 0;

  const handleSave = () => {
    save.mutate(
      { name: name.trim(), proteins, veggies, carbs },
      {
        onSuccess: () => {
          toast({ description: "✅ Combo saved!" });
          setProteins([]);
          setVeggies([]);
          setCarbs([]);
          setName("");
        },
        onError: (e) => toast({ description: `Error: ${e.message}`, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-5">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-4 bg-card rounded-2xl border-2 border-border">
        <p className="text-3xl mb-1">🍽️</p>
        <h2 className="text-xl font-display text-foreground">Build Your Plate</h2>
        <p className="text-xs font-bold text-muted-foreground mt-1">Pick your proteins, veggies & carbs</p>
      </motion.div>

      <CategoryGrid label="Proteins" emoji="🥩" items={PROTEINS} selected={proteins} onToggle={(n) => toggle(proteins, setProteins, n)} />
      <CategoryGrid label="Veggies" emoji="🥦" items={VEGGIES} selected={veggies} onToggle={(n) => toggle(veggies, setVeggies, n)} />
      <CategoryGrid label="Carbs" emoji="🍚" items={CARBS} selected={carbs} onToggle={(n) => toggle(carbs, setCarbs, n)} />

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
              {[...proteins, ...veggies, ...carbs].join(" + ")}
            </p>
            <Input
              placeholder="Name your combo (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl text-sm"
            />
            <Button onClick={handleSave} disabled={save.isPending} className="w-full rounded-xl font-extrabold h-11">
              <Plus className="w-4 h-4 mr-2" /> Save Combo
            </Button>
          </motion.div>
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
