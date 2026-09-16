// Shared filter/sort/paginate logic for recipe lists
export const filterSortPaginateRecipes = ({
  recipes,
  searchTerm,
  category,
  sortBy,
  page,
  limit,
}) => {
  const term = searchTerm?.toLowerCase().trim();

  const searchFilteredRecipes = term
    ? recipes.filter((recipe) => recipe.title?.toLowerCase().includes(term))
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
