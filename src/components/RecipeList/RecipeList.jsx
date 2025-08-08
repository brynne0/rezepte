import { useNavigate } from "react-router-dom";
import RecipeCard from "../RecipeCard/RecipeCard";
import "./RecipeList.css";

const RecipeList = ({ selectedCategory, recipes, searchTerm }) => {
  const navigate = useNavigate();

  // First filter by search term if it exists
  const searchFilteredRecipes = searchTerm
    ? recipes.filter((recipe) =>
        recipe.title?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : recipes;

  // Then filter by category (only if not searching or if all recipes are selected)
  const filteredRecipes = searchTerm
    ? searchFilteredRecipes // When searching, show all search results regardless of category
    : selectedCategory === "all"
    ? recipes
    : recipes.filter((r) => r.category === selectedCategory);

  return (
    <>
      {/* Display all recipes in selected category */}
      <div className="recipe-list">
        {filteredRecipes.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            onClick={() => {
              navigate(`/${r.id}/${r.slug}`);
            }}
          />
        ))}
      </div>
      {filteredRecipes.length === 0 && searchTerm && (
        <p>No recipes for "{searchTerm}" found</p>
      )}
    </>
  );
};

export default RecipeList;
