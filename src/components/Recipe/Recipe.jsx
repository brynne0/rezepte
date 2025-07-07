import { useParams } from "react-router-dom";
import { useRecipe } from "../../hooks/useRecipe";
import "./Recipe.css";

const Recipe = () => {
  const { slug } = useParams();
  const { recipe, loading, error } = useRecipe(slug);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!recipe) return <div>Recipe not found</div>;

  return (
    <div className="recipe-container">
      <h1 className="recipe-title">{recipe.title}</h1>
      {recipe.servings && <p>Servings: {recipe.servings}</p>}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <>
          <p>Ingredients:</p>
          <ul>
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.id}>
                {ingredient.quantity && `${ingredient.quantity} `}
                {ingredient.unit && `${ingredient.unit} `}
                {ingredient.name}
              </li>
            ))}
          </ul>
        </>
      )}

      {recipe.instructions && (
        <>
          <h3>Instructions:</h3>
          <p>{recipe.instructions}</p>
        </>
      )}
    </div>
  );
};

export default Recipe;
