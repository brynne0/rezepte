import { useParams } from "react-router-dom";
import { useRecipe } from "../../hooks/useRecipe";
import "./Recipe.css";

const Recipe = () => {
  const { slug } = useParams();
  const { recipe, loading, error } = useRecipe(slug);

  if (loading) return <div>Loading...</div>; // TODO - add loading animation after a certain amount of time
  if (error) return <div>Error: {error}</div>;
  if (!recipe) return <div>Recipe not found</div>;

  return (
    <div className="recipe-container">
      <h1 className="recipe-title">{recipe.title}</h1>
      {recipe.servings && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
          <h3>Servings:</h3>
          <p>{recipe.servings}</p>
        </div>
      )}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <>
          <h3>Ingredients:</h3>
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
          <ol>
            {recipe.instructions.map((instruction, i) => (
              <li key={i}>{instruction}</li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
};

export default Recipe;
