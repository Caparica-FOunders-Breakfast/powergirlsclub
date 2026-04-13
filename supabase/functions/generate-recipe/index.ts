import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { proteins, veggies, carbs, fats } = await req.json();

    const allIngredients = [
      ...(proteins || []),
      ...(veggies || []),
      ...(carbs || []),
      ...(fats || []),
    ];

    if (allIngredients.length === 0) {
      return new Response(JSON.stringify({ error: "No ingredients selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a professional chef and nutritionist. Given a list of ingredients, create a delicious, healthy recipe. Return a JSON object using this exact structure:
{
  "title": "Recipe Name",
  "description": "One sentence description",
  "prep_time": "e.g. 15 min",
  "cook_time": "e.g. 25 min",
  "servings": 2,
  "ingredients": ["200g chicken breast", "1 cup broccoli florets", ...],
  "steps": ["Step 1 description", "Step 2 description", ...],
  "nutrition": { "calories": 450, "protein": 35, "carbs": 40, "fat": 15 },
  "tips": "Optional cooking tip"
}
Use metric measurements. Keep the recipe practical and achievable in under 45 minutes.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a recipe using these ingredients: ${allIngredients.join(", ")}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_recipe",
              description: "Return a structured recipe",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  prep_time: { type: "string" },
                  cook_time: { type: "string" },
                  servings: { type: "number" },
                  ingredients: { type: "array", items: { type: "string" } },
                  steps: { type: "array", items: { type: "string" } },
                  nutrition: {
                    type: "object",
                    properties: {
                      calories: { type: "number" },
                      protein: { type: "number" },
                      carbs: { type: "number" },
                      fat: { type: "number" },
                    },
                    required: ["calories", "protein", "carbs", "fat"],
                  },
                  tips: { type: "string" },
                },
                required: ["title", "description", "prep_time", "cook_time", "servings", "ingredients", "steps", "nutrition"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_recipe" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate recipe" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No recipe generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipe = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ recipe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-recipe error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
