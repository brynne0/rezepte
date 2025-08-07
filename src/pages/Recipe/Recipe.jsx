import "./Recipe.css";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, ShoppingBasket, Loader2 } from "lucide-react";

import { useRecipe } from "../../hooks/data/useRecipe";
import { useAuth } from "../../hooks/data/useAuth";
import { useGroceryList } from "../../hooks/data/useGroceryList";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import { formatQuantity } from "../../utils/fractionUtils";

const Recipe = () => {
  const { id } = useParams();
  const { recipe, loading, error } = useRecipe(id);
  const navigate = useNavigate();
  const { isLoggedIn, isGuest } = useAuth();
  const { t } = useTranslation();

  // Helper function to pluralize units
  const getUnitDisplay = (unit, quantity) => {
    if (!unit) return "";
    
    // Get units array to check pluralize flag
    const units = t("units", { returnObjects: true });
    const unitData = units.find(u => u.value === unit);
    
    // If unit has pluralize: false, don't pluralize
    if (unitData && !unitData.pluralize) {
      return unit;
    }
    
    // Handle singular/plural forms - convert "piece/s" to "piece" or "pieces"
    if (unit.includes("/")) {
      const [singular, pluralSuffix] = unit.split("/");
      return parseFloat(quantity) > 1 ? singular + pluralSuffix : singular;
    }
    
    return unit;
  };

  // Helper function to get the correct ingredient name (singular vs plural)
  const getIngredientDisplayName = (ingredient) => {
    // If we have a translated name from the translation service, use that
    if (ingredient.name) {
      return ingredient.name;
    }

    // Fallback to database fields for untranslated recipes
    const countableUnits = ["piece/s"];
    const isCountableUnit = countableUnits.includes(ingredient.unit);
    
    const shouldUsePlural = isCountableUnit
      ? (ingredient.quantity && parseFloat(ingredient.quantity) !== 1) // Countable units: match quantity
      : ingredient.unit || (ingredient.quantity && parseFloat(ingredient.quantity) !== 1); // Measurement units: always plural, no unit: quantity logic

    if (shouldUsePlural && ingredient.plural_name) {
      return ingredient.plural_name;
    }

    return ingredient.singular_name || "?";
  };

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

  if (loading) {
    return <LoadingAcorn />;
  }
  if (error) return <div>{error}</div>;
  if (!recipe) return <div>{t("recipe_not_found")}</div>;

  return (
    <div className="recipe-container card card-content">
      <div className="flex-row">
        <h1 className="forta">{recipe.title}</h1>

        {/* Show edit button only when logged in  */}
        {isLoggedIn && !isGuest && (
          <button
            className="btn btn-icon-red"
            onClick={() => {
              navigate(`/edit-recipe/${recipe.id}/${recipe.slug}`);
            }}
            data-testid="lucide-pencil"
            aria-label={t("edit_recipe")}
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
      {((recipe.ungroupedIngredients &&
        recipe.ungroupedIngredients.length > 0) ||
        (recipe.ingredientSections && recipe.ingredientSections.length > 0) ||
        (recipe.ingredients && recipe.ingredients.length > 0)) && (
        <>
          <div className="recipe-subheading flex-row">
            <h2>{t("ingredients")}:</h2>
            {/* Grocery Cart */}
            {isLoggedIn && (
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
                    Object.values(checkedIngredients).filter(Boolean).length >
                      0 && (
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
            {showSuccess && t("added_to_groceries")}
          </div>

          {/* Ungrouped Ingredients */}
          {recipe.ungroupedIngredients &&
            recipe.ungroupedIngredients.length > 0 && (
              <ul>
                {recipe.ungroupedIngredients.map((ingredient, index) => (
                  <li
                    key={`ungrouped-${index}-${ingredient.id}`}
                    className="ingredient"
                  >
                    <input
                      type="checkbox"
                      checked={
                        checkedIngredients[ingredient.recipe_ingredient_id] ||
                        false
                      }
                      onChange={() =>
                        handleCheckboxChange(ingredient.recipe_ingredient_id)
                      }
                      id={`ingredient-ungrouped-${index}-${ingredient.id}`}
                    />
                    <label
                      htmlFor={`ingredient-ungrouped-${index}-${ingredient.id}`}
                    >
                      {ingredient.quantity && `${formatQuantity(ingredient.quantity)} `}
                      {ingredient.unit && `${getUnitDisplay(ingredient.unit, ingredient.quantity)} `}
                      {`${getIngredientDisplayName(ingredient)} `}
                      {ingredient.notes && `${ingredient.notes} `}
                    </label>
                  </li>
                ))}
              </ul>
            )}

          {/* Ingredient Sections */}
          {recipe.ingredientSections &&
            recipe.ingredientSections.length > 0 && (
              <div className="ingredient-sections">
                {recipe.ingredientSections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="ingredient-section">
                    <h3 className="section-subheading">{section.subheading}</h3>
                    <ul>
                      {section.ingredients.map(
                        (ingredient, ingredientIndex) => (
                          <li
                            key={`section-${sectionIndex}-${ingredientIndex}-${ingredient.id}`}
                            className="ingredient"
                          >
                            <input
                              type="checkbox"
                              checked={
                                checkedIngredients[
                                  ingredient.recipe_ingredient_id
                                ] || false
                              }
                              onChange={() =>
                                handleCheckboxChange(
                                  ingredient.recipe_ingredient_id
                                )
                              }
                              id={`ingredient-section-${sectionIndex}-${ingredientIndex}-${ingredient.id}`}
                            />
                            <label
                              htmlFor={`ingredient-section-${sectionIndex}-${ingredientIndex}-${ingredient.id}`}
                            >
                              {ingredient.quantity && `${formatQuantity(ingredient.quantity)} `}
                              {ingredient.unit && `${ingredient.unit} `}
                              {`${getIngredientDisplayName(ingredient)} `}
                              {ingredient.notes && `${ingredient.notes} `}
                            </label>
                          </li>
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
                {recipe.ingredients.map((ingredient, index) => (
                  <li
                    key={`flat-${index}-${ingredient.id}`}
                    className="ingredient"
                  >
                    <input
                      type="checkbox"
                      checked={
                        checkedIngredients[ingredient.recipe_ingredient_id] ||
                        false
                      }
                      onChange={() =>
                        handleCheckboxChange(ingredient.recipe_ingredient_id)
                      }
                      id={`ingredient-flat-${index}-${ingredient.id}`}
                    />
                    <label
                      htmlFor={`ingredient-flat-${index}-${ingredient.id}`}
                    >
                      {ingredient.quantity && `${formatQuantity(ingredient.quantity)} `}
                      {ingredient.unit && `${getUnitDisplay(ingredient.unit, ingredient.quantity)} `}
                      {`${getIngredientDisplayName(ingredient)} `}
                      {ingredient.notes && `${ingredient.notes} `}
                    </label>
                  </li>
                ))}
              </ul>
            )}
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
