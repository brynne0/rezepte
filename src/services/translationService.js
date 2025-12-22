import supabase from "../lib/supabase";

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

// DeepL translation function using Supabase Edge Function
const translateText = async (text, targetLanguage) => {
  if (!text || text.trim() === "") return text;

  try {
    const { data, error } = await supabase.functions.invoke("translate", {
      body: {
        text: text,
        target_lang: targetLanguage,
        source_lang: "auto",
      },
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
    return text; // Return original text if translation fails
  }
};

// Translate an array of texts
const translateTexts = async (texts, targetLanguage) => {
  const nonEmptyTexts = texts.filter((text) => text && text.trim() !== "");
  const promises = nonEmptyTexts.map((text) =>
    translateText(text, targetLanguage)
  );
  const translatedResults = await Promise.all(promises);

  // Map back to original array structure, preserving empty strings
  let resultIndex = 0;
  return texts.map((text) => {
    if (!text || text.trim() === "") return text;
    return translatedResults[resultIndex++];
  });
};

// Get translated recipe with ingredients (for full recipe view)
export const getTranslatedRecipe = async (recipe, targetLanguage) => {
  // If target language is the same as original, still need to process ingredients for display
  if (recipe.original_language === targetLanguage) {
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
        // Translate the section subheading
        const translatedSubheading = section.subheading
          ? await translateText(section.subheading, targetLanguage)
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
  // If target language is the same as original, normalise instructions and return
  if (recipe.original_language === targetLanguage) {
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
  try {
    const translatedTitle = await translateText(recipe.title, targetLanguage);

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

  try {
    const translatedTexts = await translateTexts(
      textsToTranslate,
      targetLanguage
    );

    const translatedData = {
      title: translatedTexts[0],
      category: translatedTexts[1],
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
const getIngredientDisplayName = async (ingredient, targetLanguage, sourceLanguage = 'en') => {
  const usePlural = ingredient.is_plural || false;

  // Check for recipe-specific name overrides
  if (ingredient.name_overrides && ingredient.name_overrides[targetLanguage]) {
    return ingredient.name_overrides[targetLanguage];
  }

  // If target language matches source language, use the appropriate source
  if (targetLanguage === sourceLanguage) {
    // If source is English, use database columns
    if (sourceLanguage === "en") {
      const result =
        usePlural && ingredient.plural_name
          ? ingredient.plural_name
          : ingredient.singular_name;
      return result;
    }
    // If source is another language, use translations
    const translation = ingredient.translated_names?.[sourceLanguage];
    if (translation && typeof translation === "object") {
      const result =
        usePlural && translation.plural_name
          ? translation.plural_name
          : translation.singular_name;
      return result;
    }
    // Fallback to database columns if translation not found
    const result =
      usePlural && ingredient.plural_name
        ? ingredient.plural_name
        : ingredient.singular_name;
    return result;
  }

  // Translation needed: sourceLanguage → targetLanguage
  // First check if the target translation already exists
  const targetTranslation = ingredient.translated_names?.[targetLanguage];
  if (targetTranslation && typeof targetTranslation === "object") {
    const result =
      usePlural && targetTranslation.plural_name
        ? targetTranslation.plural_name
        : targetTranslation.singular_name;
    return result;
  }

  // Need to translate from source to target
  // Get the source text
  let sourceSingular, sourcePlural;

  if (sourceLanguage === "en") {
    // Source is English, use database columns
    sourceSingular = ingredient.singular_name;
    sourcePlural = ingredient.plural_name;
  } else {
    // Source is another language, use translations
    const sourceTranslation = ingredient.translated_names?.[sourceLanguage];
    if (sourceTranslation && typeof sourceTranslation === "object") {
      sourceSingular = sourceTranslation.singular_name;
      sourcePlural = sourceTranslation.plural_name;
    } else {
      // Fallback to English if source translation not found
      sourceSingular = ingredient.singular_name;
      sourcePlural = ingredient.plural_name;
    }
  }

  try {
    // Translate both singular and plural forms from source to target
    const translatedSingular = await translateText(
      sourceSingular,
      targetLanguage
    );
    const translatedPlural = sourcePlural
      ? await translateText(sourcePlural, targetLanguage)
      : translatedSingular;

    // Only lowercase if not German
    const finalSingular =
      targetLanguage === "de"
        ? translatedSingular
        : translatedSingular.toLowerCase();
    const finalPlural =
      targetLanguage === "de"
        ? translatedPlural
        : translatedPlural.toLowerCase();

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
    console.error(
      `Failed to create translation for ${sourceSingular}:`,
      error
    );

    // Fallback to source text if translation fails
    const result =
      usePlural && sourcePlural
        ? sourcePlural
        : sourceSingular;
    return result;
  }
};

// Get translated ingredients
const getTranslatedIngredients = async (ingredients, targetLanguage, sourceLanguage = 'en') => {
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

    // Preserve capitalisation for German, lowercase for other languages
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
const saveRecipeTranslationToStorage = async (
  recipeId,
  language,
  translatedData
) => {
  try {
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

    // Get current translated_recipe data
    const { data: currentRecipe, error: fetchError } = await supabase
      .from("recipes")
      .select("translated_recipe")
      .eq("id", recipeId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Merge new translation with existing translations
    const existingTranslations = currentRecipe.translated_recipe || {};
    const updatedTranslations = {
      ...existingTranslations,
      [language]: cleanTranslatedData,
    };

    // Update the database
    const { error: updateError } = await supabase
      .from("recipes")
      .update({ translated_recipe: updatedTranslations })
      .eq("id", recipeId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }
  } catch (error) {
    console.error("Failed to store recipe translation:", error);
    console.error("Recipe ID:", recipeId, "Language:", language);
    console.error("Translation data:", translatedData);
    // Don't throw error - translation worked, just storage failed
  }
};

// Save just recipe title translation (for recipe lists)
const saveRecipeTitleTranslation = async (
  recipeId,
  language,
  translatedTitle
) => {
  try {
    // Get current translated_recipe data
    const { data: currentRecipe, error: fetchError } = await supabase
      .from("recipes")
      .select("translated_recipe")
      .eq("id", recipeId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Merge title with existing translations, keeping other fields intact
    const existingTranslation =
      currentRecipe.translated_recipe?.[language] || {};
    const updatedTranslations = {
      ...(currentRecipe.translated_recipe || {}),
      [language]: {
        ...existingTranslation,
        title: translatedTitle,
      },
    };

    // Update the database
    const { error: updateError } = await supabase
      .from("recipes")
      .update({ translated_recipe: updatedTranslations })
      .eq("id", recipeId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error("Failed to store recipe title:", error);
    // Don't throw error - translation worked, just storage failed
  }
};

// Save ingredient notes translation to database storage
const saveIngredientNotesTranslation = async (
  recipeIngredientId,
  language,
  translatedNotes
) => {
  try {
    // Get current translated_notes data
    const { data: currentRecipeIngredient, error: fetchError } = await supabase
      .from("recipe_ingredients")
      .select("translated_notes")
      .eq("id", recipeIngredientId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Merge new translation with existing translations
    const updatedTranslations = {
      ...(currentRecipeIngredient.translated_notes || {}),
      [language]: translatedNotes,
    };

    // Update the database
    const { error: updateError } = await supabase
      .from("recipe_ingredients")
      .update({ translated_notes: updatedTranslations })
      .eq("id", recipeIngredientId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error("Failed to store ingredient notes translation:", error);
    // Don't throw error - translation worked, just storage failed
  }
};

// Save ingredient translation to database storage
const saveIngredientTranslation = async (
  ingredientId,
  language,
  translationData
) => {
  try {
    // Get current translated_names data
    const { data: currentIngredient, error: fetchError } = await supabase
      .from("ingredients")
      .select("translated_names")
      .eq("id", ingredientId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Merge new translation with existing translations
    const updatedTranslations = {
      ...(currentIngredient.translated_names || {}),
      [language]: translationData,
    };

    // Update the database
    const { error: updateError } = await supabase
      .from("ingredients")
      .update({ translated_names: updatedTranslations })
      .eq("id", ingredientId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error("Failed to store ingredient translation:", error);
    // Don't throw error - translation worked, just storage failed
  }
};

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
    const updatedTranslations = { ...existingTranslations };

    // Check each language and update only changed fields
    for (const [language, translation] of Object.entries(
      existingTranslations
    )) {
      const fieldsToUpdate = {};
      let needsUpdate = false;

      // Check each field for changes
      if (oldRecipeData.title !== newRecipeData.title) {
        fieldsToUpdate.title = await translateText(
          newRecipeData.title,
          language
        );
        needsUpdate = true;
      } else {
        fieldsToUpdate.title = translation.title;
      }

      if (oldRecipeData.category !== newRecipeData.category) {
        fieldsToUpdate.category = await translateText(
          newRecipeData.category,
          language
        );
        needsUpdate = true;
      } else {
        fieldsToUpdate.category = translation.category;
      }

      if (oldRecipeData.notes !== newRecipeData.notes) {
        fieldsToUpdate.notes = newRecipeData.notes
          ? await translateText(newRecipeData.notes, language)
          : null;
        needsUpdate = true;
      } else {
        fieldsToUpdate.notes = translation.notes;
      }

      if (oldRecipeData.source !== newRecipeData.source) {
        fieldsToUpdate.source = newRecipeData.source
          ? await translateText(newRecipeData.source, language)
          : null;
        needsUpdate = true;
      } else {
        fieldsToUpdate.source = translation.source;
      }

      // Check instructions (compare arrays)
      if (
        JSON.stringify(oldRecipeData.instructions) !==
        JSON.stringify(newRecipeData.instructions)
      ) {
        const translatedInstructions = await translateTexts(
          newRecipeData.instructions,
          language
        );
        fieldsToUpdate.instructions =
          translatedInstructions.map(normaliseInstruction);
        needsUpdate = true;
      } else {
        fieldsToUpdate.instructions = translation.instructions;
      }

      // Update translation if any field changed
      if (needsUpdate) {
        updatedTranslations[language] = fieldsToUpdate;
      }
    }

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

// Clear all translations for a recipe (nuclear option)
export const clearRecipeTranslations = async (recipeId) => {
  try {
    await supabase
      .from("recipes")
      .update({ translated_recipe: null })
      .eq("id", recipeId);
  } catch (error) {
    console.error("Failed to clear recipe translations:", error);
  }
};

// Update ingredient name overrides for translation editing
const updateIngredientOverrides = async (ingredientOverrides) => {
  try {
    for (const override of ingredientOverrides) {
      const { recipe_ingredient_id, name, language } = override;

      // Get current name_overrides for this ingredient
      const { data: currentIngredient, error: fetchError } = await supabase
        .from("recipe_ingredients")
        .select("name_overrides")
        .eq("id", recipe_ingredient_id)
        .single();

      if (fetchError) {
        console.error(
          `Failed to fetch ingredient ${recipe_ingredient_id}:`,
          fetchError
        );
        continue; // Skip this override and continue with others
      }

      // Merge the new override with existing overrides
      const updatedOverrides = {
        ...(currentIngredient.name_overrides || {}),
        [language]: name,
      };

      // Update the database
      const { error: updateError } = await supabase
        .from("recipe_ingredients")
        .update({ name_overrides: updatedOverrides })
        .eq("id", recipe_ingredient_id);

      if (updateError) {
        console.error(
          `Failed to update ingredient override ${recipe_ingredient_id}:`,
          updateError
        );
        // Continue with other overrides even if one fails
      }
    }
  } catch (error) {
    console.error("Failed to update ingredient overrides:", error);
    // Don't throw error - translation update should still succeed
  }
};

// Update ingredient notes translations for translation editing
const updateIngredientNotesTranslations = async (ingredientNotesUpdates) => {
  try {
    for (const notesUpdate of ingredientNotesUpdates) {
      const { recipe_ingredient_id, notes, language } = notesUpdate;

      // Use the existing saveIngredientNotesTranslation function
      await saveIngredientNotesTranslation(
        recipe_ingredient_id,
        language,
        notes
      );
    }
  } catch (error) {
    console.error("Failed to update ingredient notes translations:", error);
    // Don't throw error - translation update should still succeed
  }
};

// Normalise instructions to always end with full stops (for use with original/existing instructions)
export const normaliseInstructions = (instructions) => {
  if (!Array.isArray(instructions)) {
    return instructions;
  }
  return instructions.map(normaliseInstruction);
};
