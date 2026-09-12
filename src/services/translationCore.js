import supabase from "../lib/supabase";
import { toTitleCase } from "../utils/stringUtils";

// DeepL translation function using Supabase Edge Function.
// `onFailure`, if given, is called (not thrown) when translation couldn't
// be performed (e.g. offline) - the function still resolves with the
// original text either way, so callers that don't care can ignore it.
export const translateText = async (
  text,
  targetLanguage,
  context = null,
  sourceLang = "auto",
  onFailure = null
) => {
  if (!text || text.trim() === "") return text;

  try {
    const requestBody = {
      text: text,
      target_lang: targetLanguage,
      source_lang: sourceLang,
    };

    // Add context if provided to help with disambiguation (e.g., food vs. other meanings)
    if (context) {
      requestBody.context = context;
    }

    const { data, error } = await supabase.functions.invoke("translate", {
      body: requestBody,
    });

    if (error) {
      throw new Error(`Translation error: ${error.message}`);
    }

    let result = data.translatedText || text;

    // Post-process translated text: replace hyphens with spaces for better readability
    // This handles DeepL's compound word formatting in German translations
    result = result.replace(/-/g, " ");

    return result;
  } catch (error) {
    console.error("Translation failed:", error);
    onFailure?.();
    return text; // Return original text if translation fails
  }
};

// Translate an array of texts in parallel
export const translateTexts = async (
  texts,
  targetLanguage,
  sourceLang = "auto",
  onFailure = null
) => {
  const nonEmptyTexts = texts.filter((text) => text && text.trim() !== "");
  const promises = nonEmptyTexts.map((text) =>
    translateText(text, targetLanguage, null, sourceLang, onFailure)
  );
  const translatedResults = await Promise.all(promises);

  // Map back to original array structure, preserving empty strings
  let resultIndex = 0;
  return texts.map((text) => {
    if (!text || text.trim() === "") return text;
    return translatedResults[resultIndex++];
  });
};

// Detect whether a time value is free text needing translation, as opposed
// to a plain number or range (e.g. "40-50") that should pass through as-is
export const isTranslatable = (value) => {
  if (!value) return false;
  const timeStr = String(value).trim();
  const numericValue = Number(timeStr);
  return isNaN(numericValue) && !/^\d+\s*-\s*\d+$/.test(timeStr);
};

// German nouns are always capitalised; other languages use lowercase
export const capitalizeForLanguage = (text, targetLanguage) => {
  if (!text) return text;
  return targetLanguage === "de" ? toTitleCase(text) : text.toLowerCase();
};

// Fetch a jsonb translations column, replace the entry for `language` with
// whatever `updateLanguageValue(existingValueForLanguage)` returns, and
// write it back. Shared by every "save translation" call site - the
// callback lets each caller decide whether to merge onto the existing
// cached value (e.g. updating just a title) or replace it outright.
export const mergeTranslatedField = async (
  table,
  id,
  column,
  language,
  updateLanguageValue
) => {
  try {
    const { data: current, error: fetchError } = await supabase
      .from(table)
      .select(column)
      .eq("id", id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const existing = current[column] || {};
    const updated = {
      ...existing,
      [language]: updateLanguageValue(existing[language]),
    };

    const { error: updateError } = await supabase
      .from(table)
      .update({ [column]: updated })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error(`Failed to store translation for ${table}.${column}:`, error);
    // Don't throw error - translation worked, just storage failed
  }
};
