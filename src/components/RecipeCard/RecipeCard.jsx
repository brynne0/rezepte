import "./RecipeCard.css";
import { Link } from "lucide-react";
import { useTranslation } from "react-i18next";
// import {
//   getMainImage,
//   getOptimizedImageUrl,
// } from "../../services/imageService";

const RecipeCard = ({ recipe, onClick }) => {
  const { t } = useTranslation();

  // Get main image
  // const mainImage = getMainImage(recipe.images);

  // Check if recipe has a source link
  const hasSourceLink =
    recipe.source &&
    (recipe.source.startsWith("http://") ||
      recipe.source.startsWith("https://") ||
      recipe.source.startsWith("www."));

  // Check if recipe has no content (no ingredients and no instructions)
  const hasNoIngredients =
    (!recipe.ingredients || recipe.ingredients.length === 0) &&
    (!recipe.ungroupedIngredients ||
      recipe.ungroupedIngredients.length === 0) &&
    (!recipe.ingredientSections || recipe.ingredientSections.length === 0);

  const hasNoInstructions =
    !recipe.instructions || recipe.instructions.length === 0;

  const hasNoContent = hasNoIngredients && hasNoInstructions;

  return (
    <div className="recipe-card" onClick={() => onClick && onClick(recipe)}>
      {/* {mainImage && (
        <img 
          className="recipe-image" 
          src={getOptimizedImageUrl(mainImage.url, { width: 300, height: 200 })} 
          alt={recipe.title}
          loading="lazy"
        />
      )} */}
      <h4 className="recipe-card-title">{recipe.title}</h4>
      {hasSourceLink && hasNoContent && (
        <a
          href={recipe.source}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-unstyled recipe-card-link"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the card click
          }}
          aria-label={t("open_recipe_source_link")}
          title={t("open_recipe_source_link")}
        >
          <Link size={16} />
        </a>
      )}
    </div>
  );
};

export default RecipeCard;
