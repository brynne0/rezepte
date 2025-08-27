import supabase from "../lib/supabase";
import pluralize from "pluralize";
import { updateRecipeTranslations } from "./translationService";
import {
  uploadLocalImages,
  cleanupOrphanedImages,
} from "./imageService";

// Helper function to determine if an ingredient name was entered as plural
const determineIngredientPlurality = async (inputName, language = "en") => {
  if (!inputName) {
    return false; // Default to singular if no input name
  }

  const trimmedName = inputName.trim().toLowerCase();

  // If it's English, test directly
  if (language === "en") {
    return pluralize.isPlural(trimmedName);
  }

  // For other languages, translate to English first then test plurality
  try {
    const translatedToEnglish = await translateText(
      trimmedName,
      "en",
      language
    );
    return pluralize.isPlural(translatedToEnglish.toLowerCase());
  } catch (error) {
    console.error("Failed to translate for plurality check:", error);
    // Fallback: assume singular if translation fails
    return false;
  }
};

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

// Helper function to find ingredient by English name or translation and determine if plural
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
      // Check singular first
      if (ingredient.singular_name.toLowerCase() === searchName) {
        return { id: ingredient.id, isPlural: false };
      }
      // Check plural
      if (
        ingredient.plural_name &&
        ingredient.plural_name.toLowerCase() === searchName
      ) {
        return { id: ingredient.id, isPlural: true };
      }
    }
  } else {
    // For non-English languages, search translations first, then try English as fallback
    for (const ingredient of ingredients) {
      // Check translations for current language
      const translation = ingredient.translated_names?.[currentLanguage];
      if (translation && typeof translation === "object") {
        // Check singular first
        if (
          translation.singular_name &&
          translation.singular_name.toLowerCase() === searchName
        ) {
          return { id: ingredient.id, isPlural: false };
        }
        // Check plural
        if (
          translation.plural_name &&
          translation.plural_name.toLowerCase() === searchName
        ) {
          return { id: ingredient.id, isPlural: true };
        }
      }
    }

    // TODO - simplify these two fallbacks
    // Fallback 1: try to find English ingredient that matches (user might have typed English name)
    for (const ingredient of ingredients) {
      // Check singular first
      if (ingredient.singular_name.toLowerCase() === searchName) {
        // Found English match, need to add translation for current language
        await addTranslationToIngredient(
          ingredient.id,
          trimmedName,
          currentLanguage
        );
        return { id: ingredient.id, isPlural: false };
      }
      // Check plural
      if (
        ingredient.plural_name &&
        ingredient.plural_name.toLowerCase() === searchName
      ) {
        // Found English match, need to add translation for current language
        await addTranslationToIngredient(
          ingredient.id,
          trimmedName,
          currentLanguage
        );
        return { id: ingredient.id, isPlural: true };
      }
    }

    // Fallback 2: translate to English and search for that
    try {
      const translatedToEnglish = await translateText(trimmedName, "en");
      const englishSearchName = translatedToEnglish.toLowerCase();

      for (const ingredient of ingredients) {
        // Check singular first
        if (ingredient.singular_name.toLowerCase() === englishSearchName) {
          // Found English ingredient that matches the translation, add current language translation
          await addTranslationToIngredient(
            ingredient.id,
            trimmedName,
            currentLanguage
          );
          return { id: ingredient.id, isPlural: false };
        }
        // Check plural
        if (
          ingredient.plural_name &&
          ingredient.plural_name.toLowerCase() === englishSearchName
        ) {
          // Found English ingredient that matches the translation, add current language translation
          await addTranslationToIngredient(
            ingredient.id,
            trimmedName,
            currentLanguage
          );
          return { id: ingredient.id, isPlural: true };
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

    const newTranslation = {
      singular_name: singularTranslation || originalInput.toLowerCase(),
      plural_name: pluralTranslation,
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

  // First, try to find existing ingredient in current language
  let existingIngredient = await findIngredientByNameOrTranslation(
    trimmedName,
    currentLanguage
  );

  if (existingIngredient) {
    return existingIngredient;
  }

  // If not found in current language and we're not in English,
  // try searching in English too (user might have typed English name)
  if (currentLanguage !== "en") {
    existingIngredient = await findIngredientByNameOrTranslation(
      trimmedName,
      "en"
    );

    if (existingIngredient) {
      // Found English ingredient, add translation for current language
      await addTranslationToIngredient(
        existingIngredient.id,
        trimmedName,
        currentLanguage
      );
      return existingIngredient;
    }
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
      // Use the translated English form to determine proper singular/plural
      const isTranslatedPlural = pluralize.isPlural(
        translatedToEnglish.toLowerCase()
      );

      let originalSingular, originalPlural;

      if (isTranslatedPlural) {
        // The translated English is plural, so user input was plural
        originalPlural = trimmedName; // Keep user input as plural
        // Derive singular from user input using pluralize on the English translation
        const englishSingular = pluralize.singular(
          translatedToEnglish.toLowerCase()
        );
        // Translate the English singular back to get proper singular form
        try {
          originalSingular = await translateText(
            englishSingular,
            currentLanguage,
            "en"
          );
        } catch {
          originalSingular = trimmedName; // Fallback to user input
        }
      } else {
        // The translated English is singular, so user input was singular
        originalSingular = trimmedName; // Keep user input as singular
        // Derive plural from user input using pluralize on the English translation
        const englishPlural = pluralize.plural(
          translatedToEnglish.toLowerCase()
        );
        // Translate the English plural back to get proper plural form
        try {
          originalPlural = await translateText(
            englishPlural,
            currentLanguage,
            "en"
          );
        } catch {
          // Fallback to simple German pluralization rules
          originalPlural =
            currentLanguage === "de"
              ? trimmedName.endsWith("e")
                ? trimmedName + "n"
                : trimmedName + "e"
              : pluralize.plural(trimmedName);
        }
      }

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

      // Still add the original language using pluralize logic on the fallback English
      const isFallbackPlural = pluralize.isPlural(
        englishSingular.toLowerCase()
      );

      translations = {
        [currentLanguage]: {
          singular_name: isFallbackPlural
            ? pluralize.singular(trimmedName) || trimmedName
            : trimmedName,
          plural_name: isFallbackPlural
            ? trimmedName
            : currentLanguage === "de"
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

  // Determine if the input was plural by checking if it matches the plural form
  const inputWasPlural =
    currentLanguage === "en"
      ? trimmedName.toLowerCase() === englishPlural
      : translations[currentLanguage] &&
        trimmedName.toLowerCase() ===
          translations[currentLanguage].plural_name.toLowerCase();

  return { id: newIngredient.id, isPlural: inputWasPlural };
};

// Fetch all recipes
export const fetchRecipes = async () => {
  const { data, error } = await supabase.from("recipes").select("*");
  if (error) {
    throw error;
  }
  return data || [];
};

// Fetch recipes with pagination
export const fetchRecipesPaginated = async (
  page = 1,
  limit = 12,
  filters = {}
) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("recipes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  if (filters.searchTerm) {
    query = query.ilike("title", `%${filters.searchTerm}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw error;
  }

  return {
    recipes: data || [],
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
    currentPage: page,
    hasNextPage: page < Math.ceil((count || 0) / limit),
    hasPrevPage: page > 1,
  };
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
      `*, 
       recipe_ingredients(id, quantity, unit, ingredients(id, singular_name, plural_name, translated_names), notes, subheading, order_index, is_plural, name_overrides),
       recipe_categories(categoriy_id, categories(name, translated_category))`
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  // Transform ingredients to hierarchical structure grouped by subheading
  const ingredientsList =
    data.recipe_ingredients
      ?.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((item) => {
        return {
          id: item.ingredients.id,
          recipe_ingredient_id: item.id,
          singular_name: item.ingredients.singular_name,
          plural_name: item.ingredients.plural_name,
          translated_names: item.ingredients.translated_names,
          name_overrides: item.name_overrides,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
          subheading: item.subheading,
          order_index: item.order_index,
          is_plural: item.is_plural,
        };
      }) || [];

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
        ingredients: [],
      });
    }

    sectionsMap.get(subheading).ingredients.push(ingredient);
  });

  // Extract categories from the many-to-many relationship
  const categories =
    data.recipe_categories?.map((rc) => rc.categories?.name).filter(Boolean) ||
    [];

  const transformedData = {
    ...data,
    categories: categories, // Array of category names
    ungroupedIngredients: ungroupedIngredients,
    ingredientSections: Array.from(sectionsMap.values()),
    // Keep flat list for backward compatibility
    ingredients: ingredientsList,
  };

  // Remove the nested recipe_ingredients and recipe_categories since they're flattened
  delete transformedData.recipe_ingredients;
  delete transformedData.recipe_categories;

  return transformedData;
};

// Helper function to add recipe to category using many-to-many relationship
const addRecipeToCategory = async (recipeId, categoryName) => {
  if (!categoryName || categoryName === "all") return;

  try {
    // Get category by name
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("name", categoryName.toLowerCase())
      .single();

    if (category) {
      // Try to insert directly - if it fails due to duplicate, that's fine
      const { error } = await supabase.from("recipe_categories").insert({
        recipe_id: recipeId,
        categoriy_id: category.id, // Note: keeping the typo from your schema
      });

      // Ignore duplicate key errors (PGRST09 is unique constraint violation)
      if (
        error &&
        !error.message.includes("duplicate") &&
        !error.code?.includes("23505")
      ) {
        console.warn("Failed to add recipe to category:", error);
      }
    }
  } catch (error) {
    console.warn("Failed to add recipe to category:", error);
    // Don't throw - recipe creation should still succeed
  }
};

// Helper function to create category if it doesn't exist (with translations)
const getOrCreateCategory = async (categoryName, currentLanguage = "en") => {
  if (!categoryName || categoryName === "all") return null;

  const normalizedName = categoryName.toLowerCase();

  try {
    // First try to find existing category
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("id")
      .eq("name", normalizedName)
      .single();

    if (existingCategory) {
      return existingCategory;
    }

    // Category doesn't exist, create it with translations
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Create translations for the category
    let translations = {};

    if (currentLanguage !== "en") {
      // If creating in non-English, translate to English and other languages
      try {
        const translatedToEnglish = await translateText(
          categoryName,
          "en",
          currentLanguage
        );
        translations = {
          en: translatedToEnglish,
          [currentLanguage]: categoryName,
        };
      } catch (error) {
        console.warn("Failed to translate category name:", error);
        translations = { [currentLanguage]: categoryName };
      }
    } else {
      // Creating in English, translate to German
      try {
        const translatedToGerman = await translateText(
          categoryName,
          "de",
          "en"
        );
        translations = {
          en: categoryName,
          de: translatedToGerman,
        };
      } catch (error) {
        console.warn("Failed to translate category to German:", error);
        translations = { en: categoryName };
      }
    }

    const { data: newCategory, error } = await supabase
      .from("categories")
      .insert({
        name: normalizedName,
        is_system: false,
        created_by: user?.id || null,
        translated_category: translations,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create category:", error);
      return null;
    }

    return newCategory;
  } catch (error) {
    console.error("Error in getOrCreateCategory:", error);
    return null;
  }
};

// Create a new recipe
export const createRecipe = async (recipeData) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Create the main recipe record (no category field anymore)
  const cleanRecipeData = Object.fromEntries(
    Object.entries({
      title: recipeData.title,
      servings: recipeData.servings,
      instructions: recipeData.instructions,
      source: recipeData.source,
      user_id: user.id,
      notes: recipeData.notes,
      original_language: recipeData.original_language,
      images: recipeData.images || [],
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
  if (
    recipeData.ungroupedIngredients &&
    recipeData.ungroupedIngredients.length > 0
  ) {
    for (const ingredient of recipeData.ungroupedIngredients) {
      let ingredientId;

      // Determine if the input was plural based on the entered text
      const isPlural = await determineIngredientPlurality(
        ingredient.name,
        recipeData.original_language
      );

      if (ingredient.ingredient_id) {
        ingredientId = ingredient.ingredient_id;
      } else if (ingredient.name) {
        const ingredientResult = await getOrCreateIngredient(
          ingredient.name,
          recipeData.original_language
        );
        ingredientId = ingredientResult.id;
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
        is_plural: isPlural,
      });
    }
  }

  // Handle ingredient sections
  if (
    recipeData.ingredientSections &&
    recipeData.ingredientSections.length > 0
  ) {
    for (const section of recipeData.ingredientSections) {
      for (const ingredient of section.ingredients) {
        let ingredientId;

        // Determine if the input was plural based on the entered text
        const isPlural = await determineIngredientPlurality(
          ingredient.name,
          recipeData.original_language
        );

        if (ingredient.ingredient_id) {
          ingredientId = ingredient.ingredient_id;
        } else if (ingredient.name) {
          const ingredientResult = await getOrCreateIngredient(
            ingredient.name,
            recipeData.original_language
          );
          ingredientId = ingredientResult.id;
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
          is_plural: isPlural,
        });
      }
    }
  }

  // Fallback for backward compatibility
  if (
    recipeIngredientsToInsert.length === 0 &&
    recipeData.ingredients &&
    recipeData.ingredients.length > 0
  ) {
    // Fallback for backward compatibility with flat ingredient list
    for (let i = 0; i < recipeData.ingredients.length; i++) {
      const ingredient = recipeData.ingredients[i];
      let ingredientId;

      // Determine if the input was plural based on the entered text
      const isPlural = await determineIngredientPlurality(
        ingredient.name,
        recipeData.original_language
      );

      if (ingredient.ingredient_id) {
        ingredientId = ingredient.ingredient_id;
      } else if (ingredient.name) {
        const ingredientResult = await getOrCreateIngredient(
          ingredient.name,
          recipeData.original_language
        );
        ingredientId = ingredientResult.id;
        // Note: we use our own determination rather than the one from getOrCreateIngredient
        // because we want to respect what the user actually typed
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
        is_plural: isPlural,
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

  // Handle category assignment using new many-to-many system
  if (recipeData.categories && recipeData.categories.length > 0) {
    for (const categoryName of recipeData.categories) {
      if (categoryName && categoryName !== "all") {
        // First, try to get or create the category
        const category = await getOrCreateCategory(
          categoryName,
          recipeData.original_language || "en"
        );
        if (category) {
          await addRecipeToCategory(recipe.id, categoryName);
        }
      }
    }
  }

  // Upload any local images after creating the recipe
  console.log("Recipe creation - checking images:", {
    hasImages: !!recipeData.images,
    imageCount: recipeData.images?.length,
  });

  if (recipeData.images && recipeData.images.length > 0) {
    console.log("Found images to process:", recipeData.images);
    try {
      const uploadedImages = await uploadLocalImages(
        recipeData.images,
        recipe.id
      );

      // Update the recipe with the uploaded images
      const { error: updateError } = await supabase
        .from("recipes")
        .update({ images: uploadedImages })
        .eq("id", recipe.id);

      if (updateError) {
        console.error("Failed to update recipe with images:", updateError);
      } else {
        recipe.images = uploadedImages;
        console.log("Recipe updated with images successfully");
      }
    } catch (error) {
      console.error("Failed to upload images:", error);
      // Don't fail the recipe creation if image upload fails
    }
  } else {
    console.log("No images to upload for recipe");
  }

  return recipe;
};

// Update an existing recipe
export const updateRecipe = async (id, recipeData) => {
  // First fetch the original recipe for smart translation updates and image cleanup
  const { data: originalRecipe, error: fetchError } = await supabase
    .from("recipes")
    .select("title, instructions, notes, source, images")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch original recipe: ${fetchError.message}`);
  }

  console.log("=== FETCHED ORIGINAL RECIPE ===");
  console.log("Recipe ID:", id);
  console.log("Original recipe data:", originalRecipe);
  console.log("Original recipe images field:", originalRecipe.images);
  console.log("Images type:", typeof originalRecipe.images);
  console.log("Images length:", originalRecipe.images?.length);
  console.log("=== END FETCH DEBUG ===");

  const cleanRecipeData = Object.fromEntries(
    Object.entries({
      title: recipeData.title,
      servings: recipeData.servings,
      instructions: recipeData.instructions,
      source: recipeData.source,
      notes: recipeData.notes,
      images: recipeData.images,
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
  if (
    recipeData.ungroupedIngredients &&
    recipeData.ungroupedIngredients.length > 0
  ) {
    for (const ingredient of recipeData.ungroupedIngredients) {
      let ingredientId;
      let existingRecipe = null;

      if (ingredient.ingredient_id) {
        ingredientId = ingredient.ingredient_id;
        // Still need to get the recipe language for plurality determination
        const { data: recipe } = await supabase
          .from("recipes")
          .select("original_language")
          .eq("id", id)
          .single();
        existingRecipe = recipe;
      } else if (ingredient.name) {
        // For updates, get the original language from the existing recipe
        const { data: recipe } = await supabase
          .from("recipes")
          .select("original_language")
          .eq("id", id)
          .single();
        existingRecipe = recipe;
        const ingredientResult = await getOrCreateIngredient(
          ingredient.name,
          existingRecipe?.original_language || "en"
        );
        ingredientId = ingredientResult.id;
      } else {
        throw new Error("Ingredient must have either ingredient_id or name");
      }

      // Determine if the input was plural based on the entered text
      const isPlural = await determineIngredientPlurality(
        ingredient.name,
        existingRecipe?.original_language || "en"
      );

      recipeIngredientsToInsert.push({
        recipe_id: id,
        ingredient_id: ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
        subheading: null, // Ungrouped ingredients have no subheading
        order_index: globalOrderIndex++,
        is_plural: isPlural,
      });
    }
  }

  // Handle ingredient sections
  if (
    recipeData.ingredientSections &&
    recipeData.ingredientSections.length > 0
  ) {
    for (const section of recipeData.ingredientSections) {
      for (const ingredient of section.ingredients) {
        let ingredientId;
        let existingRecipe = null;

        // Handle both cases: ingredient_id provided OR name provided
        if (ingredient.ingredient_id) {
          ingredientId = ingredient.ingredient_id;
          // Still need to get the recipe language for plurality determination
          const { data: recipe } = await supabase
            .from("recipes")
            .select("original_language")
            .eq("id", id)
            .single();
          existingRecipe = recipe;
        } else if (ingredient.name) {
          // For updates, get the original language from the existing recipe
          const { data: recipe } = await supabase
            .from("recipes")
            .select("original_language")
            .eq("id", id)
            .single();
          existingRecipe = recipe;
          const ingredientResult = await getOrCreateIngredient(
            ingredient.name,
            existingRecipe?.original_language || "en"
          );
          ingredientId = ingredientResult.id;
        } else {
          throw new Error("Ingredient must have either ingredient_id or name");
        }

        // Determine if the input was plural based on the entered text
        const isPlural = await determineIngredientPlurality(
          ingredient.name,
          existingRecipe?.original_language || "en"
        );

        recipeIngredientsToInsert.push({
          recipe_id: id,
          ingredient_id: ingredientId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          notes: ingredient.notes,
          subheading: section.subheading || null,
          order_index: globalOrderIndex++,
          is_plural: isPlural,
        });
      }
    }
  }

  // Fallback for backward compatibility with flat ingredient list
  if (
    recipeIngredientsToInsert.length === 0 &&
    recipeData.ingredients &&
    recipeData.ingredients.length > 0
  ) {
    // Fallback for backward compatibility with flat ingredient list
    for (let i = 0; i < recipeData.ingredients.length; i++) {
      const ingredient = recipeData.ingredients[i];
      let ingredientId;
      let existingRecipe = null;

      // Handle both cases: ingredient_id provided OR name provided
      if (ingredient.ingredient_id) {
        ingredientId = ingredient.ingredient_id;
        // Still need to get the recipe language for plurality determination
        const { data: recipe } = await supabase
          .from("recipes")
          .select("original_language")
          .eq("id", id)
          .single();
        existingRecipe = recipe;
      } else if (ingredient.name) {
        // For updates, get the original language from the existing recipe
        const { data: recipe } = await supabase
          .from("recipes")
          .select("original_language")
          .eq("id", id)
          .single();
        existingRecipe = recipe;
        const ingredientResult = await getOrCreateIngredient(
          ingredient.name,
          existingRecipe?.original_language || "en"
        );
        ingredientId = ingredientResult.id;
      } else {
        throw new Error("Ingredient must have either ingredient_id or name");
      }

      // Determine if the input was plural based on the entered text
      const isPlural = await determineIngredientPlurality(
        ingredient.name,
        existingRecipe?.original_language || "en"
      );

      recipeIngredientsToInsert.push({
        recipe_id: id,
        ingredient_id: ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
        subheading: ingredient.subheading || null,
        order_index: i,
        is_plural: isPlural,
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

  // Handle category updates using new many-to-many system
  if (recipeData.categories !== undefined) {
    // Remove all existing category relationships
    await supabase.from("recipe_categories").delete().eq("recipe_id", id);

    // Add new categories if provided
    if (recipeData.categories && recipeData.categories.length > 0) {
      // Get the recipe's original language for translation
      const { data: recipeLanguage } = await supabase
        .from("recipes")
        .select("original_language")
        .eq("id", id)
        .single();

      for (const categoryName of recipeData.categories) {
        if (categoryName && categoryName !== "all") {
          const category = await getOrCreateCategory(
            categoryName,
            recipeLanguage?.original_language || "en"
          );
          if (category) {
            await addRecipeToCategory(id, categoryName);
          }
        }
      }
    }
  }

  // Handle image cleanup and upload after updating the recipe
  if (recipeData.images !== undefined) {
    try {
      // Clean up orphaned images first
      if (originalRecipe.images && originalRecipe.images.length > 0) {
        await cleanupOrphanedImages(
          originalRecipe.images,
          recipeData.images || []
        );
      }

      // Upload any local images if there are images to process
      if (recipeData.images && recipeData.images.length > 0) {
        const uploadedImages = await uploadLocalImages(recipeData.images, id);

        // Update the recipe with the uploaded images
        const { error: updateError } = await supabase
          .from("recipes")
          .update({ images: uploadedImages })
          .eq("id", id);

        if (updateError) {
          console.error("Failed to update recipe with images:", updateError);
        } else {
          recipe.images = uploadedImages;
        }
      } else {
        // No images left - clear the images field
        const { error: updateError } = await supabase
          .from("recipes")
          .update({ images: [] })
          .eq("id", id);

        if (updateError) {
          console.error("Failed to clear recipe images:", updateError);
        } else {
          recipe.images = [];
        }
      }
    } catch (error) {
      console.error("Failed to process images:", error);
      // Don't fail the recipe update if image processing fails
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
