import { useParams, useNavigate } from "react-router-dom";
import { useRecipe } from "../../hooks/useRecipe";
import "./Recipe.css";
import { Pencil, ShoppingBasket, ArrowBigLeft } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const Recipe = () => {
  const { slug } = useParams();
  const { recipe, error } = useRecipe(slug);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  if (error) return <div>Error: {error}</div>;
  if (!recipe) return <div>Recipe not found</div>;

  return (
    <div className="recipe-container">
      {/* Back Arrow */}
      <ArrowBigLeft
        className="recipe-back-arrow"
        size={30}
        onClick={() => {
          navigate(-1);
        }}
      />
      <div className="recipe-heading">
        <h1>{recipe.title}</h1>

        {/* Show edit button only when logged in  */}
        {isLoggedIn && (
          <button
            className="edit-btn"
            onClick={() => {
              navigate(`/edit-recipe/${recipe.slug}`);
            }}
          >
            <Pencil />
          </button>
        )}
      </div>

      {/* Servings */}
      {recipe.servings && (
        <div className="servings">
          <h3>Servings:</h3>
          {recipe.servings}
        </div>
      )}

      {/* Ingredients */}
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

      {/* Grocery Cart */}
      <button className="cart-btn">
        <ShoppingBasket size={28} />
      </button>

      {/* Instructions */}
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
