import { useNavigate } from "react-router-dom";
import RecipeCard from "./RecipeCard";
import "./Recipe.css";

// Temporary recipe sample data
const sampleRecipes = [
  {
    id: "smoothie",
    title: "Smoothie",
    description: "Fruit and protien smoothie.",
    category: "Brunch",
  },
  {
    id: "tofu-noodle-soup",
    title: "Tofu Noodle Soup",
    description: "Einfach so.",
    category: "Abenessen",
  },
];

const RecipeList = ({ selectedCategory }) => {
  const navigate = useNavigate();
  
  // Filter recipes
  const filteredRecipes =
    selectedCategory === "Alle Rezepte"
      ? sampleRecipes
      : sampleRecipes.filter((r) => r.category === selectedCategory);

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
