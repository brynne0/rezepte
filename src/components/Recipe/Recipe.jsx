import { useParams, useNavigate } from "react-router-dom";
import { useRecipe } from "../../hooks/useRecipe";
import "./Recipe.css";
import { Pencil, ShoppingBasket } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";

const Recipe = () => {
  const { slug } = useParams();
  const { recipe, loading, error } = useRecipe(slug);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { t } = useTranslation();

  if (loading) return;
  if (error) return <div>{error}</div>;
  if (!recipe) return <div>{t("recipe_not_found")}</div>;

  return (
    <div className="recipe-container">
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
          <h3>{t("servings")}:</h3>
          {recipe.servings}
        </div>
      )}

      {/* Ingredients */}
      {recipe.ingredients && (
        <>
          <div className="recipe-subheading">
            <h3>{t("ingredients")}:</h3>
            {/* Grocery Cart */}
            <button className="cart-btn">
              <ShoppingBasket />
            </button>
          </div>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.id} className="ingredient">
                <input type="checkbox" id={`ingredient-${ingredient.id}`} />
                <label htmlFor={`ingredient-${ingredient.id}`}>
                  {/* Make quantity and unit bold */}
                  {/* <strong> */}
                  {ingredient.quantity && `${ingredient.quantity} `}
                  {ingredient.unit && `${ingredient.unit} `}
                  {/* </strong> */}
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
            <h3>{t("instructions")}:</h3>
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
        <div className="recipe-subheading">
          <h3>{t("source")}:</h3>

          {/^https?:\/\/[^\s]+/.test(recipe.source) ? (
            <a
              href={recipe.source.match(/^https?:\/\/[^\s]+/)[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="source-link"
            >
              {recipe.source}
            </a>
          ) : (
            <span>{recipe.source}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default Recipe;
