import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import supabase from "../../lib/supabase";
import { getTranslatedRecipeTitle } from "../../services/translationService";

// Fetch all recipes using client-side pagination and filtering
export const useRecipesPagination = (
  page = 1,
  limit = 12,
  category = "all",
  searchTerm = ""
) => {
  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  // Fetch recipes with category information
  const fetchRecipesWithCategories = async () => {
    try {
      // Get all recipes
      const { data: recipes, error } = await supabase
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
      const currentLanguage = i18n.language;
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
        const currentLanguage = i18n.language;
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setAllRecipes([]);
        setLoading(false);
      } else if (event === "SIGNED_IN") {
        loadRecipes();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadRecipes]);

  // Client-side filtering and pagination
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

    // Then paginate the filtered results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecipes = filteredRecipes.slice(startIndex, endIndex);

    return {
      recipes: paginatedRecipes,
      totalCount: filteredRecipes.length,
      totalPages: Math.ceil(filteredRecipes.length / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil(filteredRecipes.length / limit),
      hasPrevPage: page > 1,
    };
  }, [allRecipes, page, limit, category, searchTerm]);

  return {
    recipes: paginatedData.recipes,
    loading,
    refreshRecipes,
    paginationInfo: {
      totalCount: paginatedData.totalCount,
      totalPages: paginatedData.totalPages,
      currentPage: paginatedData.currentPage,
      hasNextPage: paginatedData.hasNextPage,
      hasPrevPage: paginatedData.hasPrevPage,
    },
  };
};
