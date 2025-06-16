import RecipeCard from "./RecipeCard";
import "./RecipeList.css";

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

const RecipeList = () => {
  return (
    <>
      <div className="recipe-list">
        {sampleRecipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </>
  );
};

export default RecipeList;
