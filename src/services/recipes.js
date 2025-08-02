import supabase from "../lib/supabase";
import { updateRecipeTranslations } from "./translationService";
import pluralize from "pluralize";

// Import translateText from translation.js (the DeepL service)
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
      return text; // Return original text on error
    }

    return data?.translatedText || text;
  } catch {
    return text; // Return original text on error
  }
};

// Helper function to get English singular and plural forms
const getEnglishForms = (ingredientName) => {
  const trimmedName = ingredientName.trim().toLowerCase();
  const singular = pluralize.singular(trimmedName);
  const plural = pluralize.plural(singular);

  return {
    singular,
    plural,
  };
};

// Helper function to find ingredient by English name or translation
const findIngredientByNameOrTranslation = async (
  ingredientName,
  currentLanguage
) => {
  const trimmedName = ingredientName.trim();
  const searchName = trimmedName.toLowerCase();

  // Get all ingredients with their English names and translations
  const { data: ingredients, error } = await supabase
    .from("ingredients")
    .select("id, singular_name, plural_name, translated_names");

  if (error) {
    throw new Error(`Error looking up ingredients: ${error.message}`);
  }

  // If current language is English, search English names directly
  if (currentLanguage === "en") {
    for (const ingredient of ingredients) {
      if (
        ingredient.singular_name.toLowerCase() === searchName ||
        (ingredient.plural_name &&
          ingredient.plural_name.toLowerCase() === searchName)
      ) {
        return ingredient.id;
      }
    }
  } else {
    // For non-English languages, search translations first, then try English as fallback
    for (const ingredient of ingredients) {
      // Check translations for current language
      const translation = ingredient.translated_names?.[currentLanguage];
      if (translation && typeof translation === "object") {
        if (
          (translation.singular_name &&
            translation.singular_name.toLowerCase() === searchName) ||
          (translation.plural_name &&
            translation.plural_name.toLowerCase() === searchName)
        ) {
          return ingredient.id;
        }
      }
    }

    // Fallback 1: try to find English ingredient that matches (user might have typed English name)
    for (const ingredient of ingredients) {
      if (
        ingredient.singular_name.toLowerCase() === searchName ||
        (ingredient.plural_name &&
          ingredient.plural_name.toLowerCase() === searchName)
      ) {
        // Found English match, need to add translation for current language
        await addTranslationToIngredient(
          ingredient.id,
          trimmedName,
          currentLanguage
        );
        return ingredient.id;
      }
    }

    // Fallback 2: translate to English and search for that
    try {
      const translatedToEnglish = await translateText(trimmedName, "en");
      const englishSearchName = translatedToEnglish.toLowerCase();

      for (const ingredient of ingredients) {
        if (
          ingredient.singular_name.toLowerCase() === englishSearchName ||
          (ingredient.plural_name &&
            ingredient.plural_name.toLowerCase() === englishSearchName)
        ) {
          // Found English ingredient that matches the translation, add current language translation
          await addTranslationToIngredient(
            ingredient.id,
            trimmedName,
            currentLanguage
          );
          return ingredient.id;
        }
      }
    } catch {
      // Translation failed, continue without fallback search
    }
  }

  return null; // No matching ingredient found
};

