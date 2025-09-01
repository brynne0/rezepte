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

  // Get all categories
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (categoriesError) {
    throw new Error(`Error fetching categories: ${categoriesError.message}`);
  }

  let userPreferences = [];
  if (user) {
    // Get user preferences if logged in
    const { data: prefs } = await supabase
      .from("user_category_preferences")
      .select("*")
      .eq("user_id", user.id);

    userPreferences = prefs || [];
  }

  // Always include "all" as the first option
  const formattedCategories = [
    {
      value: "all",
      label: currentLanguage === "de" ? "Alle Rezepte" : "All Recipes",
      isSystem: true,
    },
  ];

  // Process database categories with preferences
  const categoriesWithPrefs = categories.map((category) => {
    let label = category.name;

    // Use translation if available for the current language
    if (
      category.translated_category &&
      category.translated_category[currentLanguage]
    ) {
      label = category.translated_category[currentLanguage];
    }

    // Find user preference for this category
    const userPref = userPreferences.find(
      (pref) =>
        pref.category_id === category.id ||
        pref.category_value === category.name
    );

    return {
      value: category.name,
      label: label,
      isSystem: category.is_system || false,
      id: category.id,
      isVisible: userPref ? userPref.is_visible : true,
      order: userPref ? userPref.display_order : 999,
    };
  });

  // Sort by user-defined order, then by default order
  categoriesWithPrefs.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.label.localeCompare(b.label);
  });

  // Add only visible categories to the result
  categoriesWithPrefs
    .filter((cat) => cat.isVisible)
    .forEach((cat) => formattedCategories.push(cat));

  return formattedCategories;
};

// Get all categories for management (includes hidden ones)
export const getAllCategoriesForManagement = async (currentLanguage = "en") => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get all categories
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (categoriesError) {
    throw new Error(`Error fetching categories: ${categoriesError.message}`);
  }

  let userPreferences = [];
  if (user) {
    // Get user preferences if logged in
    const { data: prefs } = await supabase
      .from("user_category_preferences")
      .select("*")
      .eq("user_id", user.id);

    userPreferences = prefs || [];
  }

  // Process all categories (including hidden ones) with preferences
  const categoriesWithPrefs = categories.map((category) => {
    let label = category.name;

    // Use translation if available for the current language
    if (
      category.translated_category &&
      category.translated_category[currentLanguage]
    ) {
      label = category.translated_category[currentLanguage];
    }

    // Find user preference for this category
    const userPref = userPreferences.find(
      (pref) =>
        pref.category_id === category.id ||
        pref.category_value === category.name
    );

    return {
      value: category.name,
      label: label,
      isSystem: category.is_system || false,
      id: category.id,
      isVisible: userPref ? userPref.is_visible : true,
      order: userPref ? userPref.display_order : 999,
    };
  });

  // Sort by user-defined order, then by default order
  categoriesWithPrefs.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.label.localeCompare(b.label);
  });

  // Return ALL categories (including hidden) for management
  return categoriesWithPrefs;
};
