import { useState, useMemo } from "react";
import "./RecipeCard.css";
import { Link } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/data/useAuth";
import { useSignedImageUrls } from "../../hooks/data/useSignedImageUrls";
import {
  getMainImage,
  getOptimizedImageUrl,
} from "../../services/imageService";
import LoadingAcorn from "../LoadingAcorn/LoadingAcorn";
import useIntersectionObserver from "../../hooks/ui/useIntersectionObserver";

const RecipeCard = ({ recipe, showImages = true, onClick }) => {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Use intersection observer to only load images when card is visible
  const { ref: cardRef, hasBeenVisible } = useIntersectionObserver({
    rootMargin: "100px", // Start loading 100px before entering viewport
  });

  // Generate signed URL for main image only (performance optimization)
  const mainImage = getMainImage(recipe.images);
  const { signedImages } = useSignedImageUrls(
    mainImage ? [mainImage] : [],
    false // 1-hour expiration for recipe cards
  );
  const signedMainImage = signedImages[0];

  // Memoize optimised URL using stable primitive values to enable proper caching
  const optimizedImageUrl = useMemo(() => {
    if (!signedMainImage?.url) return null;
    return getOptimizedImageUrl(signedMainImage.url, {
      width: 240,
      height: 160,
      quality: 50,
    });
  }, [signedMainImage?.url]);

  // Only show images if user is logged in AND showImages is true AND card has been visible
  const shouldShowImages = isLoggedIn && showImages && hasBeenVisible;

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
    <div
      ref={cardRef}
      className="recipe-card"
      onClick={() => onClick && onClick(recipe)}
    >
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
      {shouldShowImages &&
        signedMainImage &&
        !imageError &&
        optimizedImageUrl && (
          <div className="recipe-image-container">
            <img
              className={`recipe-image ${imageLoaded ? "loaded" : "loading"}`}
              src={optimizedImageUrl}
              alt={recipe.title}
              loading="lazy"
              onLoad={handleImageLoad}
              onError={handleImageError}
              key={signedMainImage?.id}
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
