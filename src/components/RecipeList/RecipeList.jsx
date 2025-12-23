import { useNavigate } from "react-router-dom";
import RecipeCard from "../RecipeCard/RecipeCard";
import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "../../hooks/ui/useOnlineStatus";
import { useAuth } from "../../hooks/data/useAuth";
import "./RecipeList.css";

const RecipeList = ({
  selectedCategory,
  recipes,
  searchTerm,
  showImages = true,
  totalRecipeCount = 0,
  isPaginated = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const { isLoggedIn } = useAuth();

  // If using pagination, recipes are already filtered on the server side
  // Otherwise, apply client-side filtering for backward compatibility
  const filteredRecipes = isPaginated
    ? recipes
    : (() => {
        // First filter by search term if it exists
        const searchFilteredRecipes = searchTerm
          ? recipes.filter((recipe) =>
              recipe.title?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : recipes;

        // Then filter by category (only if not searching or if all recipes are selected)
        return searchTerm
          ? searchFilteredRecipes // When searching, show all search results regardless of category
          : selectedCategory === "all"
            ? recipes
            : recipes.filter((r) => r.category === selectedCategory);
      })();

  return (
    <>
      {/* Display all recipes in selected category */}
      <div className="recipe-list">
        {filteredRecipes.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            showImages={showImages}
            onClick={() => {
              navigate(`/${r.id}/${r.slug}`);
            }}
          />
        ))}
      </div>
      {filteredRecipes.length === 0 && searchTerm && (
        <span>{t("no_recipes_found", { searchTerm })}</span>
      )}
      {totalRecipeCount === 0 && !searchTerm && (
        <div className="page-centered high">
          <div className="card welcome-card">
            {!isOnline ? (
              <p>{t("no_internet_connection")}</p>
            ) : isLoggedIn ? (
              <p>{t("welcome_add_recipe")}</p>
            ) : (
              <p className="grey-small">{t("logged_in_note")}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default RecipeList;
