import supabase from "../lib/supabase";
import { translateText } from "./recipeTranslationService";

// Escape % and _ so a typed name isn't read as an ILIKE wildcard
const escapeForIlike = (value) => value.replace(/[%_]/g, "\\$&");

// Fetch the current user's categories, ordered for display
export const fetchCategories = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("display_order");

  if (error) {
    throw new Error(`Error fetching categories: ${error.message}`);
  }

  return data || [];
};

// Get categories formatted for use in components (with translated labels)
export const getCategoriesForUI = async (currentLanguage = "en") => {
  const categories = await fetchCategories();

  // Always include "all_recipes" as the first option
  const formattedCategories = [
    {
      value: "all_recipes",
      label: currentLanguage === "de" ? "Alle Rezepte" : "All Recipes",
      isSystem: true,
    },
  ];

  // Add database categories
  categories.forEach((category) => {
    // `name` is already the properly-cased original text; override it
    // only when a translation exists for the current language
    let label = category.name;

    if (
      category.translated_category &&
      category.translated_category[currentLanguage]
    ) {
      label = category.translated_category[currentLanguage];
    }

    formattedCategories.push({
      value: category.name,
      label: label,
      id: category.id,
      order: category.display_order,
    });
  });

  return formattedCategories;
};

// Get categories formatted for the Settings management UI
export const getCategoriesForManagement = async (currentLanguage = "en") => {
  const categories = await fetchCategories();

  return categories.map((category) => {
    let label = category.name;

    if (
      category.translated_category &&
      category.translated_category[currentLanguage]
    ) {
      label = category.translated_category[currentLanguage];
    }

    return {
      id: category.id,
      value: category.name,
      label,
      order: category.display_order,
    };
  });
};

// Create a new category with translation
export const createCategory = async (name, translations = {}) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const trimmedName = name.trim();

  // Check if category already exists (handle RLS by ignoring errors)
  try {
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", escapeForIlike(trimmedName))
      .eq("user_id", user.id)
      .single();

    if (existingCategory) {
      throw new Error("A category with this name already exists");
    }
  } catch (error) {
    // If we get a 406 or RLS error, assume category doesn't exist and continue
    if (!error.message.includes("already exists")) {
      console.warn(
        "Could not check category existence due to RLS, proceeding with creation"
      );
    } else {
      throw error;
    }
  }

  // translated_category only ever stores the non-original language
  let translatedCategory = null;
  const sourceLanguage =
    Object.keys(translations).length > 0 ? Object.keys(translations)[0] : "en";

  if (Object.keys(translations).length > 0) {
    const sourceText = translations[sourceLanguage];
    const targetLanguage = sourceLanguage === "en" ? "de" : "en";

    try {
      const translatedName = await translateText(
        sourceText,
        targetLanguage,
        "Food category"
      );
      // An unchanged result means translateText silently failed and fell
      // back to the original text - don't store that as a "translation"
      if (
        translatedName &&
        translatedName.trim().toLowerCase() !== sourceText.trim().toLowerCase()
      ) {
        translatedCategory = { [targetLanguage]: translatedName };
      }
    } catch (error) {
      console.warn("Failed to translate category name:", error);
    }
  }

  const categoryData = {
    name: trimmedName,
    user_id: user.id,
    original_language: sourceLanguage,
    translated_category: translatedCategory,
  };

  const { data, error } = await supabase
    .from("categories")
    .insert([categoryData])
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating category: ${error.message}`);
  }

  return data;
};

// Update category translations
export const updateCategoryTranslations = async (categoryId, translations) => {
  const { data, error } = await supabase
    .from("categories")
    .update({ translated_category: translations })
    .eq("id", categoryId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating category translations: ${error.message}`);
  }

  return data;
};

