import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import supabase from "../../lib/supabase";
import { getTranslatedRecipeTitle } from "../../services/translationService";

// Fetch all recipes using client-side pagination and filtering
export const useRecipesPagination = (
  page = 1,
  limit = 12,
  category = "all",
  searchTerm = "",
  sortBy = "created_at_desc"
) => {
  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  // Fetch recipes with category information
  const fetchRecipesWithCategories = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Build query with user filtering
      let query = supabase
        .from("recipes")
        .select(
          `
          *,
          recipe_categories (
            categoriy_id,
            categories (
              name,
              translated_category
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      // Apply user filtering
      if (user) {
        // Logged in: only show user's own recipes
        query = query.eq("user_id", user.id);
      } else {
        // Not logged in: show default recipes
        query = query.eq("user_id", import.meta.env.VITE_DEFAULT_USER_ID);
      }

      const { data: recipes, error } = await query;

      if (error) throw error;

      // Transform the data to include category names
      return recipes.map((recipe) => ({
        ...recipe,
        categories:
          recipe.recipe_categories?.map((rc) => rc.categories?.name) || [],
      }));
    } catch (error) {
      console.error("Error fetching recipes with categories:", error);
      return [];
    }
  };

  const loadRecipes = useCallback(async () => {
    try {
      const data = await fetchRecipesWithCategories();

      // Translate only recipe titles for the current language
      const currentLanguage = i18n.language.split("-")[0]; // Normalize region codes
      const translatedRecipes = await Promise.all(
        data.map((recipe) => getTranslatedRecipeTitle(recipe, currentLanguage))
      );
      setAllRecipes(translatedRecipes);
    } catch (err) {
      console.error("Error: ", err);
      setAllRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  const refreshRecipes = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const data = await fetchRecipesWithCategories();

        // Translate only recipe titles for the current language
        const currentLanguage = i18n.language.split("-")[0]; // Normalize region codes
        const translatedRecipes = await Promise.all(
          data.map((recipe) =>
            getTranslatedRecipeTitle(recipe, currentLanguage)
          )
        );
        setAllRecipes(translatedRecipes);
      } catch (err) {
        console.error("Error refreshing: ", err);
        setAllRecipes([]);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [i18n.language]
  );

  useEffect(() => {
    loadRecipes();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // Reload recipes when user signs in or out to ensure proper access
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        loadRecipes();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadRecipes]);

  // Client-side filtering, sorting and pagination
  const paginatedData = useMemo(() => {
    // First filter by search term if it exists
    const searchFilteredRecipes = searchTerm
      ? allRecipes.filter((recipe) =>
          recipe.title?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allRecipes;

    // Then filter by category (only if not searching or if all recipes are selected)
    const filteredRecipes = searchTerm
      ? searchFilteredRecipes // When searching, show all search results regardless of category
      : category === "all"
        ? allRecipes
        : allRecipes.filter(
            (r) => r.categories && r.categories.includes(category)
          );

    // Then sort the filtered results
    const sortedRecipes = [...filteredRecipes].sort((a, b) => {
      switch (sortBy) {
        case "title_asc":
          return (a.title || "").localeCompare(b.title || "");
        case "title_desc":
          return (b.title || "").localeCompare(a.title || "");
        case "created_at_asc":
          return new Date(a.created_at) - new Date(b.created_at);
        case "created_at_desc":
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    // Then paginate the sorted results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecipes = sortedRecipes.slice(startIndex, endIndex);

    return {
      recipes: paginatedRecipes,
      totalCount: sortedRecipes.length,
      totalPages: Math.ceil(sortedRecipes.length / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil(sortedRecipes.length / limit),
      hasPrevPage: page > 1,
    };
  }, [allRecipes, page, limit, category, searchTerm, sortBy]);

  return {
    recipes: paginatedData.recipes,
    loading,
    refreshRecipes,
    totalRecipeCount: allRecipes.length,
    paginationInfo: {
      totalCount: paginatedData.totalCount,
      totalPages: paginatedData.totalPages,
      currentPage: paginatedData.currentPage,
      hasNextPage: paginatedData.hasNextPage,
      hasPrevPage: paginatedData.hasPrevPage,
    },
  };
};
