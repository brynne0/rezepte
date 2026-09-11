import supabase from "../lib/supabase";
import { toTitleCase } from "../utils/stringUtils";
import {
  resolveIngredientName,
  getIngredientNamesForLanguage,
} from "../utils/ingredientFormatting";
import {
  translateText,
  translateTexts,
  capitalizeForLanguage,
  mergeTranslatedField,
} from "./translationCore";

export { translateText };

// Normalise instruction text to always end with exactly one full stop
const normaliseInstruction = (instruction) => {
  if (!instruction || typeof instruction !== "string") {
    return instruction;
  }
  const trimmed = instruction.trim();
  if (/[.!?]$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed + ".";
};

// Get translated recipe with ingredients (for full recipe view)
export const getTranslatedRecipe = async (recipe, targetLanguage) => {
  // If original language is same as target (default to "en" if unknown), process without translating
  if ((recipe.original_language || "en") === targetLanguage) {
    // Process ingredients to add the 'name' field even for English
    const processedResult = { ...recipe };

    // Normalise original instructions to ensure they end with full stops
    if (recipe.instructions && Array.isArray(recipe.instructions)) {
      processedResult.instructions =
        recipe.instructions.map(normaliseInstruction);
    }

    // Handle ungrouped ingredients
    if (recipe.ungroupedIngredients) {
      processedResult.ungroupedIngredients = await Promise.all(
        recipe.ungroupedIngredients.map(async (ingredient) => {
          const displayName = await getIngredientDisplayName(
            ingredient,
            targetLanguage,
            recipe.original_language
          );
          return { ...ingredient, name: displayName };
        })
      );
    }

    // Handle ingredient sections
    if (recipe.ingredientSections) {
      processedResult.ingredientSections = await Promise.all(
        recipe.ingredientSections.map(async (section) => {
          const translatedIngredients = await Promise.all(
            section.ingredients.map(async (ingredient) => {
              const displayName = await getIngredientDisplayName(
                ingredient,
                targetLanguage,
                recipe.original_language
              );
              return { ...ingredient, name: displayName };
            })
          );
          return { ...section, ingredients: translatedIngredients };
        })
      );
    }

    return processedResult;
  }

  // Get translated recipe data
  const translatedRecipeData = await getTranslatedRecipeData(
    recipe,
    targetLanguage
  );

  const translatedResult = {
    ...recipe,
    ...translatedRecipeData,
    isTranslated: true,
    translatedFrom: recipe.original_language,
  };

  // Handle ungrouped ingredients
  if (recipe.ungroupedIngredients) {
    translatedResult.ungroupedIngredients = await getTranslatedIngredients(
      recipe.ungroupedIngredients,
      targetLanguage,
      recipe.original_language
    );
  }

  // Handle ingredient sections
  if (recipe.ingredientSections) {
    translatedResult.ingredientSections = await Promise.all(
      recipe.ingredientSections.map(async (section) => {
        const translatedIngredients = await getTranslatedIngredients(
          section.ingredients,
          targetLanguage,
          recipe.original_language
        );
        // Translate the section subheading with food context
        const translatedSubheading = section.subheading
          ? await translateText(
              section.subheading,
              targetLanguage,
              "Food section"
            )
          : section.subheading;
        return {
          ...section,
          subheading: translatedSubheading,
          ingredients: translatedIngredients,
        };
      })
    );
  }

  return translatedResult;
};

// Get translated recipe title only (for recipe lists)
export const getTranslatedRecipeTitle = async (recipe, targetLanguage) => {
  // If original language is same as target (default to "en" if unknown), return without translating
  if ((recipe.original_language || "en") === targetLanguage) {
    const processedResult = { ...recipe };
    // Normalise original instructions to ensure they end with full stop
    if (recipe.instructions && Array.isArray(recipe.instructions)) {
      processedResult.instructions =
        recipe.instructions.map(normaliseInstruction);
    }
    return processedResult;
  }

  // Check if title translation exists in storage
  const cachedTranslation = recipe.translated_recipe?.[targetLanguage];
  if (cachedTranslation?.title) {
    return {
      ...recipe,
      title: cachedTranslation.title,
      isTranslated: true,
      translatedFrom: recipe.original_language,
    };
  }

  // Title not cached, translate only the title
  const sourceLang = recipe.original_language || "en";
  try {
    const rawTranslatedTitle = await translateText(
      recipe.title,
      targetLanguage,
      null,
      sourceLang
    );
    const translatedTitle =
      targetLanguage === "en"
        ? toTitleCase(rawTranslatedTitle)
        : rawTranslatedTitle;

    // Save just the title translation (don't overwrite other fields)
    await saveRecipeTitleTranslation(
      recipe.id,
      targetLanguage,
      translatedTitle
    );

    return {
      ...recipe,
      title: translatedTitle,
      isTranslated: true,
      translatedFrom: recipe.original_language,
    };
  } catch (error) {
    console.error("Recipe title translation failed:", error);
    return recipe; // Return original if translation fails
  }
};

// Get translated recipe data (title, instructions, notes, category, source)
const getTranslatedRecipeData = async (recipe, targetLanguage) => {
  // Check if translation exists in storage
  const cachedTranslation = recipe.translated_recipe?.[targetLanguage];
  if (cachedTranslation) {
    // Check if this is an old/incomplete cached translation (only has title)
    const fieldCount = Object.keys(cachedTranslation).length;
    if (fieldCount === 1 && cachedTranslation.title) {
      // Incomplete cached translation, will retranslate
    } else {
      return {
        title: cachedTranslation.title,
        category: cachedTranslation.category,
        instructions: cachedTranslation.instructions,
        notes: cachedTranslation.notes,
        source: cachedTranslation.source,
      };
    }
  }

  // Translation not stored, need to translate
  // Check if source is a URL - URLs should not be translated
  const sourceText = recipe.source || "";
  const isSourceUrl =
    sourceText.startsWith("http://") ||
    sourceText.startsWith("https://") ||
    sourceText.startsWith("www.");

  // Build translation array - always include source position for consistency
  const textsToTranslate = [
    recipe.title,
    recipe.category,
    recipe.notes || "",
    // Always include source in the array, but use empty string for URLs
    isSourceUrl ? "" : sourceText || "",
    ...recipe.instructions,
  ];

  const sourceLang = recipe.original_language || "en";
  try {
    const translatedTexts = await translateTexts(
      textsToTranslate,
      targetLanguage,
      sourceLang
    );

    // Translate category separately with food context for better accuracy
    const translatedCategory = await translateText(
      recipe.category,
      targetLanguage,
      "Food category",
      sourceLang
    );

    const translatedData = {
      title:
        targetLanguage === "en"
          ? toTitleCase(translatedTexts[0])
          : translatedTexts[0],
      category: translatedCategory,
      notes: translatedTexts[2] || null,
      source: isSourceUrl ? sourceText : translatedTexts[3] || null,
      instructions: translatedTexts.slice(4).map(normaliseInstruction),
    };

    // Save translation to database
    await saveRecipeTranslationToStorage(
      recipe.id,
      targetLanguage,
      translatedData
    );

    return translatedData;
  } catch (error) {
    console.error("Recipe translation failed:", error);
    // Return original data if translation fails
    return {
      title: recipe.title,
      category: recipe.category,
      instructions: recipe.instructions,
      notes: recipe.notes,
    };
  }
};

// Helper function to get the correct ingredient name for display
const getIngredientDisplayName = async (
  ingredient,
  targetLanguage,
  sourceLanguage = "en"
) => {
  const usePlural = ingredient.is_plural || false;

  // Override, or a same-language / already-cached translation, resolves without any API call
  const resolved = resolveIngredientName(
    ingredient,
    targetLanguage,
    sourceLanguage
  );
  if (resolved !== null) return resolved;

  // Need to translate from source to target: get the source text
  const { singular_name: sourceSingular, plural_name: sourcePlural } =
    getIngredientNamesForLanguage(ingredient, sourceLanguage);

  try {
    // Translate both singular and plural forms from source to target with food context
    const translatedSingular = await translateText(
      sourceSingular,
      targetLanguage,
      "Food ingredient"
    );
    const translatedPlural = sourcePlural
      ? await translateText(sourcePlural, targetLanguage, "Food ingredient")
      : translatedSingular;

    // Unchanged result means translateText silently failed - don't cache
    // source-language text as if it were a real translation
    const singularTranslated =
      translatedSingular.trim().toLowerCase() !==
      sourceSingular.trim().toLowerCase();
    if (!singularTranslated) {
      return usePlural && sourcePlural ? sourcePlural : sourceSingular;
    }
    const pluralTranslated =
      !sourcePlural ||
      translatedPlural.trim().toLowerCase() !==
        sourcePlural.trim().toLowerCase();

    const finalSingular = capitalizeForLanguage(
      translatedSingular,
      targetLanguage
    );
    const finalPlural = pluralTranslated
      ? capitalizeForLanguage(translatedPlural, targetLanguage)
      : finalSingular;

    // Save translation to database
    const translationData = {
      singular_name: finalSingular,
      plural_name: finalPlural,
    };

    try {
      await saveIngredientTranslation(
        ingredient.id,
        targetLanguage,
        translationData
      );
    } catch (saveError) {
      console.warn(
        `Translation created but failed to save to database:`,
        saveError.message
      );
      // Continue anyway - translation will work for this session
    }

    // Return the appropriate form
    const result = usePlural ? finalPlural : finalSingular;
    return result;
  } catch (error) {
    console.error(`Failed to create translation for ${sourceSingular}:`, error);

    // Fallback to source text if translation fails
    const result = usePlural && sourcePlural ? sourcePlural : sourceSingular;
    return result;
  }
};

// Get translated ingredients
const getTranslatedIngredients = async (
  ingredients,
  targetLanguage,
  sourceLanguage = "en"
) => {
  if (!ingredients || ingredients.length === 0) return ingredients;

  try {
    const translatedIngredients = await Promise.all(
      ingredients.map(async (ingredient) => {
        // Get translated ingredient name (with plural consideration)
        const translatedName = await getIngredientDisplayName(
          ingredient,
          targetLanguage,
          sourceLanguage
        );

        // Get translated ingredient notes (cached in recipe_ingredients table)
        const translatedNotes = await getTranslatedIngredientNotes(
          ingredient.recipe_ingredient_id,
          ingredient.notes,
          targetLanguage
        );

        return {
          ...ingredient,
          name: translatedName,
          notes: translatedNotes,
        };
      })
    );

    return translatedIngredients;
  } catch (error) {
    console.error("Ingredient translation failed:", error);
    return ingredients; // Return original if translation fails
  }
};

// Get translated ingredient notes (cached in recipe_ingredients table)
const getTranslatedIngredientNotes = async (
  recipeIngredientId,
  originalNotes,
  targetLanguage
) => {
  // If no notes, return empty
  if (!originalNotes || originalNotes.trim() === "") {
    return originalNotes;
  }

  try {
    // Get recipe_ingredient with translations
    const { data: recipeIngredient, error } = await supabase
      .from("recipe_ingredients")
      .select("translated_notes")
      .eq("id", recipeIngredientId)
      .single();

    if (error) throw error;

    // Check if translation exists
    const cachedTranslation =
      recipeIngredient.translated_notes?.[targetLanguage];
    if (cachedTranslation) {
      return cachedTranslation;
    }

    // Translation not cached, translate and store
    const translatedNotes = await translateText(originalNotes, targetLanguage);

    // German notes keep DeepL's natural sentence casing; other languages are lowercased
    const finalTranslatedNotes =
      targetLanguage === "de" ? translatedNotes : translatedNotes.toLowerCase();

    await saveIngredientNotesTranslation(
      recipeIngredientId,
      targetLanguage,
      finalTranslatedNotes
    );

    return finalTranslatedNotes;
  } catch (error) {
    console.error(`Failed to translate ingredient notes:`, error);
    return originalNotes; // Return original if translation fails
  }
};

// Save recipe translation to database storage
const saveRecipeTranslationToStorage = (recipeId, language, translatedData) => {
  // Clean the translatedData to ensure it's JSON serializable
  const cleanTranslatedData = {
    title: translatedData.title || null,
    category: translatedData.category || null,
    instructions: Array.isArray(translatedData.instructions)
      ? translatedData.instructions
      : [],
    notes: translatedData.notes || null,
    source: translatedData.source || null,
  };

  return mergeTranslatedField(
    "recipes",
    recipeId,
    "translated_recipe",
    language,
    () => cleanTranslatedData
  );
};

// Save just recipe title translation (for recipe lists), keeping other fields intact
const saveRecipeTitleTranslation = (recipeId, language, translatedTitle) =>
  mergeTranslatedField(
    "recipes",
    recipeId,
    "translated_recipe",
    language,
    (existing) => ({ ...existing, title: translatedTitle })
  );

// Save ingredient notes translation to database storage
const saveIngredientNotesTranslation = (
  recipeIngredientId,
  language,
  translatedNotes
) =>
  mergeTranslatedField(
    "recipe_ingredients",
    recipeIngredientId,
    "translated_notes",
    language,
    () => translatedNotes
  );

// Save ingredient translation to database storage
const saveIngredientTranslation = (ingredientId, language, translationData) =>
  mergeTranslatedField(
    "ingredients",
    ingredientId,
    "translated_names",
    language,
    () => translationData
  );

// Smart update translations when recipe is edited
export const updateRecipeTranslations = async (
  recipeId,
  oldRecipeData,
  newRecipeData
) => {
  try {
    // Get current translations
    const { data: currentRecipe, error: fetchError } = await supabase
      .from("recipes")
      .select("translated_recipe")
      .eq("id", recipeId)
      .single();

    if (fetchError || !currentRecipe.translated_recipe) {
      return; // No existing translations to update
    }

    const existingTranslations = currentRecipe.translated_recipe;

    // Only fields that actually changed need retranslating; everything else
    // is carried over from the existing cached translation.
    const titleChanged = oldRecipeData.title !== newRecipeData.title;
    const categoryChanged = oldRecipeData.category !== newRecipeData.category;
    const notesChanged = oldRecipeData.notes !== newRecipeData.notes;
    const sourceChanged = oldRecipeData.source !== newRecipeData.source;
    const instructionsChanged =
      JSON.stringify(oldRecipeData.instructions) !==
      JSON.stringify(newRecipeData.instructions);

    // Translate for every language in parallel, and within each language
    // translate every changed field in parallel too.
    const perLanguageUpdates = await Promise.all(
      Object.entries(existingTranslations).map(
        async ([language, translation]) => {
          const [title, category, notes, source, instructions] =
            await Promise.all([
              titleChanged
                ? translateText(newRecipeData.title, language)
                : translation.title,
              categoryChanged
                ? translateText(
                    newRecipeData.category,
                    language,
                    "Food category"
                  )
                : translation.category,
              notesChanged
                ? newRecipeData.notes
                  ? translateText(newRecipeData.notes, language)
                  : null
                : translation.notes,
              sourceChanged
                ? newRecipeData.source
                  ? translateText(newRecipeData.source, language)
                  : null
                : translation.source,
              instructionsChanged
                ? translateTexts(newRecipeData.instructions, language).then(
                    (texts) => texts.map(normaliseInstruction)
                  )
                : translation.instructions,
            ]);

          return [language, { title, category, notes, source, instructions }];
        }
      )
    );

    const updatedTranslations = {
      ...existingTranslations,
      ...Object.fromEntries(perLanguageUpdates),
    };

    // Save updated translations
    const { error: updateError } = await supabase
      .from("recipes")
      .update({ translated_recipe: updatedTranslations })
      .eq("id", recipeId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error("Failed to update recipe translations:", error);
    // Don't throw error - recipe update should still succeed
  }
};

// Update a specific translation for a recipe (for translation editing)
export const updateTranslationOnly = async (
  recipeId,
  language,
  translatedData,
  ingredientOverrides = [],
  ingredientNotesUpdates = []
) => {
  try {
    // Get current translations
    const { data: currentRecipe, error: fetchError } = await supabase
      .from("recipes")
      .select("translated_recipe")
      .eq("id", recipeId)
      .single();

    if (fetchError) {
      throw new Error(
        `Failed to fetch current translations: ${fetchError.message}`
      );
    }

    const existingTranslations = currentRecipe.translated_recipe || {};

    // Update only the specified language translation
    const updatedTranslations = {
      ...existingTranslations,
      [language]: {
        ...existingTranslations[language],
        ...translatedData,
      },
    };

    // Save updated translations back to database
    const { error: updateError } = await supabase
      .from("recipes")
      .update({ translated_recipe: updatedTranslations })
      .eq("id", recipeId);

    if (updateError) {
      throw new Error(`Failed to update translation: ${updateError.message}`);
    }

    // Handle ingredient name overrides
    if (ingredientOverrides && ingredientOverrides.length > 0) {
      await updateIngredientOverrides(ingredientOverrides);
    }

    // Handle ingredient notes updates
    if (ingredientNotesUpdates && ingredientNotesUpdates.length > 0) {
      await updateIngredientNotesTranslations(ingredientNotesUpdates);
    }

    return updatedTranslations[language];
  } catch (error) {
    console.error("Error updating translation:", error);
    throw error;
  }
};

// Update ingredient name overrides for translation editing
const updateIngredientOverrides = (ingredientOverrides) =>
  Promise.all(
    ingredientOverrides.map(({ recipe_ingredient_id, name, language }) =>
      mergeTranslatedField(
        "recipe_ingredients",
        recipe_ingredient_id,
        "name_overrides",
        language,
        () => name
      )
    )
  );

// Update ingredient notes translations for translation editing
const updateIngredientNotesTranslations = (ingredientNotesUpdates) =>
  Promise.all(
    ingredientNotesUpdates.map(({ recipe_ingredient_id, notes, language }) =>
      saveIngredientNotesTranslation(recipe_ingredient_id, language, notes)
    )
  );

// Normalise instructions to always end with full stops (for use with original/existing instructions)
export const normaliseInstructions = (instructions) => {
  if (!Array.isArray(instructions)) {
    return instructions;
  }
  return instructions.map(normaliseInstruction);
};
