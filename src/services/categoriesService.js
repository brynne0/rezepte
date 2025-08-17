import supabase from "../lib/supabase";

// Fetch all categories with their translations
export const fetchCategories = async () => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    throw new Error(`Error fetching categories: ${error.message}`);
  }

  return data || [];
};

// Get categories formatted for use in components (with translated labels)
export const getCategoriesForUI = async (currentLanguage = "en") => {
  const categories = await fetchCategories();

  // Always include "all" as the first option
  const formattedCategories = [
    {
      value: "all",
      label: currentLanguage === "de" ? "Alle Rezepte" : "All Recipes",
      isSystem: true,
    },
  ];

  // Add database categories
  categories.forEach((category) => {
    let label = category.name;

    // Use translation if available for the current language
    if (
      category.translated_category &&
      category.translated_category[currentLanguage]
    ) {
      label = category.translated_category[currentLanguage];
    }

    formattedCategories.push({
      value: category.name,
      label: label,
      isSystem: category.is_system || false,
      id: category.id,
    });
  });

  return formattedCategories;
};

// Create a new category with translation
export const createCategory = async (name, translations = {}) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Check if category already exists
  const { data: existingCategory } = await supabase
    .from("categories")
    .select("id")
    .eq("name", name.toLowerCase())
    .single();

  if (existingCategory) {
    throw new Error("A category with this name already exists");
  }

  const categoryData = {
    name: name.toLowerCase(),
    is_system: false,
    created_by: user.id,
    translated_category:
      Object.keys(translations).length > 0 ? translations : null,
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

// Delete a category (only non-system categories by their creators)
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
    .select("is_system, created_by")
    .eq("id", categoryId)
    .single();

  if (!category) {
    throw new Error("Category not found");
  }

  if (category.is_system) {
    throw new Error("Cannot delete system categories");
  }

  if (category.created_by !== user.id) {
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

// Add recipe to category (for many-to-many relationship)
export const addRecipeToCategory = async (recipeId, categoryName) => {
  // Get category by name
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("name", categoryName)
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
  // Get category by name
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("name", categoryName)
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
  if (categoryName === "all") {
    // Return all recipes
    return await supabase
      .from("recipes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
  }

  // Get category
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("name", categoryName)
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
