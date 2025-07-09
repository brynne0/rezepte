import { useParams, useNavigate } from "react-router-dom";
import { useRecipe } from "../../hooks/useRecipe";
import "./Recipe.css";
import { Pencil, ShoppingBasket } from "lucide-react";

const Recipe = () => {
  const { slug } = useParams();
  const { recipe, loading, error } = useRecipe(slug);
  const navigate = useNavigate();

  if (loading) return <div>Loading...</div>; // TODO - add loading animation after a certain amount of time
  if (error) return <div>Error: {error}</div>;
  if (!recipe) return <div>Recipe not found</div>;

  return (
    <div className="recipe-container">
      <div className="recipe-heading">
        <h1 className="recipe-title">{recipe.title}</h1>
        <button
          className="edit-btn"
          onClick={() => {
            navigate("/edit-recipe");
          }}
        >
          <Pencil />
        </button>
      </div>
      {recipe.servings && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
          <h3>Servings:</h3>
          <p>{recipe.servings}</p>
        </div>
      )}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <>
          <h3>Ingredients:</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {recipe.ingredients.map((ingredient) => (
              <li
                key={ingredient.id}
                style={{ display: "flex", alignItems: "center", gap: "0.5em" }}
              >
                <input type="checkbox" id={`ingredient-${ingredient.id}`} />
                <label htmlFor={`ingredient-${ingredient.id}`}>
                  {ingredient.quantity && `${ingredient.quantity} `}
                  {ingredient.unit && `${ingredient.unit} `}
                  {ingredient.name}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      <button className="cart-btn">
        {/* TODO - add a counter in the top right of the icon to keep trcak of how many items in cart */}
        <ShoppingBasket size={28} />
      </button>

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
