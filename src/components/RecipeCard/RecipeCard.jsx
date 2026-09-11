import { useState, useMemo } from "react";
import { Link } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSignedImageUrls } from "../../hooks/data/useSignedImageUrls";
import {
  getMainImage,
  getOptimizedImageUrl,
} from "../../services/imageService";
import { extractFirstUrl } from "../../utils/linkUtils";
import { useIntersectionObserver } from "../../hooks/ui/useIntersectionObserver";
import { Card, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";

const RecipeCard = ({ recipe, showImages = true, onClick }) => {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isSourceLinkHovered, setIsSourceLinkHovered] = useState(false);

  // Use intersection observer to only load images when card is visible
  const { ref: cardRef, hasBeenVisible } = useIntersectionObserver({
    rootMargin: "100px", // Start loading 100px before entering viewport
  });

  // Generate signed URL for main image only (performance optimization)
  const mainImage = getMainImage(recipe.images);
  const { signedImages } = useSignedImageUrls(
    mainImage && showImages ? [mainImage] : []
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

  // Only show images if showImages is true AND card has been visible
  const shouldShowImages = showImages && hasBeenVisible;

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoaded(false);
    setImageError(true);
  };

  // Check if recipe has a source link
  const sourceUrl = extractFirstUrl(recipe.source);

  // Check if recipe has no content (no ingredients and no instructions)
  const hasNoIngredients = !recipe.hasIngredients;
  const hasNoInstructions =
    !recipe.instructions || recipe.instructions.length === 0;
  const hasNoContent = hasNoIngredients && hasNoInstructions;

  return (
    <Card
      ref={cardRef}
      className="cursor-pointer py-0 justify-between"
      onClick={() => onClick && onClick(recipe)}
    >
      <CardHeader className="py-2">
        <CardTitle
          className={cn(
            "text-xs font-medium uppercase",
            !isSourceLinkHovered && "group-hover/card:text-accent-red"
          )}
        >
          {recipe.title}
        </CardTitle>

        {sourceUrl && hasNoContent && (
          <CardAction className="row-span-1 self-center">
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-accent-red"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the card click
                    }}
                    onMouseEnter={() => setIsSourceLinkHovered(true)}
                    onMouseLeave={() => setIsSourceLinkHovered(false)}
                    onFocus={() => setIsSourceLinkHovered(true)}
                    onBlur={() => setIsSourceLinkHovered(false)}
                    aria-label={t("open_recipe_source_link")}
                  >
                    <Link size={16} />
                  </a>
                }
              />
              <TooltipContent>{t("open_recipe_source_link")}</TooltipContent>
            </Tooltip>
          </CardAction>
        )}
      </CardHeader>
      {shouldShowImages &&
        signedMainImage &&
        !imageError &&
        optimizedImageUrl && (
          <AspectRatio
            ratio={3 / 2}
            className="mx-2 mb-2 overflow-hidden rounded-lg"
          >
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 rounded-lg" />
            )}
            <img
              className={cn(
                "size-full object-cover transition-opacity duration-200 will-change-[opacity]",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              src={optimizedImageUrl}
              alt={recipe.title}
              loading="lazy"
              onLoad={handleImageLoad}
              onError={handleImageError}
              key={signedMainImage?.id}
            />
          </AspectRatio>
        )}
    </Card>
  );
};

export default RecipeCard;
