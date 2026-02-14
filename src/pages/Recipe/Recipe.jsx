import "./Recipe.css";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, ShoppingBasket, Loader2, Share2 } from "lucide-react";

import { useRecipe } from "../../hooks/data/useRecipe";
import { fetchSharedRecipe } from "../../services/sharingService";
import { getTranslatedRecipe } from "../../services/translationService";
import { getUserPreferredLanguage } from "../../services/userService";
import { useAuth } from "../../hooks/data/useAuth";
import { useGroceryList } from "../../hooks/data/useGroceryList";
import { useSignedImageUrls } from "../../hooks/data/useSignedImageUrls";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import ShareModal from "../../components/ShareModal/ShareModal";
import ImageGallery from "../../components/ImageGallery/ImageGallery";
import SEO from "../../components/SEO/SEO";
import { getMainImage } from "../../services/imageService";
import {
  formatIngredientMeasurement,
  getIngredientDisplayName,
} from "../../utils/ingredientFormatting";

// Helper function to parse text and convert URLs to clickable links
const renderTextWithLinks = (text) => {
  if (!text) return null;

  // Regex to match URLs (http, https, www)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    // Check if this part is a URL
    if (part.match(urlRegex)) {
      // Add protocol if missing (for www. links)
      const href = part.startsWith("www.") ? `https://${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="link-red break-all"
        >
          {part}
        </a>
      );
    }
    // Return plain text
    return part;
  });
};

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
  const [imagesLoading, setImagesLoading] = useState(true);
  const [userPreferredLanguage, setUserPreferredLanguage] = useState(null);

  // Load user's preferred language
  useEffect(() => {
    if (isLoggedIn) {
      getUserPreferredLanguage().then(setUserPreferredLanguage);
    }
  }, [isLoggedIn]);

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
          setSharedError(err.message || t("failed_load_shared_recipe"));
        } finally {
          setSharedLoading(false);
        }
      };

      loadSharedRecipe();
    }
  }, [isSharedView, shareToken, i18n.language, t]);

  // Determine which recipe and state to use
  const recipe = isSharedView ? sharedRecipe : ownedRecipe;
  const loading = isSharedView ? sharedLoading : ownedLoading;
  const error = isSharedView ? sharedError : ownedError;

  // Generate signed URLs for recipe images
  const { signedImages } = useSignedImageUrls(
    recipe?.images,
    isSharedView // 7-day expiration for shared recipes
  );

  // Check if user is viewing the site in their preferred language
  const currentLanguage = i18n.language.split("-")[0]; // Normalise region codes
  const isViewingInPreferredLanguage =
    currentLanguage === userPreferredLanguage;

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
  const renderIngredientItem = (ingredient, keyPrefix, index) => {
    return (
      <li key={`${keyPrefix}-${index}-${ingredient.id}`} className="ingredient">
        <input
          type="checkbox"
          checked={checkedIngredients[ingredient.recipe_ingredient_id] || false}
          onChange={() => handleCheckboxChange(ingredient.recipe_ingredient_id)}
          id={`ingredient-${keyPrefix}-${index}-${ingredient.id}`}
        />
        <label htmlFor={`ingredient-${keyPrefix}-${index}-${ingredient.id}`}>
          <span className="ingredient-measurement">
            {formatIngredientMeasurement(
              ingredient.quantity,
              ingredient.unit,
              t("units", { returnObjects: true })
            )}
          </span>
          {formatIngredientMeasurement(
            ingredient.quantity,
            ingredient.unit,
            t("units", { returnObjects: true })
          ) && " "}

          {ingredient.linked_recipe ? (
            <a
              className="ingredient-name-linked"
              href={`/${ingredient.linked_recipe.id}/${ingredient.linked_recipe.slug}`}
              onClick={(e) => e.stopPropagation()}
            >
              {getIngredientDisplayName(ingredient, i18n.language)}
            </a>
          ) : (
            getIngredientDisplayName(ingredient, i18n.language)
          )}

          {ingredient.notes && (
            <span className="ingredient-notes"> {ingredient.notes}</span>
          )}
        </label>
      </li>
    );
  };

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

  // Generate SEO data using signed URLs
  const mainImage = getMainImage(signedImages);
  const recipeImageUrl =
    mainImage?.url || "https://acorn-rezepte.com/eichhörnchen/og-image.png";
  const recipeUrl = isSharedView
    ? `https://acorn-rezepte.com/shared/${shareToken}`
    : `https://acorn-rezepte.com/recipe/${id}`;

  // Create description from ingredients or instructions
  const createDescription = () => {
    if (recipe.ungroupedIngredients && recipe.ungroupedIngredients.length > 0) {
      const firstFewIngredients = recipe.ungroupedIngredients
        .slice(0, 3)
        .map((ing) => getIngredientDisplayName(ing, i18n.language))
        .join(", ");
      return `${t("recipe_with_ingredients")}: ${firstFewIngredients}...`;
    }
    if (recipe.instructions && recipe.instructions.length > 0) {
      return recipe.instructions[0].substring(0, 155);
    }
    return `${recipe.title} - ${t("view_recipe_details")}`;
  };

  // Generate structured data for Google (Recipe schema)
  const structuredData = {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    name: recipe.title,
    image: recipeImageUrl,
    description: createDescription(),
    ...(recipe.servings && { recipeYield: recipe.servings.toString() }),
    ...(recipe.category && { recipeCategory: recipe.category }),
    ...(recipe.source && { url: recipe.source }),
    ...(recipe.ungroupedIngredients &&
      recipe.ungroupedIngredients.length > 0 && {
        recipeIngredient: recipe.ungroupedIngredients.map(
          (ing) =>
            `${formatIngredientMeasurement(ing, i18n.language)} ${getIngredientDisplayName(ing, i18n.language)}`
        ),
      }),
    ...(recipe.instructions &&
      recipe.instructions.length > 0 && {
        recipeInstructions: recipe.instructions.map((instruction, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text: instruction,
        })),
      }),
  };

  return (
    <div className="recipe-container card card-recipe">
      {/* SEO Meta Tags and Structured Data */}
      <SEO
        title={`${recipe.title}`}
        description={createDescription()}
        image={recipeImageUrl}
        url={recipeUrl}
        type="article"
        structuredData={structuredData}
      />

      {/* Show shared indicator for shared recipes */}
      {isSharedView && (
        <div className="shared-indicator">
          <Share2 size={16} />
          <span>{t("shared_recipe")}</span>
        </div>
      )}

      <div className="flex-between gap-xs">
        <h1 className="forta-red wrap">{recipe.title}</h1>

        {/* Only show actions for owned recipes */}
        {!isSharedView && (
          <>
            {/* Show share button when logged in and user owns the recipe */}
            {isLoggedIn && (
              <div className="action-buttons-bordered">
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
          {/* Recipe Images - floating within content - only show when logged in */}
          {isLoggedIn && signedImages && signedImages.length > 0 && (
            <div className="recipe-images-float">
              {imagesLoading && (
                <div className="images-loading-overlay">
                  <LoadingAcorn size={20} className="loading-acorn-small" />
                </div>
              )}
              <ImageGallery
                images={signedImages}
                onAllImagesLoaded={() => setImagesLoading(false)}
              />
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
                {/* Grocery Cart - only show for owned recipes and when viewing in preferred language */}
                {!isSharedView &&
                  isLoggedIn &&
                  isViewingInPreferredLanguage && (
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
                                Object.values(checkedIngredients).filter(
                                  Boolean
                                ).length
                              }
                            </span>
                          )
                        )}
                      </button>
                    </div>
                  )}
                {!isSharedView &&
                  isViewingInPreferredLanguage &&
                  showSuccess &&
                  t("added_to_groceries")}
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
              <span className="wrap">{renderTextWithLinks(recipe.source)}</span>
            </div>
          )}

          {/* Extra Notes */}
          {recipe.notes && recipe.notes.length > 0 && (
            <div className="recipe-subheading">
              <h2>{t("notes")}:</h2>
              <div className="recipe-notes-content">{recipe.notes}</div>
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
