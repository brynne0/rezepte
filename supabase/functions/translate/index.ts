import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  console.log("SUPABASE EDGE FUNCTION - Recipe Translation");

  // Handle CORS preflight - this is crucial!
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { text, target_lang, source_lang } = await req.json();
    const DEEPL_API_KEY = Deno.env.get("DEEPL_API_KEY");

    console.log("Input text:", text);
    console.log("From:", source_lang, "To:", target_lang);
    console.log("API Key exists:", !!DEEPL_API_KEY);

    // Return original text if no API key (don't crash)
    if (!DEEPL_API_KEY) {
      console.warn("No DEEPL_API_KEY found, returning original text");
      return new Response(
        JSON.stringify({
          translatedText: text || "",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Return original text if empty
    if (!text || typeof text !== "string" || text.trim() === "") {
      return new Response(
        JSON.stringify({
          translatedText: text || "",
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!target_lang) {
      return new Response(
        JSON.stringify({
          error: "target_lang is required",
          translatedText: text,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const trimmedText = text.trim();
    console.log(`Translating: "${trimmedText}"`);

    try {
      const requestBody = new URLSearchParams({
        text: trimmedText,
        target_lang: target_lang.toUpperCase(),
      });

      // Add source language if provided and not 'auto'
      if (source_lang && source_lang !== "auto") {
        requestBody.append("source_lang", source_lang.toUpperCase());
      }

      const response = await fetch("https://api-free.deepl.com/v2/translate", {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: requestBody,
      });

      if (response.ok) {
        const data = await response.json();
        const translatedText = data.translations[0].text.trim();

        console.log(`Success: "${trimmedText}" -> "${translatedText}"`);

        return new Response(
          JSON.stringify({
            translatedText: translatedText,
            detectedSourceLanguage:
              data.translations[0].detected_source_language,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        const errorData = await response.text();
        console.error(`DeepL API error: ${response.status} - ${errorData}`);

        return new Response(
          JSON.stringify({
            translatedText: trimmedText, // Fallback to original
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    } catch (translationError) {
      console.error(`Translation exception: ${translationError.message}`);

      return new Response(
        JSON.stringify({
          translatedText: trimmedText, // Fallback to original
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Edge function error:", error.message);

    return new Response(
      JSON.stringify({
        translatedText: "", // Safe fallback
        error: "Function error",
      }),
      {
        status: 200, // Don't return 500 to avoid CORS issues
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
