export interface Meal {
  name: string;
  protein: number;
  cookTime: number;
  ingredients: string[];
}

export interface DayPlan {
  day: string;
  emoji: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snack: Meal;
  totalProtein: number;
}

export interface GroceryCategory {
  category: string;
  emoji: string;
  items: string[];
}

export const weeklyMealPlan: DayPlan[] = [
  {
    day: "Monday",
    emoji: "💪",
    breakfast: { name: "Scrambled eggs with spinach & feta", protein: 28, cookTime: 10, ingredients: ["4 eggs", "spinach", "feta cheese"] },
    lunch: { name: "Chicken & black bean bowl with peppers", protein: 38, cookTime: 20, ingredients: ["chicken breast", "black beans", "bell pepper", "rice", "lime"] },
    dinner: { name: "Salmon with roasted broccoli & sweet potato", protein: 35, cookTime: 25, ingredients: ["salmon fillet", "broccoli", "sweet potato", "olive oil"] },
    snack: { name: "Greek yogurt with almonds", protein: 20, cookTime: 2, ingredients: ["Greek yogurt", "almonds"] },
    totalProtein: 121,
  },
  {
    day: "Tuesday",
    emoji: "🔥",
    breakfast: { name: "Greek yogurt parfait with granola & berries", protein: 24, cookTime: 5, ingredients: ["Greek yogurt", "granola", "mixed berries"] },
    lunch: { name: "Tofu stir-fry with vegetables & edamame", protein: 32, cookTime: 20, ingredients: ["firm tofu", "edamame", "zucchini", "carrot", "soy sauce", "sesame oil"] },
    dinner: { name: "Chicken thigh with green beans & quinoa", protein: 40, cookTime: 25, ingredients: ["chicken thigh", "green beans", "quinoa", "garlic"] },
    snack: { name: "Hard-boiled eggs with cucumber", protein: 24, cookTime: 12, ingredients: ["3 eggs", "cucumber", "salt"] },
    totalProtein: 120,
  },
  {
    day: "Wednesday",
    emoji: "🥦",
    breakfast: { name: "Egg & vegetable omelette", protein: 26, cookTime: 10, ingredients: ["3 eggs", "mushrooms", "tomato", "cheese"] },
    lunch: { name: "Lentil soup with kale & crusty bread", protein: 28, cookTime: 25, ingredients: ["red lentils", "kale", "onion", "carrot", "cumin", "bread"] },
    dinner: { name: "Salmon with asparagus & brown rice", protein: 38, cookTime: 25, ingredients: ["salmon fillet", "asparagus", "brown rice", "lemon"] },
    snack: { name: "Cottage cheese with cherry tomatoes", protein: 28, cookTime: 2, ingredients: ["cottage cheese", "cherry tomatoes"] },
    totalProtein: 120,
  },
  {
    day: "Thursday",
    emoji: "⚡",
    breakfast: { name: "Scrambled tofu with peppers & toast", protein: 22, cookTime: 15, ingredients: ["firm tofu", "bell pepper", "turmeric", "whole wheat toast"] },
    lunch: { name: "Chicken salad wrap with hummus", protein: 36, cookTime: 10, ingredients: ["chicken breast", "whole wheat wrap", "hummus", "lettuce", "tomato", "cucumber"] },
    dinner: { name: "Chickpea & vegetable curry with rice", protein: 30, cookTime: 25, ingredients: ["chickpeas", "spinach", "coconut milk", "curry paste", "rice"] },
    snack: { name: "Greek yogurt with walnuts & honey", protein: 22, cookTime: 2, ingredients: ["Greek yogurt", "walnuts", "honey"] },
    totalProtein: 110,
  },
  {
    day: "Friday",
    emoji: "🎉",
    breakfast: { name: "Egg & cheese breakfast muffins", protein: 30, cookTime: 20, ingredients: ["4 eggs", "cheese", "spinach", "muffin tin"] },
    lunch: { name: "Tuna & white bean salad", protein: 38, cookTime: 10, ingredients: ["canned tuna", "white beans", "red onion", "olive oil", "arugula", "lemon"] },
    dinner: { name: "Chicken breast with roasted cauliflower & tahini", protein: 40, cookTime: 25, ingredients: ["chicken breast", "cauliflower", "tahini", "garlic"] },
    snack: { name: "Edamame with sea salt", protein: 17, cookTime: 5, ingredients: ["edamame", "sea salt"] },
    totalProtein: 125,
  },
  {
    day: "Saturday",
    emoji: "🌿",
    breakfast: { name: "Greek yogurt bowl with seeds & banana", protein: 24, cookTime: 5, ingredients: ["Greek yogurt", "chia seeds", "pumpkin seeds", "banana"] },
    lunch: { name: "Salmon rice bowl with avocado & cucumber", protein: 36, cookTime: 20, ingredients: ["salmon fillet", "sushi rice", "avocado", "cucumber", "soy sauce"] },
    dinner: { name: "Turkey meatballs with zucchini noodles", protein: 38, cookTime: 25, ingredients: ["ground turkey", "zucchini", "marinara sauce", "parmesan"] },
    snack: { name: "Protein smoothie with berries", protein: 25, cookTime: 5, ingredients: ["protein powder", "mixed berries", "milk", "banana"] },
    totalProtein: 123,
  },
  {
    day: "Sunday",
    emoji: "🧘",
    breakfast: { name: "Veggie egg scramble with avocado toast", protein: 28, cookTime: 15, ingredients: ["3 eggs", "avocado", "tomato", "whole wheat bread", "spinach"] },
    lunch: { name: "Black bean & sweet potato tacos", protein: 26, cookTime: 20, ingredients: ["black beans", "sweet potato", "corn tortillas", "salsa", "Greek yogurt"] },
    dinner: { name: "Grilled chicken with Mediterranean salad", protein: 42, cookTime: 25, ingredients: ["chicken breast", "cucumber", "tomato", "olives", "feta", "quinoa"] },
    snack: { name: "Hummus with carrots & celery", protein: 10, cookTime: 2, ingredients: ["hummus", "carrots", "celery"] },
    totalProtein: 106,
  },
];

