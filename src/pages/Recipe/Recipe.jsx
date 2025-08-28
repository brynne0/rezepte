import "./Recipe.css";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, ShoppingBasket, Loader2, Share2 } from "lucide-react";

import { useRecipe } from "../../hooks/data/useRecipe";
import { fetchSharedRecipe } from "../../services/sharingService";
import { getTranslatedRecipe } from "../../services/translationService";
import { useAuth } from "../../hooks/data/useAuth";
import { useGroceryList } from "../../hooks/data/useGroceryList";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import ShareModal from "../../components/ShareModal/ShareModal";
import ImageGallery from "../../components/ImageGallery/ImageGallery";
import { formatCompleteIngredient } from "../../utils/ingredientFormatting";

const Recipe = ({ isSharedView = false }) => {
  const { id, shareToken } = useParams();
  const {
    recipe: ownedRecipe,
    loading: ownedLoading,
    error: ownedError,
  } = useRecipe(isSharedView ? null : id);
  const [sharedRecipe, setSharedRecipe] = useState(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedError, setSharedError] = useState("");
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { t, i18n } = useTranslation();
  const [showShareModal, setShowShareModal] = useState(false);

  // Load shared recipe if in shared view
  useEffect(() => {
    if (isSharedView && shareToken) {
      const loadSharedRecipe = async () => {
        try {
          setSharedLoading(true);
          setSharedError("");

          const fetchedSharedRecipe = await fetchSharedRecipe(shareToken);
          const translatedRecipe = await getTranslatedRecipe(
            fetchedSharedRecipe,
            i18n.language
          );
          setSharedRecipe(translatedRecipe);
        } catch (err) {
          setSharedError(err.message || "Failed to load shared recipe");
        } finally {
          setSharedLoading(false);
        }
      };

      loadSharedRecipe();
    }
  }, [isSharedView, shareToken, i18n.language]);

  // Determine which recipe and state to use
  const recipe = isSharedView ? sharedRecipe : ownedRecipe;
  const loading = isSharedView ? sharedLoading : ownedLoading;
  const error = isSharedView ? sharedError : ownedError;

  // Use the grocery list hook
  const {
    checkedIngredients,
    addingToGroceryList,
    showSuccess,
    handleCheckboxChange,
    addToGroceryList,
  } = useGroceryList();

  // Helper function to get all ingredients as a flat array
  const getAllIngredients = () => {
    const allIngredients = [];

    // Add ungrouped ingredients
    if (recipe.ungroupedIngredients) {
      allIngredients.push(...recipe.ungroupedIngredients);
    }

    // Add ingredients from sections
    if (recipe.ingredientSections) {
      recipe.ingredientSections.forEach((section) => {
        if (section.ingredients) {
          allIngredients.push(...section.ingredients);
        }
      });
    }

    // Fallback to old flat structure
    if (
      !recipe.ungroupedIngredients &&
      !recipe.ingredientSections &&
      recipe.ingredients
    ) {
      allIngredients.push(...recipe.ingredients);
    }

    return allIngredients;
  };

  // Helper to render an ingredient item
  const renderIngredientItem = (ingredient, keyPrefix, index) => (
    <li key={`${keyPrefix}-${index}-${ingredient.id}`} className="ingredient">
      <input
        type="checkbox"
        checked={checkedIngredients[ingredient.recipe_ingredient_id] || false}
        onChange={() => handleCheckboxChange(ingredient.recipe_ingredient_id)}
        id={`ingredient-${keyPrefix}-${index}-${ingredient.id}`}
      />
      <label htmlFor={`ingredient-${keyPrefix}-${index}-${ingredient.id}`}>
        {formatCompleteIngredient(
          ingredient,
          t("units", { returnObjects: true }),
          i18n.language
        )}
        {ingredient.notes && (
          <span className="ingredient-notes"> {ingredient.notes}</span>
        )}
      </label>
    </li>
  );

  if (loading) {
    return <LoadingAcorn />;
  }
  if (error) {
    const isSharedRecipeNotFound = error === "SHARED_RECIPE_NOT_FOUND";
    const errorMessage = isSharedRecipeNotFound
      ? t("shared_recipe_not_found")
      : error;

    return <div className="page-centered">{errorMessage}</div>;
  }
  if (!recipe) return <div>{t("recipe_not_found")}</div>;

  return (
    <div className="recipe-container card card-recipe">
      {/* Show shared indicator for shared recipes */}
      {isSharedView && (
        <div className="shared-indicator">
          <Share2 size={16} />
          <span>{t("shared_recipe")}</span>
        </div>
      )}

      <div className="flex-between">
        <h1 className="forta-red">{recipe.title}</h1>

        {/* Only show actions for owned recipes */}
        {!isSharedView && (
          <>
            {/* Show share button when logged in and user owns the recipe */}
            {isLoggedIn && (
              <div className="flex-row recipe-actions">
                <button
                  className="btn btn-icon-red"
                  onClick={() => {
                    navigate(`/edit-recipe/${recipe.id}/${recipe.slug}`);
                  }}
                  data-testid="edit-recipe-btn"
                  aria-label={t("edit_recipe")}
                >
                  <Pencil />
                </button>
                <button
                  className="btn btn-icon-red"
                  onClick={() => setShowShareModal(true)}
                  data-testid="share-recipe-btn"
                  aria-label={t("share_recipe")}
                  title={t("share_recipe")}
                >
                  <Share2 />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Single column layout with floating images */}
      <div className="recipe-layout">
        <div className="recipe-content">
          {/* Recipe Images - floating within content */}
          {recipe.images && recipe.images.length > 0 && (
            <div className="recipe-images-float">
              <ImageGallery images={recipe.images} />
            </div>
          )}

          {/* Servings */}
          {recipe.servings && (
            <div className="recipe-subheading">
              <h2>{t("servings")}:</h2>
              {recipe.servings}
            </div>
          )}

          {/* Ingredients */}
          {((recipe.ungroupedIngredients &&
            recipe.ungroupedIngredients.length > 0) ||
            (recipe.ingredientSections &&
              recipe.ingredientSections.length > 0) ||
            (recipe.ingredients && recipe.ingredients.length > 0)) && (
            <>
              <div className="flex-row recipe-subheading">
                <h2>{t("ingredients")}:</h2>
                {/* Grocery Cart - only show for owned recipes */}
                {!isSharedView && isLoggedIn && (
                  <div className="cart-container">
                    <button
                      onClick={() =>
                        addToGroceryList(
                          getAllIngredients(),
                          recipe.title,
                          recipe.id
                        )
                      }
                      className="btn btn-icon-red"
                      disabled={addingToGroceryList}
                      data-testid="lucide-shopping-basket"
                      aria-label={t("add_to_grocery_list")}
                    >
                      <ShoppingBasket />
                      {/* Selected ingredients counter or loading spinner */}
                      {addingToGroceryList ? (
                        <span className="cart-counter flex-center">
                          <Loader2
                            size={12}
                            className="animate-spin"
                            data-testid="cart-loader"
                          />
                        </span>
                      ) : (
                        Object.values(checkedIngredients).filter(Boolean)
                          .length > 0 && (
                          <span className="cart-counter flex-center">
                            {
                              Object.values(checkedIngredients).filter(Boolean)
                                .length
                            }
                          </span>
                        )
                      )}
                    </button>
                  </div>
                )}
                {!isSharedView && showSuccess && t("added_to_groceries")}
              </div>

              {/* Ungrouped Ingredients */}
              {recipe.ungroupedIngredients &&
                recipe.ungroupedIngredients.length > 0 && (
                  <ul>
                    {recipe.ungroupedIngredients.map((ingredient, index) =>
                      renderIngredientItem(ingredient, "ungrouped", index)
                    )}
                  </ul>
                )}

              {/* Ingredient Sections */}
              {recipe.ingredientSections &&
                recipe.ingredientSections.length > 0 && (
                  <div className="ingredient-sections">
                    {recipe.ingredientSections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="ingredient-section">
                        <h3 className="section-subheading">
                          {section.subheading}
                        </h3>
                        <ul>
                          {section.ingredients.map(
                            (ingredient, ingredientIndex) =>
                              renderIngredientItem(
                                ingredient,
                                `section-${sectionIndex}`,
                                ingredientIndex
                              )
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

              {/* Fallback for old flat ingredient structure */}
              {!recipe.ungroupedIngredients &&
                !recipe.ingredientSections &&
                recipe.ingredients &&
                recipe.ingredients.length > 0 && (
                  <ul>
                    {recipe.ingredients.map((ingredient, index) =>
                      renderIngredientItem(ingredient, "flat", index)
                    )}
                  </ul>
                )}
            </>
          )}

          {/* Instructions */}
          {recipe.instructions && recipe.instructions.length > 0 && (
            <>
              <div className="recipe-subheading">
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
            <div className="recipe-subheading">
              <h2>{t("source")}:</h2>

              {recipe.source.startsWith("http://") ||
              recipe.source.startsWith("https://") ||
              recipe.source.startsWith("www.") ? (
                <a
                  href={recipe.source}
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
            <div className="recipe-subheading">
              <h2>{t("notes")}:</h2>
              {recipe.notes}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal - only for owned recipes */}
      {!isSharedView && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          recipe={recipe}
        />
      )}
    </div>
  );
};

export default Recipe;
