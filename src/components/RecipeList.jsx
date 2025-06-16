import RecipeCard from "./RecipeCard";
import "./Recipe.css";

// Temporary recipe sample data
const sampleRecipes = [
  {
    id: 1,
    title: "Smoothie",
    description: "Fruit and protien smoothie.",
  },
  {
    id: 2,
    title: "Tofu Noodle Soup",
    description: "Einfach so.",
  },
];

const RecipeList = ({ selectedCategory }) => {
  // Filter recipes
  const filteredRecipes =
    selectedCategory === "Alle Rezepte"
      ? sampleRecipes
      : sampleRecipes.filter((r) => r.category === selectedCategory);

  return (
    <>
      <div className="recipe-list">
        {filteredRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </>
  );
};

export default RecipeList;
