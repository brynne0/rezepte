import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
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
    let sourceUrl = null;

    // If URL provided, fetch and extract recipe
    if (recipeUrl) {
      try {
        // Security: Validate and sanitize URL
        let validatedUrl: URL;
        try {
          // Add protocol if missing (for www. URLs)
          const urlToValidate = recipeUrl.trim().startsWith("www.")
            ? `https://${recipeUrl.trim()}`
            : recipeUrl.trim();
          validatedUrl = new URL(urlToValidate);
        } catch {
          throw new Error("Invalid URL format");
        }

        // Security: Block private/internal network addresses (SSRF protection)
        const hostname = validatedUrl.hostname.toLowerCase();
        const blockedPatterns = [
          /^localhost$/i,
          /^127\./,
          /^10\./,
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
          /^192\.168\./,
          /^169\.254\./, // Link-local
          /^0\.0\.0\.0$/,
          /^\[?::1\]?$/, // IPv6 localhost
          /^\[?fe80:/i, // IPv6 link-local
        ];

        if (blockedPatterns.some((pattern) => pattern.test(hostname))) {
          throw new Error("Access to private/internal URLs is not allowed");
        }

        // Security: Only allow http/https protocols
        if (!["http:", "https:"].includes(validatedUrl.protocol)) {
          throw new Error("Only HTTP and HTTPS protocols are allowed");
        }

        // Store the validated URL for the source field
        sourceUrl = validatedUrl.toString();

        const urlResponse = await fetch(sourceUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; RecipeBot/1.0; +https://rezepte.app)",
          },
          // Security: Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000), // 10 second timeout
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
              break;
            }
          } catch (e) {
            continue;
          }
        }

        // If no structured data found, convert HTML to text
        if (!textToProcess) {
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
            textToProcess = textToProcess.substring(0, MAX_CHARS);
          }
        }
      } catch (error) {
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

    const promptText = `Extract recipe data and return valid JSON only.

${textToProcess.trim()}

Format (use ingredientSections ONLY if original has explicit sections like "For the dough:"):
{"title":"","servings":"","categories":[],"ingredients":[{"quantity":"","unit":"","name":"","notes":""}],"instructions":[]}

OR with sections:
{"title":"","servings":"","categories":[],"ingredientSections":[{"subheading":"","ingredients":[]}],"instructions":[]}

Rules:
- servings: number as string ("4", "6-8") or "" if none
- quantity: number/fraction ("2", "1/2", "1.5")
- unit: ONLY "", "ml", "l", "g", "kg", "tsp", "tbsp", "cup/s", "can/s", "piece/s", "pinch/es"
- name: ingredient only (e.g., "flour")
- notes: prep details ("chopped", "diced") or "". Do not wrap in brackets.
- categories: ONLY from: ${availableCategories.length > 0 ? availableCategories.join(", ") : []}`;

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
                  text: promptText,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      // Pass through rate limit errors (429) to frontend
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `All AI models failed. Last error: ${lastError || "Unknown error"}. Please try again later.`,
        }),
        {
          status: 503,
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

    // Add source URL if it was provided
    if (sourceUrl) {
      recipe.source = sourceUrl;
    }

    return new Response(JSON.stringify({ success: true, recipe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
