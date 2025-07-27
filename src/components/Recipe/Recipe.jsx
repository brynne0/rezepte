import { useParams, useNavigate } from "react-router-dom";
import { useRecipe } from "../../hooks/useRecipe";
import "./Recipe.css";
import { Pencil, ShoppingBasket } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useGroceryList } from "../../hooks/useGroceryList";

const Recipe = () => {
  const { id } = useParams();
  const { recipe, loading, error } = useRecipe(id);
  const navigate = useNavigate();
  const { isLoggedIn, isGuest } = useAuth();
  const { t } = useTranslation();

  // Use the grocery list hook
  const {
    checkedIngredients,

    showSuccess,
    handleCheckboxChange,
    addToGroceryList,
  } = useGroceryList();

  if (loading) return;
  if (error) return <div>{error}</div>;
  if (!recipe) return <div>{t("recipe_not_found")}</div>;

  return (
    <div className="recipe-container">
      <div className="recipe-heading-container">
        <h1>{recipe.title}</h1>

        {/* Show edit button only when logged in  */}
        {isLoggedIn && !isGuest && (
          <button
            className="btn btn-icon btn-icon-danger"
            onClick={() => {
              navigate(`/edit-recipe/${recipe.id}/${recipe.slug}`);
            }}
          >
            <Pencil />
          </button>
        )}
      </div>

      {/* Servings */}
      {recipe.servings && (
        <div className="recipe-subheading flex-row">
          <h2>{t("servings")}:</h2>
          {recipe.servings}
        </div>
      )}

      {/* Ingredients */}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <>
          <div className="recipe-subheading flex-row">
            <h2>{t("ingredients")}:</h2>
            {/* Grocery Cart */}
            {isLoggedIn && (
              <div className="cart-container">
                <button
                  onClick={() => addToGroceryList(recipe.ingredients)}
                  className="btn btn-icon btn-icon-danger"
                >
                  <ShoppingBasket />
                  {/* Selected ingredients counter */}
                  {Object.values(checkedIngredients).filter(Boolean).length >
                    0 && (
                    <span className="cart-counter">
                      {Object.values(checkedIngredients).filter(Boolean).length}
                    </span>
                  )}
                </button>
              </div>
            )}
            {showSuccess && t("added_to_groceries")}
          </div>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.id} className="ingredient">
                <input
                  type="checkbox"
                  checked={checkedIngredients[ingredient.id] || false}
                  onChange={() => handleCheckboxChange(ingredient.id)}
                  id={`ingredient-${ingredient.id}`}
                />
                <label htmlFor={`ingredient-${ingredient.id}`}>
                  {/* <strong> */}
                  {ingredient.quantity && `${ingredient.quantity} `}
                  {ingredient.unit && `${ingredient.unit} `}
                  {/* </strong> */}
                  {`${ingredient.name} `}
                  {ingredient.notes && `${ingredient.notes} `}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Instructions */}
      {recipe.instructions && recipe.instructions.length > 0 && (
        <>
          <div className="recipe-subheading flex-row">
            <h2>{t("instructions")}:</h2>
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
        <div className="recipe-subheading flex-row">
          <h2>{t("source")}:</h2>

          {/^https?:\/\/[^\s]+/.test(recipe.source) ? (
            <a
              href={recipe.source.match(/^https?:\/\/[^\s]+/)[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="link-red"
            >
              {recipe.source}
            </a>
          ) : (
            <span>{recipe.source}</span>
          )}
        </div>
      )}

      {/* Extra Notes */}
      {recipe.notes && recipe.notes.length > 0 && (
        <div className="recipe-subheading flex-row">
          <h2>{t("notes")}:</h2>
          {recipe.notes}
        </div>
      )}
    </div>
  );
};

export default Recipe;
