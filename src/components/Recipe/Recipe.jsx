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
      {/* Back Arrow
      <ArrowBigLeft
        className="recipe-back-arrow"
        size={30}
        onClick={() => {
          navigate(-1);
        }}
      /> */}
      <div className="recipe-heading-container">
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
        <div className="recipe-subheading">
          <h3>Servings:</h3>
          {recipe.servings}
        </div>
      )}

      {/* Ingredients */}
      {recipe.ingredients && (
        <>
          <div className="recipe-subheading">
            <h3>Ingredients:</h3>
            {/* Grocery Cart */}
            <button className="cart-btn">
              <ShoppingBasket size={24} />
            </button>
          </div>
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

      {/* Instructions */}
      {recipe.instructions && recipe.instructions.length > 0 && (
        <>
          <div className="recipe-subheading">
            <h3>Instructions:</h3>
          </div>
          <ol>
            {recipe.instructions.map((instruction, i) => (
              <li key={i}>{instruction}</li>
            ))}
          </ol>
        </>
      )}

      {/* Source */}
      {recipe.source && (
        <>
          <div className="recipe-subheading">
            <h3>Source:</h3>
            {recipe.source}
          </div>
        </>
      )}
    </div>
  );
};

export default Recipe;
