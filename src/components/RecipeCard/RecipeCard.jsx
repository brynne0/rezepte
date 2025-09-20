import { useState } from "react";
import "./RecipeCard.css";
import { Link } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/data/useAuth";
import {
  getMainImage,
  getOptimizedImageUrl,
} from "../../services/imageService";
import LoadingAcorn from "../LoadingAcorn/LoadingAcorn";

const RecipeCard = ({ recipe, showImages = true, onClick }) => {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get main image
  const mainImage = getMainImage(recipe.images);

  // Only show images if user is logged in AND showImages is true
  const shouldShowImages = isLoggedIn && showImages;

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoaded(false);
    setImageError(true);
  };

  // Check if recipe has a source link
  const hasSourceLink =
    recipe.source &&
    (recipe.source.startsWith("http://") ||
      recipe.source.startsWith("https://") ||
      recipe.source.startsWith("www."));

  // Check if recipe has no content (no ingredients and no instructions)
  const hasNoIngredients = !recipe.hasIngredients;
  const hasNoInstructions =
    !recipe.instructions || recipe.instructions.length === 0;
  const hasNoContent = hasNoIngredients && hasNoInstructions;

  return (
    <div className="recipe-card" onClick={() => onClick && onClick(recipe)}>
      <div className="flex-center">
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
      {shouldShowImages && mainImage && !imageError && (
        <div className="recipe-image-container">
          <img
            className={`recipe-image ${imageLoaded ? "loaded" : "loading"}`}
            src={getOptimizedImageUrl(mainImage.url, {
              width: 300,
              height: 200,
              quality: 75,
            })}
            alt={recipe.title}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
            key={mainImage.id}
          />
          {!imageLoaded && (
            <div className="recipe-image-loading">
              <LoadingAcorn size={20} className="loading-acorn-small" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeCard;
