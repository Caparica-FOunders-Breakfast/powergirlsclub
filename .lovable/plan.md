

## Meal Builder — "Build Your Plate" Tab

Add a third tab to the Meals page where users can build custom meal combos by picking multiple items from categorized ingredient cards (Veggies, Proteins, Carbs).

### How it works

Users see three collapsible category cards — **Proteins**, **Veggies**, **Carbs** — each showing a grid of tappable items with emoji + name. Tapping selects/deselects. Selected items form a "plate" shown at the bottom. Users can name and save their combos.

```text
┌─────────────────────────────────┐
│ Power Routine │ 7-Day Plan │ Builder │  ← new tab
├─────────────────────────────────┤
│                                 │
│  🥩 PROTEINS                   │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │🐔    │ │🥩    │ │🐟    │   │
│  │Chicken│ │ Beef │ │Salmon│   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  🥦 VEGGIES                    │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │🥦    │ │🥕    │ │🫑    │   │
│  │Broccoli│ │Carrot│ │Pepper│  │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  🍚 CARBS                      │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │🍚    │ │🥔    │ │🍝    │   │
│  │ Rice │ │Potato│ │ Pasta│   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  ─── Your Plate ───            │
│  Chicken + Broccoli + Rice     │
│  [ Save Combo ]                │
│                                 │
└─────────────────────────────────┘
```

### Database

1. **New table `meal_combos`** — stores user-created combos:
   - `id`, `user_id`, `name` (optional label), `proteins` (text[]), `veggies` (text[]), `carbs` (text[]), `created_at`, `updated_at`
   - RLS: users can CRUD their own combos

### Implementation steps

1. **Migration** — Create `meal_combos` table with RLS policies
2. **Hook `useMealCombos`** — CRUD operations for saved combos
3. **Component `MealBuilder.tsx`** — The builder UI with three category grids and a "Your Plate" summary section with save button
4. **Predefined ingredient lists** — Curated lists of common proteins, veggies, and carbs with emojis (user can also type custom items)
5. **Update `MealPlan.tsx`** — Add "Builder" as a third top-level tab

### Ingredient categories (starting set)

- **Proteins**: Chicken, Beef, Salmon, Tuna, Eggs, Tofu, Turkey, Shrimp, Greek Yogurt, Lentils
- **Veggies**: Broccoli, Spinach, Peppers, Carrots, Zucchini, Tomatoes, Mushrooms, Asparagus, Green Beans, Kale
- **Carbs**: Rice, Potatoes, Pasta, Sweet Potato, Quinoa, Oats, Bread, Couscous, Bulgur, Corn