export const groceryList: GroceryCategory[] = [
  {
    category: "Proteins",
    emoji: "🥩",
    items: [
      "Chicken breast × 4",
      "Chicken thighs × 2",
      "Salmon fillets × 3",
      "Ground turkey 500g",
      "Firm tofu × 2 blocks",
      "Eggs × 24",
      "Canned tuna × 1",
      "Protein powder (optional)",
    ],
  },
  {
    category: "Dairy",
    emoji: "🧀",
    items: [
      "Greek yogurt 1kg",
      "Cottage cheese 500g",
      "Feta cheese 200g",
      "Parmesan 100g",
      "Cheddar/cheese 150g",
      "Milk 1L",
    ],
  },
  {
    category: "Legumes & Grains",
    emoji: "🫘",
    items: [
      "Black beans × 2 cans",
      "Chickpeas × 1 can",
      "White beans × 1 can",
      "Red lentils 250g",
      "Edamame 400g (frozen)",
      "Rice / brown rice 500g",
      "Quinoa 300g",
      "Whole wheat wraps × 4",
      "Whole wheat bread",
      "Corn tortillas × 6",
      "Granola 250g",
    ],
  },
  {
    category: "Vegetables",
    emoji: "🥬",
    items: [
      "Spinach 300g",
      "Kale 200g",
      "Broccoli × 2 heads",
      "Cauliflower × 1 head",
      "Zucchini × 3",
      "Bell peppers × 4",
      "Asparagus 1 bunch",
      "Green beans 300g",
      "Sweet potatoes × 3",
      "Carrots × 4",
      "Cucumber × 3",
      "Tomatoes × 6",
      "Cherry tomatoes 250g",
      "Mushrooms 200g",
      "Arugula 100g",
      "Lettuce 1 head",
      "Celery 1 bunch",
      "Red onion × 2",
      "Onion × 2",
      "Garlic × 1 bulb",
    ],
  },
  {
    category: "Fruits",
    emoji: "🍌",
    items: [
      "Bananas × 3",
      "Mixed berries 400g (frozen ok)",
      "Lemons × 3",
      "Limes × 2",
      "Avocados × 3",
    ],
  },
  {
    category: "Nuts & Seeds",
    emoji: "🥜",
    items: [
      "Almonds 100g",
      "Walnuts 100g",
      "Chia seeds 50g",
      "Pumpkin seeds 50g",
    ],
  },
  {
    category: "Pantry",
    emoji: "🫙",
    items: [
      "Olive oil",
      "Sesame oil",
      "Soy sauce",
      "Tahini",
      "Hummus 400g",
      "Marinara sauce 400g",
      "Coconut milk × 1 can",
      "Curry paste",
      "Cumin",
      "Turmeric",
      "Salsa",
      "Honey",
      "Salt & pepper",
      "Sea salt",
    ],
  },
];
