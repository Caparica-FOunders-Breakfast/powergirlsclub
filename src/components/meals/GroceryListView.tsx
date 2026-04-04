import { motion } from "framer-motion";

interface Props {
  groceryList: Record<string, string[]>;
}

const categoryEmojis: Record<string, string> = {
  protein: "🥩",
  vegetables: "🥬",
  fruit: "🍌",
  dairy: "🧀",
  grains: "🌾",
  pantry: "🫙",
};

export function GroceryListView({ groceryList }: Props) {
  const categories = Object.entries(groceryList).filter(([, items]) => items.length > 0);

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm font-bold">
        Generate a meal plan first to see your grocery list.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {categories.map(([category, items]) => (
        <div key={category} className="rounded-2xl border-2 border-border bg-card p-4">
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2 mb-3 capitalize">
            <span>{categoryEmojis[category] || "📦"}</span>
            {category}
          </h3>
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </motion.div>
  );
}
