import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabase from "../../lib/supabase";
import { getTranslatedRecipeTitle } from "../../services/recipeTranslationService";
import { useAuth } from "./useAuth";

// Fetch recipes with category information for the given user
export const fetchRecipesWithCategories = async (userId) => {
  if (!userId) return [];

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
      ),
      recipe_ingredients!recipe_ingredients_recipe_id_fkey(id)
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Transform the data to include category names and ingredient flag
  return recipes.map((recipe) => ({
    ...recipe,
    categories:
      recipe.recipe_categories?.map((rc) => rc.categories?.name) || [],
    hasIngredients: recipe.recipe_ingredients?.length > 0,
  }));
};

// Fetch all recipes using client-side pagination and filtering
export const useRecipesPagination = (
  page = 1,
  limit = 12,
  category = "all_recipes",
  searchTerm = "",
  sortBy = "created_at_desc",
  enabled = true
) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language.split("-")[0]; // Normalize region codes
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const {
    data: allRecipes = [],
    isLoading: loading,
    isFetching: isFetchingRecipes,
  } = useQuery({
    queryKey: ["recipes", userId, currentLanguage],
    queryFn: async () => {
      const data = await fetchRecipesWithCategories(userId);
      return Promise.all(
        data.map((recipe) => getTranslatedRecipeTitle(recipe, currentLanguage))
      );
    },
    enabled: enabled && !!userId,
  });

  const refreshRecipes = () =>
    queryClient.invalidateQueries({ queryKey: ["recipes"] });

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
      : category === "all_recipes"
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
        case "last_viewed_at_asc":
          return new Date(a.last_viewed_at) - new Date(b.last_viewed_at);
        case "last_viewed_at_desc":
        default:
          return new Date(b.last_viewed_at) - new Date(a.last_viewed_at);
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
    isFetchingRecipes,
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
