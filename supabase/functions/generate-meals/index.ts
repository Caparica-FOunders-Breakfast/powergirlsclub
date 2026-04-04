import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences, shuffleMealType } = await req.json();

    const proteinTarget = preferences?.daily_protein_target || 120;
    const dietary = preferences?.dietary_preference || "omnivore";
    const allergies = preferences?.allergies?.join(", ") || "none";
    const disliked = preferences?.disliked_foods?.join(", ") || "none";
    const favorites = preferences?.favorite_foods?.join(", ") || "none specified";
    const cookTime = preferences?.cooking_time || "quick";
    const budget = preferences?.budget || "medium";
    const numPeople = preferences?.num_people || 1;
    const atHome = preferences?.ingredients_at_home?.join(", ") || "none specified";

    const shuffleInstruction = shuffleMealType
      ? `IMPORTANT: Generate completely NEW and DIFFERENT variations for the "${shuffleMealType}" meal type. Be creative and different from common suggestions.`
      : "";

    const prompt = `You are a sports nutritionist creating a simple, repeatable high-protein meal system.

${shuffleInstruction}

USER PREFERENCES:
- Daily protein target: ${proteinTarget}g
- Diet: ${dietary}
- Allergies/exclusions: ${allergies}
- Disliked foods: ${disliked}
- Favorite foods: ${favorites}
- Cooking time: ${cookTime} (quick = under 10min, moderate = under 25min)
- Budget: ${budget}
- Servings: ${numPeople} person(s)
- Ingredients at home: ${atHome}

GENERATE a Power Routine with these EXACT meal types:

1. BREAKFAST (Protein Smoothie): Always includes protein powder + fruit. Target: 25-35g protein. Quick.
2. LUNCH (Power Bowl): Protein + carbs + large veggies + healthy fat. Target: 30-40g protein.
3. DINNER (Simple Protein + Veggies): Protein + vegetables, optional carbs. Target: 30-40g protein.
4. SNACK (only if needed to hit target): High-protein snack. Target: 15-25g protein.

For EACH meal type, generate exactly 3 variations.

TONE: empowering, simple, practical. No diet culture language.

Return ONLY valid JSON with this exact structure:
{
  "meals": {
    "breakfast": [
      {
        "title": "string",
        "ingredients": [{"item": "string", "quantity": "string"}],
        "steps": ["string"],
        "protein": number,
        "prep_time": number
      }
    ],
    "lunch": [same structure, 3 items],
    "dinner": [same structure, 3 items],
    "snack": [same structure, 3 items]
  },
  "daily_protein_target": ${proteinTarget},
  "daily_protein_estimate": number,
  "protein_tips": ["string", "string"],
  "grocery_list": {
    "protein": ["item — quantity (e.g. 'Chicken breast — 1.5 kg')"],
    "vegetables": ["item — quantity"],
    "fruit": ["item — quantity"],
    "dairy": ["item — quantity"],
    "grains": ["item — quantity"],
    "pantry": ["item — quantity"]
  }
}

IMPORTANT: Every grocery list item MUST include the amount/quantity needed for the full week (7 days, ${numPeople} person(s)). Format each item as "Item — quantity" (e.g. "Chicken breast — 1.5 kg", "Spinach — 400g", "Olive oil — 1 bottle").`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a sports nutritionist. Return ONLY valid JSON, no markdown, no code blocks." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    const mealPlan = JSON.parse(content);

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating meals:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
