import { useParams } from "react-router-dom";
import { useRecipe } from "../hooks/useRecipe";
import "./Recipe.css";

const Recipe = () => {
  const { id } = useParams();
  const { recipe, loading } = useRecipe(id);

  if (!loading && recipe)
    return (
      <div className="recipe-container">
        <h1 className="recipe-title">{recipe.title}</h1>
        <p>Servings: {recipe.servings}</p>
        <p>Ingredients:</p>
        <ul>
          {recipe.ingredients.map((ingredient, i) => (
            <li key={i}>{ingredient}</li>
          ))}
        </ul>
      </div>
    );
};

export default Recipe;
