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
  // If target language is the same as original, return original recipe
  if (recipe.original_language === targetLanguage) {
    return recipe;
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

// Get translated ingredients
const getTranslatedIngredients = async (ingredients, targetLanguage) => {
  if (!ingredients || ingredients.length === 0) return ingredients;

  try {
    const translatedIngredients = await Promise.all(
      ingredients.map(async (ingredient) => {
        // Get translated ingredient name
        const translatedName = await getTranslatedIngredientName(
          ingredient.id,
          ingredient.name,
          targetLanguage
        );

        // Translate ingredient notes on-demand (not cached)
        let translatedNotes = ingredient.notes;
        if (ingredient.notes && ingredient.notes.trim() !== "") {
          translatedNotes = await translateText(
            ingredient.notes,
            targetLanguage
          );
        }

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

// Get translated ingredient name (cached in ingredients table)
const getTranslatedIngredientName = async (
  ingredientId,
  originalName,
  targetLanguage
) => {
  try {
    // Get ingredient with translations
    const { data: ingredient, error } = await supabase
      .from("ingredients")
      .select("translated_names")
      .eq("id", ingredientId)
      .single();

    if (error) throw error;

    // Check if translation exists
    const cachedTranslation = ingredient.translated_names?.[targetLanguage];
    if (cachedTranslation) {
      return cachedTranslation;
    }

    // Translation not cached, translate and store
    const translatedName = await translateText(originalName, targetLanguage);
    await saveIngredientTranslation(
      ingredientId,
      targetLanguage,
      translatedName
    );

    return translatedName;
  } catch (error) {
    console.error(`Failed to translate ingredient ${originalName}:`, error);
    return originalName; // Return original if translation fails
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

    console.log(`Recipe title stored for recipe ${recipeId} in ${language}`);
  } catch (error) {
    console.error("Failed to store recipe title:", error);
    // Don't throw error - translation worked, just storage failed
  }
};

// Save ingredient translation to database storage
const saveIngredientTranslation = async (
  ingredientId,
  language,
  translatedName
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
      [language]: translatedName,
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
