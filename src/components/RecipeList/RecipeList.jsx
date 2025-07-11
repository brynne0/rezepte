import { useNavigate } from "react-router-dom";
import RecipeCard from "../RecipeCard/RecipeCard";
import "./RecipeList.css";

const RecipeList = ({ selectedCategory, recipes }) => {
  const navigate = useNavigate();

  // Filter recipes based on selected category
  const filteredRecipes =
    selectedCategory === "Alle Rezepte"
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
            onClick={() => navigate(`/${r.slug}`)}
          />
        ))}
      </div>
    </>
  );
};

export default RecipeList;
