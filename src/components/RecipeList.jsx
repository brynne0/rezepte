import { useNavigate } from "react-router-dom";
import RecipeCard from "./RecipeCard";
import "./RecipeList.css";

const RecipeList = ({ selectedCategory, recipes }) => {
  const navigate = useNavigate();

  // Filter recipes
  const filteredRecipes =
    selectedCategory === "Alle Rezepte"
      ? recipes
      : recipes.filter((r) => r.category === selectedCategory);

  return (
    <>
      <div className="recipe-list">
        {filteredRecipes.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            onClick={() => navigate(`/${r.id}`)}
          />
        ))}
      </div>
    </>
  );
};

export default RecipeList;
