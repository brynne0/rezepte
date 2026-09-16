import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import supabase from "../../lib/supabase";
import { getTranslatedRecipeTitle } from "../../services/recipeTranslationService";
import { filterSortPaginateRecipes } from "../../utils/recipeListFiltering";
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
  limit,
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
  const paginatedData = useMemo(
    () =>
      filterSortPaginateRecipes({
        recipes: allRecipes,
        searchTerm,
        category,
        sortBy,
        page,
        limit,
      }),
    [allRecipes, page, limit, category, searchTerm, sortBy]
  );

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
