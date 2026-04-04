import { useState } from "react";
import { motion } from "framer-motion";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { MealPreferences } from "@/hooks/useMealPreferences";

const dietaryOptions = ["omnivore", "pescatarian", "vegetarian", "vegan"];
const cookingOptions = [
  { value: "quick", label: "Quick (< 10 min)", emoji: "⚡" },
  { value: "moderate", label: "Moderate (< 25 min)", emoji: "🍳" },
];
const budgetOptions = [
  { value: "low", label: "Low", emoji: "💰" },
  { value: "medium", label: "Medium", emoji: "💰💰" },
  { value: "high", label: "High", emoji: "💰💰💰" },
];

interface Props {
  preferences: MealPreferences;
  onSave: (prefs: MealPreferences) => void;
  onClose: () => void;
  isSaving: boolean;
}

export function PreferencesForm({ preferences, onSave, onClose, isSaving }: Props) {
  const [form, setForm] = useState<MealPreferences>({ ...preferences });
  const [allergyInput, setAllergyInput] = useState("");
  const [dislikedInput, setDislikedInput] = useState("");
  const [favoriteInput, setFavoriteInput] = useState("");
  const [atHomeInput, setAtHomeInput] = useState("");

  const addTag = (field: "allergies" | "disliked_foods" | "favorite_foods" | "ingredients_at_home", value: string) => {
    if (!value.trim()) return;
    setForm((f) => ({ ...f, [field]: [...f[field], value.trim()] }));
  };

  const removeTag = (field: "allergies" | "disliked_foods" | "favorite_foods" | "ingredients_at_home", idx: number) => {
    setForm((f) => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  };

  const TagInput = ({
    label,
    emoji,
    field,
    inputValue,
    setInputValue,
    placeholder,
  }: {
    label: string;
    emoji: string;
    field: "allergies" | "disliked_foods" | "favorite_foods" | "ingredients_at_home";
    inputValue: string;
    setInputValue: (v: string) => void;
    placeholder: string;
  }) => (
    <div className="space-y-2">
      <Label className="text-xs font-extrabold text-foreground">
        {emoji} {label}
      </Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(field, inputValue);
              setInputValue("");
            }
          }}
          placeholder={placeholder}
          className="text-sm h-9"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0"
          onClick={() => {
            addTag(field, inputValue);
            setInputValue("");
          }}
        >
          Add
        </Button>
      </div>
      {form[field].length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {form[field].map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold"
            >
              {item}
              <button onClick={() => removeTag(field, idx)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 bg-card rounded-2xl border-2 border-border p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-foreground">⚙️ Your Preferences</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Protein Target */}
      <div className="space-y-2">
        <Label className="text-xs font-extrabold text-foreground">🎯 Daily Protein Target (g)</Label>
        <Input
          type="number"
          value={form.daily_protein_target}
          onChange={(e) => setForm((f) => ({ ...f, daily_protein_target: parseInt(e.target.value) || 0 }))}
          className="text-sm h-9 w-28"
        />
      </div>

      {/* Dietary Preference */}
      <div className="space-y-2">
        <Label className="text-xs font-extrabold text-foreground">🥑 Dietary Preference</Label>
        <div className="flex flex-wrap gap-2">
          {dietaryOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setForm((f) => ({ ...f, dietary_preference: opt }))}
              className={cn(
                "px-3 py-1.5 rounded-xl border-2 text-xs font-bold capitalize transition-colors",
                form.dietary_preference === opt
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Cooking Time */}
      <div className="space-y-2">
        <Label className="text-xs font-extrabold text-foreground">⏱️ Cooking Time</Label>
        <div className="flex gap-2">
          {cookingOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setForm((f) => ({ ...f, cooking_time: opt.value }))}
              className={cn(
                "flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-colors",
                form.cooking_time === opt.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <Label className="text-xs font-extrabold text-foreground">💸 Budget</Label>
        <div className="flex gap-2">
          {budgetOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setForm((f) => ({ ...f, budget: opt.value }))}
              className={cn(
                "flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-colors",
                form.budget === opt.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Number of People */}
      <div className="space-y-2">
        <Label className="text-xs font-extrabold text-foreground">👥 Number of People</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={form.num_people}
          onChange={(e) => setForm((f) => ({ ...f, num_people: parseInt(e.target.value) || 1 }))}
          className="text-sm h-9 w-20"
        />
      </div>

      {/* Tag Inputs */}
      <TagInput
        label="Allergies / Exclusions"
        emoji="🚫"
        field="allergies"
        inputValue={allergyInput}
        setInputValue={setAllergyInput}
        placeholder="e.g. pork, shellfish..."
      />
      <TagInput
        label="Disliked Foods"
        emoji="👎"
        field="disliked_foods"
        inputValue={dislikedInput}
        setInputValue={setDislikedInput}
        placeholder="e.g. tofu, mushrooms..."
      />
      <TagInput
        label="Favorite Foods"
        emoji="❤️"
        field="favorite_foods"
        inputValue={favoriteInput}
        setInputValue={setFavoriteInput}
        placeholder="e.g. chicken, eggs..."
      />
      <TagInput
        label="Ingredients at Home"
        emoji="🏠"
        field="ingredients_at_home"
        inputValue={atHomeInput}
        setInputValue={setAtHomeInput}
        placeholder="e.g. rice, olive oil..."
      />

      {/* Save */}
      <Button
        onClick={() => onSave(form)}
        disabled={isSaving}
        className="w-full rounded-xl font-extrabold"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save Preferences"}
      </Button>
    </motion.div>
  );
}
