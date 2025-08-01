import supabase from "../lib/supabase";

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

    return data.translatedText || text;
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
    const processedIngredients = await Promise.all(
      recipe.ingredients?.map(async (ingredient) => {
        const displayName = await getIngredientDisplayName(
          ingredient,
          targetLanguage,
          ingredient.quantity
        );

        return {
          ...ingredient,
          name: displayName,
        };
      }) || []
    );

    return {
      ...recipe,
      ingredients: processedIngredients,
    };
  }

  // Get translated recipe data
  const translatedRecipeData = await getTranslatedRecipeData(
    recipe,
    targetLanguage
  );

  // Get translated ingredients
  const translatedIngredients = await getTranslatedIngredients(
    recipe.ingredients,
    targetLanguage
  );

  return {
    ...recipe,
    ...translatedRecipeData,
    ingredients: translatedIngredients,
    isTranslated: true,
    translatedFrom: recipe.original_language,
  };
};

// Get translated recipe title only (for recipe lists)
export const getTranslatedRecipeTitle = async (recipe, targetLanguage) => {
  // If target language is the same as original, return original recipe
  if (recipe.original_language === targetLanguage) {
    return recipe;
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
    return {
      title: cachedTranslation.title,
      category: cachedTranslation.category,
      instructions: cachedTranslation.instructions,
      notes: cachedTranslation.notes,
      source: cachedTranslation.source,
    };
  }

  // Translation not stored, need to translate
  const textsToTranslate = [
    recipe.title,
    recipe.category,
    recipe.notes || "",
    recipe.source || "",
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
      source: translatedTexts[3] || null,
      instructions: translatedTexts.slice(4),
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

// Helper function to determine if quantity should use plural form
const shouldUsePlural = (quantity) => {
  if (!quantity || quantity === null) return false;
  const num = parseFloat(quantity);
  return num !== 1;
};

// Helper function to get the correct ingredient name for display
const getIngredientDisplayName = async (
  ingredient,
  targetLanguage,
  quantity
) => {
  const usePlural = shouldUsePlural(quantity);

  // If target language is English, use database columns
  if (targetLanguage === "en") {
    const result =
      usePlural && ingredient.plural_name
        ? ingredient.plural_name
        : ingredient.singular_name;
    return result;
  }

  // For other languages, check translations
  const translation = ingredient.translated_names?.[targetLanguage];
  if (translation && typeof translation === "object") {
    const result =
      usePlural && translation.plural_name
        ? translation.plural_name
        : translation.singular_name;
    return result;
  }

  try {
    // Translate both singular and plural forms
    const translatedSingular = await translateText(
      ingredient.singular_name,
      targetLanguage
    );
    const translatedPlural = ingredient.plural_name
      ? await translateText(ingredient.plural_name, targetLanguage)
      : translatedSingular;

    // Apply language-specific capitalization rules
    const finalSingular =
      targetLanguage === "de"
        ? translatedSingular.charAt(0).toUpperCase() +
          translatedSingular.slice(1).toLowerCase()
        : translatedSingular.toLowerCase();

    const finalPlural =
      targetLanguage === "de"
        ? translatedPlural.charAt(0).toUpperCase() +
          translatedPlural.slice(1).toLowerCase()
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

    // Return the appropriate form based on quantity
    const result = usePlural ? finalPlural : finalSingular;
    return result;
  } catch (error) {
    console.error(
      `Failed to create translation for ${ingredient.singular_name}:`,
      error
    );

    // Fallback to English if translation fails
    const result =
      usePlural && ingredient.plural_name
        ? ingredient.plural_name
        : ingredient.singular_name;
    return result;
  }
};

// Get translated ingredients
const getTranslatedIngredients = async (ingredients, targetLanguage) => {
  if (!ingredients || ingredients.length === 0) return ingredients;

  try {
    const translatedIngredients = await Promise.all(
      ingredients.map(async (ingredient) => {
        // Get translated ingredient name (with plural consideration)
        const translatedName = await getIngredientDisplayName(
          ingredient,
          targetLanguage,
          ingredient.quantity
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

    // Ingredient notes are always lowercase regardless of language
    const finalTranslatedNotes = translatedNotes.toLowerCase();

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
    const updatedTranslations = {
      ...(currentRecipe.translated_recipe || {}),
      [language]: translatedData,
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
    console.error("Failed to store recipe translation:", error);
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
        fieldsToUpdate.instructions = await translateTexts(
          newRecipeData.instructions,
          language
        );
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
