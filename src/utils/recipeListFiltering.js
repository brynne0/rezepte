import { getIngredientNamesForLanguage } from "./ingredientFormatting";

// Ingredient name fields needed for search
export const RECIPE_INGREDIENT_NAMES_SELECT = `recipe_ingredients!recipe_ingredients_recipe_id_fkey(
  id,
  name_overrides,
  ingredients(singular_name, plural_name, translated_names)
)`;

// Ingredient names in the given language, lowercased
export const getSearchableIngredientNames = (
  recipeIngredients = [],
  language = "en"
) => {
  const names = new Set();
  const add = (name) => {
    if (typeof name === "string" && name.trim()) {
      names.add(name.toLowerCase().trim());
    }
  };

  for (const ri of recipeIngredients) {
    add(ri.name_overrides?.[language]);
    if (ri.ingredients) {
      const { singular_name, plural_name } = getIngredientNamesForLanguage(
        ri,
        language
      );
      add(singular_name);
      add(plural_name);
    }
  }

  return [...names];
};

const recipeMatchesTerm = (recipe, term, language) =>
  recipe.title?.toLowerCase().includes(term) ||
  getSearchableIngredientNames(recipe.recipe_ingredients, language).some(
    (name) => name.includes(term)
  );

// Shared filter/sort/paginate logic for recipe lists
export const filterSortPaginateRecipes = ({
  recipes,
  searchTerm,
  language = "en",
  category,
  sortBy,
  page,
  limit,
}) => {
  const term = searchTerm?.toLowerCase().trim();

  const searchFilteredRecipes = term
    ? recipes.filter((recipe) => recipeMatchesTerm(recipe, term, language))
    : recipes;

  // When searching, show all search results regardless of category
  const filteredRecipes =
    term || category === "all_recipes"
      ? searchFilteredRecipes
      : searchFilteredRecipes.filter(
          (r) => r.categories && r.categories.includes(category)
        );

  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    switch (sortBy) {
      case "title_asc":
        return (a.title || "").localeCompare(b.title || "");
      case "title_desc":
        return (b.title || "").localeCompare(a.title || "");
      case "last_viewed_at_asc": {
        const aTime = a.last_viewed_at ? new Date(a.last_viewed_at) : 0;
        const bTime = b.last_viewed_at ? new Date(b.last_viewed_at) : 0;
        return aTime - bTime;
      }
      case "last_viewed_at_desc":
      default: {
        const aTime = a.last_viewed_at ? new Date(a.last_viewed_at) : 0;
        const bTime = b.last_viewed_at ? new Date(b.last_viewed_at) : 0;
        return bTime - aTime;
      }
    }
  });

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
};
