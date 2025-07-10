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
        <h1>{recipe.title}</h1>
        {/* TODO - Show edit button only when logged in  */}
        <button
          className="edit-btn"
          onClick={() => {
            navigate(`/edit-recipe/${recipe.slug}`);
          }}
        >
          <Pencil />
        </button>
      </div>
      {recipe.servings && (
        <div className="servings">
          <h3>Servings:</h3>
          {recipe.servings}
        </div>
      )}
      {recipe.ingredients && (
        <>
          <h3>Ingredients:</h3>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.id} className="ingredient">
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