// Helper function to add translation to existing English ingredient
const addTranslationToIngredient = async (
  ingredientId,
  originalInput,
  targetLanguage
) => {
  try {
    // Get current translations and English ingredient names
    const { data: ingredient, error: fetchError } = await supabase
      .from("ingredients")
      .select("singular_name, plural_name, translated_names")
      .eq("id", ingredientId)
      .single();

    if (fetchError) throw fetchError;

    // Translate the English ingredient names to the target language
    const singularTranslation = await translateText(
      ingredient.singular_name,
      targetLanguage
    );

    const pluralTranslation = await translateText(
      ingredient.plural_name,
      targetLanguage
    );

    // Use proper pluralization as fallback if translation fails
    const fallbackPlural =
      targetLanguage === "de"
        ? singularTranslation.endsWith("e")
          ? singularTranslation + "n"
          : singularTranslation + "e"
        : pluralize.plural(singularTranslation);

    const newTranslation = {
      singular_name: singularTranslation || originalInput.toLowerCase(),
      plural_name: pluralTranslation || fallbackPlural,
    };

    const updatedTranslations = {
      ...(ingredient.translated_names || {}),
      [targetLanguage]: newTranslation,
    };

    const { error: updateError } = await supabase
      .from("ingredients")
      .update({ translated_names: updatedTranslations })
      .eq("id", ingredientId);

    if (updateError) {
      throw new Error(
        `Failed to update ingredient translations: ${updateError.message}`
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to add translation to ingredient: ${error.message}`
    );
  }
};

// Helper function to get or create ingredient by name
const getOrCreateIngredient = async (
  ingredientName,
  currentLanguage = "en"
) => {
  const trimmedName = ingredientName.trim();

  // First, try to find existing ingredient
  const existingIngredientId = await findIngredientByNameOrTranslation(
    trimmedName,
    currentLanguage
  );

  if (existingIngredientId) {
    return existingIngredientId;
  }

  // No existing ingredient found - create new English ingredient
  let englishSingular,
    englishPlural,
    translations = {};

  if (currentLanguage === "en") {
    // Creating in English - use as master
    const { singular, plural } = getEnglishForms(trimmedName);
    englishSingular = singular;
    englishPlural = plural;
  } else {
    // Creating in non-English - need to translate to English first to get canonical name

    try {
      // Translate the non-English ingredient to English
      const translatedToEnglish = await translateText(trimmedName, "en");

      // Get proper English forms
      const { singular, plural } = getEnglishForms(translatedToEnglish);
      englishSingular = singular;
      englishPlural = plural;

      // Add the original language as a translation
      const originalSingular =
        currentLanguage === "de"
          ? trimmedName.charAt(0).toUpperCase() +
            trimmedName.slice(1).toLowerCase()
          : trimmedName.toLowerCase();

      const originalPlural =
        currentLanguage === "de"
          ? originalSingular.endsWith("e")
            ? originalSingular + "n"
            : originalSingular + "e"
          : pluralize.plural(originalSingular);

      translations = {
        [currentLanguage]: {
          singular_name: originalSingular,
          plural_name: originalPlural,
        },
      };
    } catch {
      // Failed to translate to English, use fallback

      // Fallback: use the foreign word as English (not ideal, but prevents crashes)
      const { singular, plural } = getEnglishForms(trimmedName);
      englishSingular = singular;
      englishPlural = plural;

      // Still add the original language
      translations = {
        [currentLanguage]: {
          singular_name: trimmedName,
          plural_name:
            currentLanguage === "de"
              ? trimmedName.endsWith("e")
                ? trimmedName + "n"
                : trimmedName + "e"
              : pluralize.plural(trimmedName),
        },
      };
    }
  }

  const { data: newIngredient, error: createError } = await supabase
    .from("ingredients")
    .insert([
      {
        singular_name: englishSingular,
        plural_name: englishPlural,
        translated_names:
          Object.keys(translations).length > 0 ? translations : null,
      },
    ])
    .select("id")
    .single();

  if (createError) {
    throw new Error(`Error creating ingredient: ${createError.message}`);
  }

  return newIngredient.id;
};

// Fetch all recipes
export const fetchRecipes = async () => {
  const { data, error } = await supabase.from("recipes").select("*");
  if (error) {
    throw error;
  }
  return data || [];
};

// Check if a recipe title already exists for the current user
export const checkRecipeTitleExists = async (title, excludeId = null) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  let query = supabase
    .from("recipes")
    .select("id")
    .eq("user_id", user.id)
    .ilike("title", title.trim());

  // Exclude current recipe when updating
  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error checking recipe title: ${error.message}`);
  }

  return data && data.length > 0;
};

// Fetch a single recipe with all associated data
export const fetchRecipe = async (id) => {
  if (!id) {
    throw new Error("Recipe ID is required");
  }

  const { data, error } = await supabase
    .from("recipes")
    .select(
      "*, recipe_ingredients(id, quantity, unit, ingredients(id, singular_name, plural_name, translated_names), notes, subheading, order_index)"
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  // Transform ingredients to hierarchical structure grouped by subheading
  const ingredientsList = data.recipe_ingredients
    ?.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
    .map((item) => ({
      id: item.ingredients.id,
      recipe_ingredient_id: item.id,
      singular_name: item.ingredients.singular_name,
      plural_name: item.ingredients.plural_name,
      translated_names: item.ingredients.translated_names,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes,
      subheading: item.subheading,
      order_index: item.order_index,
    })) || [];

  // Separate ungrouped ingredients from grouped ones
  const ungroupedIngredients = [];
  const groupedIngredients = [];
  
  ingredientsList.forEach((ingredient) => {
    if (!ingredient.subheading || ingredient.subheading.trim() === "") {
      ungroupedIngredients.push(ingredient);
    } else {
      groupedIngredients.push(ingredient);
    }
  });

  // Group the grouped ingredients by subheading
  const sectionsMap = new Map();
  let sectionOrder = 0;
  
  groupedIngredients.forEach((ingredient) => {
    const subheading = ingredient.subheading;
    
    if (!sectionsMap.has(subheading)) {
      sectionsMap.set(subheading, {
        id: `section-${sectionOrder++}`,
        subheading: subheading,
        ingredients: []
      });
    }
    
    sectionsMap.get(subheading).ingredients.push(ingredient);
  });

  const transformedData = {
    ...data,
    ungroupedIngredients: ungroupedIngredients,
    ingredientSections: Array.from(sectionsMap.values()),
    // Keep flat list for backward compatibility
    ingredients: ingredientsList,
  };

  // Remove the nested recipe_ingredients since it's flattened
  delete transformedData.recipe_ingredients;

  return transformedData;
};

// Create a new recipe
export const createRecipe = async (recipeData) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Create the main recipe record
  const cleanRecipeData = Object.fromEntries(
    Object.entries({
      title: recipeData.title,
      category: recipeData.category,
      servings: recipeData.servings,
      instructions: recipeData.instructions,
      source: recipeData.source,
      user_id: user.id,
      link_only: recipeData.link_only,
      notes: recipeData.notes,
      original_language: recipeData.original_language,
    }).filter(([, v]) => v !== undefined)
  );

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert([cleanRecipeData])
    .select()
    .single();

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  // Process ingredients in order: ungrouped first, then sections
  let recipeIngredientsToInsert = [];
  let globalOrderIndex = 0;
  
  // Handle ungrouped ingredients first
  if (recipeData.ungroupedIngredients && recipeData.ungroupedIngredients.length > 0) {
    for (const ingredient of recipeData.ungroupedIngredients) {
      let ingredientId;

      if (ingredient.ingredient_id) {
        ingredientId = ingredient.ingredient_id;
      } else if (ingredient.name) {
        ingredientId = await getOrCreateIngredient(
          ingredient.name,
          recipeData.original_language
        );
      } else {
        throw new Error("Ingredient must have either ingredient_id or name");
      }

      recipeIngredientsToInsert.push({
        recipe_id: recipe.id,
        ingredient_id: ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
        subheading: null, // Ungrouped ingredients have no subheading
        order_index: globalOrderIndex++,
      });
    }
  }
  
  // Handle ingredient sections
  if (recipeData.ingredientSections && recipeData.ingredientSections.length > 0) {
    for (const section of recipeData.ingredientSections) {
      for (const ingredient of section.ingredients) {
        let ingredientId;

        if (ingredient.ingredient_id) {
          ingredientId = ingredient.ingredient_id;
        } else if (ingredient.name) {
          ingredientId = await getOrCreateIngredient(
            ingredient.name,
            recipeData.original_language
          );
        } else {
          throw new Error("Ingredient must have either ingredient_id or name");
        }

        recipeIngredientsToInsert.push({
          recipe_id: recipe.id,
          ingredient_id: ingredientId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          notes: ingredient.notes,
          subheading: section.subheading || null,
          order_index: globalOrderIndex++,
        });
      }
    }
  }
  
  // Fallback for backward compatibility
  if (recipeIngredientsToInsert.length === 0 && recipeData.ingredients && recipeData.ingredients.length > 0) {
    // Fallback for backward compatibility with flat ingredient list
    for (let i = 0; i < recipeData.ingredients.length; i++) {
      const ingredient = recipeData.ingredients[i];
      let ingredientId;

      if (ingredient.ingredient_id) {
        ingredientId = ingredient.ingredient_id;
      } else if (ingredient.name) {
        ingredientId = await getOrCreateIngredient(
          ingredient.name,
          recipeData.original_language
        );
      } else {
        throw new Error("Ingredient must have either ingredient_id or name");
      }

      recipeIngredientsToInsert.push({
        recipe_id: recipe.id,
        ingredient_id: ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
        subheading: ingredient.subheading || null,
        order_index: i,
      });
    }
  }

  if (recipeIngredientsToInsert.length > 0) {

    const { error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .insert(recipeIngredientsToInsert);

    if (ingredientsError) {
      throw new Error(
        `Recipe created but failed to add ingredients: ${ingredientsError.message}`
      );
    }
  }

  return recipe;
};

// Update an existing recipe
export const updateRecipe = async (id, recipeData) => {
  // First fetch the original recipe for smart translation updates
  const { data: originalRecipe, error: fetchError } = await supabase
    .from("recipes")
    .select("title, category, instructions, notes, source")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch original recipe: ${fetchError.message}`);
  }

  const cleanRecipeData = Object.fromEntries(
    Object.entries({
      title: recipeData.title,
      category: recipeData.category,
      servings: recipeData.servings,
      instructions: recipeData.instructions,
      source: recipeData.source,
      link_only: recipeData.link_only,
      notes: recipeData.notes,
    }).filter(([, v]) => v !== undefined)
  );

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .update(cleanRecipeData)
    .eq("id", id)
    .select()
    .single();

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  // Smart update translations based on what changed
  await updateRecipeTranslations(id, originalRecipe, cleanRecipeData);

  // Delete existing ingredients for this recipe
  const { error: deleteError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", id);

  if (deleteError) {
    throw new Error(
      `Failed to delete existing ingredients: ${deleteError.message}`
    );
  }

  // Insert new ingredients (ungrouped + sections or flat)
  let recipeIngredientsToInsert = [];
  let globalOrderIndex = 0;
  
  // Handle ungrouped ingredients first
  if (recipeData.ungroupedIngredients && recipeData.ungroupedIngredients.length > 0) {
    for (const ingredient of recipeData.ungroupedIngredients) {
      let ingredientId;

      if (ingredient.ingredient_id) {
        ingredientId = ingredient.ingredient_id;
      } else if (ingredient.name) {
        // For updates, get the original language from the existing recipe
        const { data: existingRecipe } = await supabase
          .from("recipes")
          .select("original_language")
          .eq("id", id)
          .single();
        ingredientId = await getOrCreateIngredient(
          ingredient.name,
          existingRecipe?.original_language || "en"
        );
      } else {
        throw new Error("Ingredient must have either ingredient_id or name");
      }

      recipeIngredientsToInsert.push({
        recipe_id: id,
        ingredient_id: ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
        subheading: null, // Ungrouped ingredients have no subheading
        order_index: globalOrderIndex++,
      });
    }
  }
  
  // Handle ingredient sections
  if (recipeData.ingredientSections && recipeData.ingredientSections.length > 0) {
    for (const section of recipeData.ingredientSections) {
      for (const ingredient of section.ingredients) {
        let ingredientId;

        // Handle both cases: ingredient_id provided OR name provided
        if (ingredient.ingredient_id) {
          ingredientId = ingredient.ingredient_id;
        } else if (ingredient.name) {
          // For updates, get the original language from the existing recipe
          const { data: existingRecipe } = await supabase
            .from("recipes")
            .select("original_language")
            .eq("id", id)
            .single();
          ingredientId = await getOrCreateIngredient(
            ingredient.name,
            existingRecipe?.original_language || "en"
          );
        } else {
          throw new Error("Ingredient must have either ingredient_id or name");
        }

        recipeIngredientsToInsert.push({
          recipe_id: id,
          ingredient_id: ingredientId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          notes: ingredient.notes,
          subheading: section.subheading || null,
          order_index: globalOrderIndex++,
        });
      }
    }
  }
  
  // Fallback for backward compatibility with flat ingredient list
  if (recipeIngredientsToInsert.length === 0 && recipeData.ingredients && recipeData.ingredients.length > 0) {
    // Fallback for backward compatibility with flat ingredient list
    for (let i = 0; i < recipeData.ingredients.length; i++) {
      const ingredient = recipeData.ingredients[i];
      let ingredientId;

      // Handle both cases: ingredient_id provided OR name provided
      if (ingredient.ingredient_id) {
        ingredientId = ingredient.ingredient_id;
      } else if (ingredient.name) {
        // For updates, get the original language from the existing recipe
        const { data: existingRecipe } = await supabase
          .from("recipes")
          .select("original_language")
          .eq("id", id)
          .single();
        ingredientId = await getOrCreateIngredient(
          ingredient.name,
          existingRecipe?.original_language || "en"
        );
      } else {
        throw new Error("Ingredient must have either ingredient_id or name");
      }

      recipeIngredientsToInsert.push({
        recipe_id: id,
        ingredient_id: ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
        subheading: ingredient.subheading || null,
        order_index: i,
      });
    }
  }

  if (recipeIngredientsToInsert.length > 0) {

    const { error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .insert(recipeIngredientsToInsert);

    if (ingredientsError) {
      throw new Error(
        `Failed to add updated ingredients: ${ingredientsError.message}`
      );
    }
  }

  return recipe;
};

// Delete a recipe
export const deleteRecipe = async (id) => {
  // Note: Due to CASCADE DELETE constraint, recipe_ingredients will be
  // automatically deleted when the recipe is deleted, but we can still
  // delete them explicitly for clarity
  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", id);

  if (ingredientsError) {
    throw new Error(
      `Failed to delete recipe ingredients: ${ingredientsError.message}`
    );
  }

  // Delete the recipe
  const { error: recipeError } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id);

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  return true;
};
