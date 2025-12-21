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
    const {
      pastedText,
      recipeUrl,
      availableCategories = [],
    } = await req.json();
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

    if (!pastedText?.trim() && !recipeUrl?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No recipe text or URL provided",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let textToProcess = pastedText;

    // If URL provided, fetch and extract recipe
    if (recipeUrl) {
      console.log(`Fetching recipe from URL: ${recipeUrl}`);

      try {
        const urlResponse = await fetch(recipeUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; RecipeBot/1.0; +https://rezepte.app)",
          },
        });

        if (!urlResponse.ok) {
          throw new Error(`Failed to fetch URL: ${urlResponse.statusText}`);
        }

        const html = await urlResponse.text();

        // Try to extract Schema.org JSON-LD data first
        const jsonLdMatches = html.matchAll(
          /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis
        );

        for (const match of jsonLdMatches) {
          try {
            const jsonData = JSON.parse(match[1]);
            const recipeData = Array.isArray(jsonData)
              ? jsonData.find((item) => item["@type"] === "Recipe")
              : jsonData["@type"] === "Recipe"
                ? jsonData
                : jsonData["@graph"]?.find(
                    (item) => item["@type"] === "Recipe"
                  );

            if (recipeData) {
              console.log("Found Schema.org Recipe data");

              // Extract structured data
              const extractedRecipe = {
                title: recipeData.name || "",
                servings:
                  recipeData.recipeYield?.toString() ||
                  recipeData.servings?.toString() ||
                  "",
                ingredients: Array.isArray(recipeData.recipeIngredient)
                  ? recipeData.recipeIngredient
                  : [],
                instructions: Array.isArray(recipeData.recipeInstructions)
                  ? recipeData.recipeInstructions.map((inst) =>
                      typeof inst === "string"
                        ? inst
                        : inst.text || inst.name || ""
                    )
                  : typeof recipeData.recipeInstructions === "string"
                    ? [recipeData.recipeInstructions]
                    : [],
              };

              // Convert structured ingredients to text for AI processing
              textToProcess = `Title: ${extractedRecipe.title}\nServings: ${extractedRecipe.servings}\n\nIngredients:\n${extractedRecipe.ingredients.join("\n")}\n\nInstructions:\n${extractedRecipe.instructions.join("\n")}`;
              console.log(
                "Converted structured data to text for AI processing"
              );
              break;
            }
          } catch (e) {
            console.log("Error parsing JSON-LD, continuing...", e.message);
            continue;
          }
        }

        // If no structured data found, convert HTML to text
        if (!textToProcess) {
          console.log("No structured data found, extracting text from HTML");

          // Simple HTML to text conversion
          textToProcess = html
            .replace(/<script[^>]*>.*?<\/script>/gis, "")
            .replace(/<style[^>]*>.*?<\/style>/gis, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          // Limit text size to prevent excessive API usage
          const MAX_CHARS = 10000;
          if (textToProcess.length > MAX_CHARS) {
            console.log(
              `Text too long (${textToProcess.length} chars), truncating to ${MAX_CHARS}`
            );
            textToProcess = textToProcess.substring(0, MAX_CHARS);
          }
        }
      } catch (error) {
        console.error("Error fetching URL:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to fetch recipe from URL: ${error.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log(`Processing recipe text of length: ${textToProcess.length}`);
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

${textToProcess.trim()}

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
