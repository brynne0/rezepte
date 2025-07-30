import supabase from "../lib/supabase";
import i18n from "../lib/i18n";

// Translation service for recipes using DeepL edge function

// Fields that need translation in recipes
const TRANSLATABLE_RECIPE_FIELDS = ["title", "instructions", "notes", "source"];
const TRANSLATABLE_INGREDIENT_FIELDS = ["name", "notes"];

// Call the DeepL edge function to translate text
const translateText = async (text, targetLanguage, sourceLanguage = null) => {
  if (!text || text.trim() === "") {
    return text;
  }

  try {
    const { data, error } = await supabase.functions.invoke("translate", {
      body: {
        text: text.trim(),
        target_lang: targetLanguage.toUpperCase(),
        source_lang: sourceLanguage ? sourceLanguage.toUpperCase() : null,
      },
    });

    if (error) {
      console.error("Translation error:", error);
      return text; // Return original text on error
    }

    return data?.translatedText || text;
  } catch (error) {
    console.error("Translation service error:", error);
    return text; // Return original text on error
  }
};

// Translate an array of instructions
const translateInstructions = async (
  instructions,
  targetLanguage,
  sourceLanguage
) => {
  if (!Array.isArray(instructions) || instructions.length === 0) {
    return instructions;
  }

  try {
    const translatedInstructions = await Promise.all(
      instructions.map((instruction) =>
        translateText(instruction, targetLanguage, sourceLanguage)
      )
    );
    return translatedInstructions;
  } catch (error) {
    console.error("Error translating instructions:", error);
    return instructions;
  }
};

// Translate ingredient data
const translateIngredients = async (
  ingredients,
  targetLanguage,
  sourceLanguage
) => {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return ingredients;
  }

  try {
    const translatedIngredients = await Promise.all(
      ingredients.map(async (ingredient) => {
        const translatedIngredient = { ...ingredient };

        // Translate all translatable ingredient fields
        for (const field of TRANSLATABLE_INGREDIENT_FIELDS) {
          if (ingredient[field] && typeof ingredient[field] === "string") {
            translatedIngredient[field] = await translateText(
              ingredient[field],
              targetLanguage,
              sourceLanguage
            );
          }
        }

        return translatedIngredient;
      })
    );
    return translatedIngredients;
  } catch (error) {
    console.error("Error translating ingredients:", error);
    return ingredients;
  }
};

// Translate a complete recipe object
export const translateRecipe = async (
  recipe,
  targetLanguage,
  sourceLanguage = null
) => {
  if (!recipe || !targetLanguage) {
    return recipe;
  }

  // If target language is the same as source, no translation needed
  if (
    sourceLanguage &&
    sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()
  ) {
    return recipe;
  }

  try {
    const translatedRecipe = { ...recipe };

    // Translate basic text fields
    for (const field of TRANSLATABLE_RECIPE_FIELDS) {
      if (recipe[field] && typeof recipe[field] === "string") {
        translatedRecipe[field] = await translateText(
          recipe[field],
          targetLanguage,
          sourceLanguage
        );
      }
    }

    // Handle instructions array separately
    if (recipe.instructions && Array.isArray(recipe.instructions)) {
      translatedRecipe.instructions = await translateInstructions(
        recipe.instructions,
        targetLanguage,
        sourceLanguage
      );
    }

    // Translate ingredients
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      translatedRecipe.ingredients = await translateIngredients(
        recipe.ingredients,
        targetLanguage,
        sourceLanguage
      );
    }

    return translatedRecipe;
  } catch (error) {
    console.error("Error translating recipe:", error);
    return recipe; // Return original recipe on error
  }
};

// Check if a recipe needs translation based on current language
export const shouldTranslateRecipe = (recipe, currentLanguage) => {
  if (!recipe || !currentLanguage) {
    return false;
  }

  // Normalise language codes (remove region codes like 'en-US' -> 'en')
  const normalisedCurrentLang = currentLanguage.split("-")[0].toLowerCase();

  // If recipe has an original_language field, compare it with current language
  if (recipe.original_language) {
    const normalisedOriginalLang = recipe.original_language
      .split("-")[0]
      .toLowerCase();
    return normalisedOriginalLang !== normalisedCurrentLang;
  }

  // If no original_language field, assume English and only translate if current language is not English
  return normalisedCurrentLang !== "en";
};

// Get the current language from i18n
export const getCurrentLanguage = () => {
  return i18n.language || "en";
};