// Update category name and translations (only user-created categories)
export const updateCategoryName = async (
  categoryId,
  newName,
  newTranslations = {}
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Check if category exists and user can edit it
  const { data: category } = await supabase
    .from("categories")
    .select("user_id, name")
    .eq("id", categoryId)
    .single();

  if (!category) {
    throw new Error("Category not found");
  }

  if (category.user_id !== user.id) {
    throw new Error("You can only rename categories you created");
  }

  const trimmedName = newName.trim();

  // Check if new name already exists (if name is changing)
  if (trimmedName.toLowerCase() !== category.name.toLowerCase()) {
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", escapeForIlike(trimmedName))
      .eq("user_id", user.id)
      .single();

    if (existingCategory) {
      throw new Error("A category with this name already exists");
    }
  }

  // The rename's language becomes the new original; old translations are
  // stale, so start fresh instead of merging with what was there before
  let translatedCategory = null;
  const sourceLanguage =
    Object.keys(newTranslations).length > 0
      ? Object.keys(newTranslations)[0]
      : "en";

  if (Object.keys(newTranslations).length > 0) {
    const sourceText = newTranslations[sourceLanguage];
    const targetLanguage = sourceLanguage === "en" ? "de" : "en";

    try {
      const translatedName = await translateText(
        sourceText,
        targetLanguage,
        "Food category"
      );
      // An unchanged result means translateText silently failed and fell
      // back to the original text - don't store that as a "translation"
      if (
        translatedName &&
        translatedName.trim().toLowerCase() !== sourceText.trim().toLowerCase()
      ) {
        translatedCategory = { [targetLanguage]: translatedName };
      }
    } catch (error) {
      console.warn("Failed to translate category name:", error);
    }
  }

  const updateData = {
    name: trimmedName,
    original_language: sourceLanguage,
    translated_category: translatedCategory,
  };

  const { data, error } = await supabase
    .from("categories")
    .update(updateData)
    .eq("id", categoryId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating category: ${error.message}`);
  }

  return data;
};

// Delete a category (only by its creator)
export const deleteCategory = async (categoryId) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Check if category exists and user can delete it
  const { data: category } = await supabase
    .from("categories")
    .select("user_id")
    .eq("id", categoryId)
    .single();

  if (!category) {
    throw new Error("Category not found");
  }

  if (category.user_id !== user.id) {
    throw new Error("You can only delete categories you created");
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    throw new Error(`Error deleting category: ${error.message}`);
  }

  return true;
};

// Persist display order for a set of categories (id -> order)
export const saveCategoryOrder = async (orderedCategoryIds) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  await Promise.all(
    orderedCategoryIds.map((categoryId, index) =>
      supabase
        .from("categories")
        .update({ display_order: index })
        .eq("id", categoryId)
        .eq("user_id", user.id)
    )
  );
};

// Add recipe to category (for many-to-many relationship)
export const addRecipeToCategory = async (recipeId, categoryName) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get category by name
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("name", categoryName)
    .eq("user_id", user?.id)
    .single();

  if (!category) {
    throw new Error(`Category '${categoryName}' not found`);
  }

  // Check if relationship already exists
  const { data: existing } = await supabase
    .from("recipe_categories")
    .select("id")
    .eq("recipe_id", recipeId)
    .eq("categoriy_id", category.id) // Note: keeping the typo from your schema
    .single();

  if (existing) {
    return existing; // Already exists
  }

  // Create the relationship
  const { data, error } = await supabase
    .from("recipe_categories")
    .insert({
      recipe_id: recipeId,
      categoriy_id: category.id, // Note: keeping the typo from your schema
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error adding recipe to category: ${error.message}`);
  }

  return data;
};

// Remove recipe from category
export const removeRecipeFromCategory = async (recipeId, categoryName) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get category by name
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("name", categoryName)
    .eq("user_id", user?.id)
    .single();

  if (!category) {
    throw new Error(`Category '${categoryName}' not found`);
  }

  const { error } = await supabase
    .from("recipe_categories")
    .delete()
    .eq("recipe_id", recipeId)
    .eq("categoriy_id", category.id); // Note: keeping the typo from your schema

  if (error) {
    throw new Error(`Error removing recipe from category: ${error.message}`);
  }

  return true;
};

// Get recipes by category
export const getRecipesByCategory = async (
  categoryName,
  page = 1,
  limit = 12
) => {
  if (categoryName === "all_recipes") {
    // Return all recipes
    return await supabase
      .from("recipes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get category
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("name", categoryName)
    .eq("user_id", user?.id)
    .single();

  if (!category) {
    throw new Error(`Category '${categoryName}' not found`);
  }

  // Get recipes through the many-to-many relationship
  const { data, error, count } = await supabase
    .from("recipe_categories")
    .select(
      `
      recipes (*)
    `,
      { count: "exact" }
    )
    .eq("categoriy_id", category.id) // Note: keeping the typo from your schema
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    throw new Error(`Error fetching recipes by category: ${error.message}`);
  }

  return {
    data: data?.map((item) => item.recipes) || [],
    count,
  };
};
