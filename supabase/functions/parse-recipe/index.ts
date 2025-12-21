import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("SUPABASE EDGE FUNCTION - Recipe Parser");

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { pastedText, availableCategories = [] } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!pastedText?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "No recipe text provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Parsing recipe text of length: ${pastedText.length}`);
    console.log(`Available categories: ${availableCategories.join(", ")}`);

    // Use gemini-2.5-flash (the stable model your API key has access to)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Parse this recipe text and return ONLY a JSON object (no markdown, no explanation):

${pastedText.trim()}

JSON format for recipes WITHOUT ingredient sections:
{
  "title": "recipe name",
  "servings": "4",
  "categories": ["category1", "category2"],
  "ingredients": [{"quantity": "amount", "unit": "unit_value", "name": "ingredient name", "notes": "prep notes"}],
  "instructions": ["step 1", "step 2"]
}

JSON format for recipes WITH ingredient sections (only use if original text has clear sections like "For the dough:", "For the filling:", etc.):
{
  "title": "recipe name",
  "servings": "4",
  "categories": ["category1", "category2"],
  "ingredientSections": [
    {
      "subheading": "section name",
      "ingredients": [{"quantity": "amount", "unit": "unit_value", "name": "ingredient name", "notes": "prep notes"}]
    }
  ],
  "instructions": ["step 1", "step 2"]
}

Important rules:
- servings: Extract the actual number of servings as a string (e.g., "4", "6-8"). If no servings mentioned, use "" (empty string). DO NOT use the word "number".
- Extract quantity as a number or fraction string (e.g., "2", "1/2", "1.5")
- Extract unit using ONLY these values: "", "ml", "l", "g", "kg", "tsp", "tbsp", "cup/s", "can/s", "piece/s", "pinch/es"
- If no specific unit, use "" (empty string)
- name is the ingredient name only (e.g., "flour", "chicken breast")
- notes are for preparation details like "chopped", "diced", "at room temperature" (can be empty string if not applicable)
- categories: ONLY use categories from this list: ${availableCategories.length > 0 ? availableCategories.join(", ") : "breakfast, lunch, dinner, dessert, snack"}. Select 1-3 most relevant categories. Use exact category names from the list.
- Only use ingredientSections if the original recipe explicitly has sections (like "For the dough:", "For the topping:", etc.). Otherwise use flat ingredients array.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "AI service error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean markdown formatting
    text = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const recipe = JSON.parse(text);
    console.log("Successfully parsed recipe:", recipe.title);

    return new Response(JSON.stringify({ success: true, recipe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
