import supabase from "../lib/supabase";

// Get user's category preferences (visibility and order)
export const getUserCategoryPreferences = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("user_category_preferences")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    throw new Error(`Error fetching category preferences: ${error.message}`);
  }

  return data || [];
};

// Save user's category preferences
export const saveUserCategoryPreferences = async (preferences) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Delete existing preferences
  await supabase
    .from("user_category_preferences")
    .delete()
    .eq("user_id", user.id);

  // Insert new preferences
  const preferencesToInsert = preferences.map((pref) => ({
    user_id: user.id,
    category_id: pref.id,
    category_value: pref.value,
    is_visible: pref.isVisible,
    display_order: pref.order,
  }));

  const { data, error } = await supabase
    .from("user_category_preferences")
    .insert(preferencesToInsert)
    .select();

  if (error) {
    throw new Error(`Error saving category preferences: ${error.message}`);
  }

  return data;
};

// Get categories with user preferences applied
export const getCategoriesWithPreferences = async (currentLanguage = "en") => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Always include "all_recipes" as the first option
  const formattedCategories = [
    {
      value: "all_recipes",
      label: currentLanguage === "de" ? "Alle Rezepte" : "All Recipes",
      isSystem: true,
    },
  ];

  if (!user) {
    // Not logged in - show system categories alphabetically
    const { data: systemCategories, error } = await supabase
      .from("categories")
      .select("id, name, is_system, translated_category")
      .eq("is_system", true)
      .order("name");

    if (error) {
      console.warn(
        "Could not fetch system categories for logged-out user:",
        error
      );
      return formattedCategories;
    }

    if (systemCategories && systemCategories.length > 0) {
      systemCategories.forEach((category) => {
        let label =
          category.name.charAt(0).toUpperCase() + category.name.slice(1);

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
          isVisible: true,
          order: formattedCategories.length,
        });
      });
    }

    return formattedCategories;
  }

  // Get user's preferred categories by joining preferences with categories
  let { data: userCategories, error } = await supabase
    .from("user_category_preferences")
    .select(
      `
      *,
      categories (
        id,
        name,
        is_system,
        translated_category
      )
    `
    )
    .eq("user_id", user.id)
    .eq("is_visible", true)
    .order("display_order");

  if (error) {
    throw new Error(`Error fetching user categories: ${error.message}`);
  }

  // If user has no preferences, create defaults and retry
  if (!userCategories || userCategories.length === 0) {
    await createDefaultCategoryPreferences(user.id);

    // Retry fetching after creating defaults
    const { data: newUserCategories } = await supabase
      .from("user_category_preferences")
      .select(
        `
        *,
        categories (
          id,
          name,
          is_system,
          translated_category
        )
      `
      )
      .eq("user_id", user.id)
      .eq("is_visible", true)
      .order("display_order");

    userCategories = newUserCategories || [];
  }

  // Process user's preferred categories
  const categoriesWithPrefs = [];
  if (userCategories) {
    userCategories.forEach((pref) => {
      const category = pref.categories;
      if (!category) return;

      let label =
        category.name.charAt(0).toUpperCase() + category.name.slice(1);

      // Use translation if available for the current language
      if (
        category.translated_category &&
        category.translated_category[currentLanguage]
      ) {
        label = category.translated_category[currentLanguage];
      }

      categoriesWithPrefs.push({
        value: category.name,
        label: label,
        isSystem: category.is_system || false,
        id: category.id,
        isVisible: true,
        order: pref.display_order,
      });
    });
  }

  // Sort by user-defined order, then by label
  categoriesWithPrefs.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.label.localeCompare(b.label);
  });

  return [...formattedCategories, ...categoriesWithPrefs];
};

// Create default category preferences for new users
const createDefaultCategoryPreferences = async (userId) => {
  // Get all system categories
  const { data: systemCategories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, is_system, translated_category")
    .eq("is_system", true)
    .order("name");

  if (categoriesError) {
    throw new Error(
      `Error fetching system categories: ${categoriesError.message}`
    );
  }

  if (!systemCategories || systemCategories.length === 0) {
    return; // No system categories to create preferences for
  }

  // Create preferences for all system categories in alphabetical order
  const defaultPreferences = systemCategories.map((category, index) => ({
    user_id: userId,
    category_id: category.id,
    category_value: category.name,
    is_visible: true,
    display_order: index,
  }));

  // Insert default preferences
  const { error: insertError } = await supabase
    .from("user_category_preferences")
    .insert(defaultPreferences);

  if (insertError) {
    throw new Error(
      `Error creating default category preferences: ${insertError.message}`
    );
  }
};

// Get all categories for management (includes hidden ones)
export const getAllCategoriesForManagement = async (currentLanguage = "en") => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Get user's categories by joining preferences with categories
  let { data: userCategories, error } = await supabase
    .from("user_category_preferences")
    .select(
      `
      *,
      categories (
        id,
        name,
        is_system,
        translated_category
      )
    `
    )
    .eq("user_id", user.id)
    .order("display_order");

  if (error) {
    throw new Error(
      `Error fetching user categories for management: ${error.message}`
    );
  }

  // If user has no preferences, create default preferences from system categories
  if (!userCategories || userCategories.length === 0) {
    await createDefaultCategoryPreferences(user.id);

    // Retry fetching after creating defaults
    const { data: newUserCategories } = await supabase
      .from("user_category_preferences")
      .select(
        `
        *,
        categories (
          id,
          name,
          is_system,
          translated_category
        )
      `
      )
      .eq("user_id", user.id)
      .order("display_order");

    userCategories = newUserCategories || [];
  }

  // Process user's categories (including hidden ones for management)
  const categoriesWithPrefs = [];

  if (userCategories) {
    userCategories.forEach((pref) => {
      const category = pref.categories;
      if (!category) return;

      let label =
        category.name.charAt(0).toUpperCase() + category.name.slice(1);

      // Use translation if available for the current language
      if (
        category.translated_category &&
        category.translated_category[currentLanguage]
      ) {
        label = category.translated_category[currentLanguage];
      }

      categoriesWithPrefs.push({
        value: category.name,
        label: label,
        isSystem: category.is_system || false,
        id: category.id,
        isVisible: pref.is_visible,
        order: pref.display_order,
      });
    });
  }

  // Sort by user-defined order, then by label
  categoriesWithPrefs.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.label.localeCompare(b.label);
  });

  // Return ALL user categories (including hidden) for management
  return categoriesWithPrefs;
};
