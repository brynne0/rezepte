import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppStateContext } from "../../contexts/AppStateContext";
import { useOnlineStatus } from "../../hooks/ui/useOnlineStatus";
import RecipeFilters from "../../components/RecipeFilters/RecipeFilters";
import RecipeList from "../../components/RecipeList/RecipeList";
import Pagination from "../../components/Pagination/Pagination";

function Home() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    setSearchTerm,
    recipes,
    searchTerm,
    sortBy,
    setSortBy,
    showImages,
    setShowImages,
    onPageReset,
    totalRecipeCount,
    isFetchingRecipes,
    paginationInfo,
    onPageChange,
  } = useContext(AppStateContext);
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  return (
    <>
      {isOnline && (
        <RecipeFilters
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSearchSubmit={() => navigate("/")}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showImages={showImages}
          setShowImages={setShowImages}
          onPageReset={onPageReset}
        />
      )}
      <RecipeList
        selectedCategory={selectedCategory}
        recipes={recipes}
        searchTerm={searchTerm}
        showImages={showImages}
        totalRecipeCount={totalRecipeCount}
        isPaginated={true}
        loading={isFetchingRecipes}
        isOnline={isOnline}
      />
      {isOnline && (
        <Pagination
          currentPage={paginationInfo.currentPage}
          totalPages={paginationInfo.totalPages}
          onPageChange={onPageChange}
          hasNextPage={paginationInfo.hasNextPage}
          hasPrevPage={paginationInfo.hasPrevPage}
        />
      )}
    </>
  );
}

export default Home;
