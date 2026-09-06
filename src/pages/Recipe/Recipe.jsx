import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, Share2, RotateCcw, Minus, Plus } from "lucide-react";

import { useRecipe } from "../../hooks/data/useRecipe";
import { fetchSharedRecipe } from "../../services/sharingService";
import { getTranslatedRecipe } from "../../services/translationService";
import { useAuth } from "../../hooks/data/useAuth";
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
import {
  scaleIngredient,
  getNextMultiplierStep,
  formatMultiplierLabel,
} from "../../utils/scaleUtils";
import { shouldUsePlural } from "../../utils/fractionUtils";
import { useWakeLock } from "../../hooks/ui/useWakeLock";
import NutritionPanel from "../../components/NutritionPanel/NutritionPanel";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
          className="text-accent-red break-all underline-offset-2 hover:underline"
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
  const {
    active: wakeLockActive,
    supported: wakeLockSupported,
    toggle: toggleWakeLock,
  } = useWakeLock();
  const [multiplier, setMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const recipeStorageKey = isSharedView ? shareToken : id;

  // Reset scale when navigating to a different recipe
  useEffect(() => {
    setMultiplier(1);
  }, [id, shareToken]);

  // Restore ticked-off ingredients for this recipe from localStorage
  useEffect(() => {
    if (!recipeStorageKey) return;
    try {
      const stored = localStorage.getItem(
        `checked-ingredients-${recipeStorageKey}`
      );
      setCheckedIngredients(stored ? JSON.parse(stored) : {});
    } catch {
      setCheckedIngredients({});
    }
  }, [recipeStorageKey]);

  // Persist ticked-off ingredients as they change
  useEffect(() => {
    if (!recipeStorageKey) return;
    try {
      localStorage.setItem(
        `checked-ingredients-${recipeStorageKey}`,
        JSON.stringify(checkedIngredients)
      );
    } catch {
      // Ignore storage errors (e.g. private browsing with storage disabled)
    }
  }, [recipeStorageKey, checkedIngredients]);

  const handleCheckboxChange = (ingredientId) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [ingredientId]: !prev[ingredientId],
    }));
  };

  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const { t, i18n } = useTranslation();
  const [showShareModal, setShowShareModal] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(true);

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

  const isOwner = isLoggedIn && !!user?.id && recipe?.user_id === user?.id;

  // Generate signed URLs for recipe images — only for owner and shared views.
  // Friends cannot generate signed URLs for another user's storage bucket path.
  const { signedImages } = useSignedImageUrls(
    isOwner || isSharedView ? recipe?.images : [],
    isSharedView // 7-day expiration for shared recipes
  );

  // Parse servings — plain integer, numeric range, or freetext
  const servingsInfo = (() => {
    if (!recipe?.servings) return null;
    const str = recipe.servings.toString().trim();
    const plain = parseInt(str, 10);
    if (plain > 0 && plain.toString() === str) {
      return { type: "plain", base: plain };
    }
    const rangeMatch = str.match(/^(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
      return {
        type: "range",
        base: parseFloat(rangeMatch[1]),
        end: parseFloat(rangeMatch[2]),
      };
    }
    return { type: "text", label: str };
  })();

  // Scaled display value for the servings row
  const scaledServingsLabel = !servingsInfo
    ? null
    : servingsInfo.type === "plain"
      ? Math.round(servingsInfo.base * multiplier)
      : servingsInfo.type === "range"
        ? `${Math.round(servingsInfo.base * multiplier)}–${Math.round(servingsInfo.end * multiplier)}`
        : servingsInfo.label;

  // Scale handlers
  const handleServingsChange = (delta) => {
    if (servingsInfo?.base) {
      const next = Math.max(
        1,
        Math.round(servingsInfo.base * multiplier) + delta
      );
      setMultiplier(next / servingsInfo.base);
    } else {
      handleMultiplierChange(delta > 0 ? 1 : -1);
    }
  };

  const handleMultiplierChange = (direction) => {
    setMultiplier((prev) => getNextMultiplierStep(prev, direction));
  };

  // Apply scale to an ingredient before rendering
  const getScaledIngredient = (ingredient) => {
    if (multiplier === 1) return ingredient;
    const { quantity, unit } = scaleIngredient(
      ingredient.quantity,
      ingredient.unit,
      multiplier
    );
    // Drop the pre-resolved `name` string so getIngredientDisplayName
    // re-evaluates singular vs plural using the updated is_plural flag.
    // singular_name/plural_name are available directly on the ingredient object.
    const { name: _dropped, ...rest } = ingredient;
    // With a unit ("¾ can kidney beans"), the name stays plural regardless of quantity.
    // Without a unit ("½ banana"), recalculate from the scaled quantity.
    const is_plural = unit ? ingredient.is_plural : shouldUsePlural(quantity);
    return { ...rest, quantity, unit, is_plural };
  };

  // Helper to render an ingredient item
  const renderIngredientItem = (ingredient, keyPrefix, index) => {
    const scaled = getScaledIngredient(ingredient);
    const measurement = formatIngredientMeasurement(
      scaled.quantity,
      scaled.unit,
      t("units", { returnObjects: true })
    );
    return (
      <li
        key={`${keyPrefix}-${index}-${ingredient.id}`}
        className="flex items-center gap-2 py-0.5"
      >
        <Checkbox
          checked={checkedIngredients[ingredient.recipe_ingredient_id] || false}
          onCheckedChange={() =>
            handleCheckboxChange(ingredient.recipe_ingredient_id)
          }
          id={`ingredient-${keyPrefix}-${index}-${ingredient.id}`}
        />
        <label
          htmlFor={`ingredient-${keyPrefix}-${index}-${ingredient.id}`}
          className="peer-data-checked:text-muted-foreground min-w-0 flex-1 [word-break:break-word] transition-[opacity,text-decoration] duration-200 peer-data-checked:line-through peer-data-checked:opacity-60"
        >
          <span className="font-semibold">{measurement}</span>
          {measurement && " "}

          {ingredient.linked_recipe ? (
            <a
              className="text-accent-red inline-flex items-center gap-1 underline decoration-2 underline-offset-2 transition-colors hover:text-destructive"
              href={`/${ingredient.linked_recipe.id}/${ingredient.linked_recipe.slug}`}
              onClick={(e) => e.stopPropagation()}
            >
              {getIngredientDisplayName(scaled, i18n.language)}
            </a>
          ) : (
            getIngredientDisplayName(scaled, i18n.language)
          )}

          {ingredient.notes && (
            <span className="text-muted-foreground"> {ingredient.notes}</span>
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

    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        {errorMessage}
      </div>
    );
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

  const hasIngredients =
    (recipe.ungroupedIngredients && recipe.ungroupedIngredients.length > 0) ||
    (recipe.ingredientSections && recipe.ingredientSections.length > 0) ||
    (recipe.ingredients && recipe.ingredients.length > 0);

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
    <Card className="mx-auto max-w-3xl text-left">
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
        <div className="border-destructive bg-destructive/10 text-destructive mx-(--card-spacing) flex w-fit items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium">
          <Share2 size={16} />
          <span>{t("shared_recipe")}</span>
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-accent-red font-forta [word-wrap:break-word] text-2xl leading-tight md:text-3xl">
          {recipe.title}
        </CardTitle>

        {!isSharedView && isLoggedIn && recipe?.user_id === user?.id && (
          <CardAction className="self-start">
            <ButtonGroup>
              <Button
                variant="secondary"
                size="icon-lg"
                onClick={() =>
                  navigate(`/edit-recipe/${recipe.id}/${recipe.slug}`)
                }
                data-testid="edit-recipe-btn"
                aria-label={t("edit_recipe")}
              >
                <Pencil />
              </Button>
              <Button
                variant="secondary"
                size="icon-lg"
                onClick={() => setShowShareModal(true)}
                data-testid="share-recipe-btn"
                aria-label={t("share_recipe")}
                title={t("share_recipe")}
              >
                <Share2 />
              </Button>
            </ButtonGroup>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {wakeLockSupported && (
          <Label htmlFor="wake-lock">
            <Switch
              id="wake-lock"
              checked={wakeLockActive}
              onCheckedChange={toggleWakeLock}
            />
            {t("keep_screen_on")}
          </Label>
        )}

        {/* Recipe Images - floating within content - only show when logged in */}
        {isOwner && signedImages && signedImages.length > 0 && (
          <div className="relative w-full">
            {imagesLoading && (
              <div className="bg-muted absolute -inset-4 z-10 flex items-center justify-center transition-opacity duration-300">
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
          <div className="flex flex-wrap items-center">
            <h2>{t("servings")}:</h2>
            {hasIngredients ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleServingsChange(-1)}
                    disabled={
                      servingsInfo?.base
                        ? Math.round(servingsInfo.base * multiplier) <= 1
                        : multiplier <= 0.25
                    }
                    aria-label={t("decrease_servings")}
                  >
                    <Minus strokeWidth={2} />
                  </Button>
                  <span className="text-center font-semibold">
                    {scaledServingsLabel}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleServingsChange(1)}
                    disabled={!servingsInfo?.base && multiplier >= 8}
                    aria-label={t("increase_servings")}
                  >
                    <Plus strokeWidth={2} />
                  </Button>
                  {servingsInfo?.type === "text" && multiplier !== 1 && (
                    <span className="text-sm font-medium">
                      {formatMultiplierLabel(multiplier)}
                    </span>
                  )}
                </div>
                {multiplier !== 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-accent-red"
                    onClick={() => setMultiplier(1)}
                    aria-label={t("reset_servings")}
                  >
                    <RotateCcw strokeWidth={2} />
                  </Button>
                )}
              </>
            ) : (
              recipe.servings
            )}
          </div>
        )}

        {/* Ingredients */}
        {hasIngredients && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2>{t("ingredients")}:</h2>
              {!recipe.servings && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMultiplierChange(-1)}
                    disabled={multiplier <= 0.25}
                    aria-label={t("decrease_scale")}
                  >
                    <Minus strokeWidth={2} />
                  </Button>
                  <span className="text-center font-semibold">
                    {formatMultiplierLabel(multiplier)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMultiplierChange(1)}
                    disabled={multiplier >= 8}
                    aria-label={t("increase_scale")}
                  >
                    <Plus strokeWidth={2} />
                  </Button>
                  {multiplier !== 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-accent-red"
                      onClick={() => setMultiplier(1)}
                      aria-label={t("reset_scale")}
                    >
                      <RotateCcw strokeWidth={2} />
                    </Button>
                  )}
                </div>
              )}
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
                <>
                  {recipe.ingredientSections.map((section, sectionIndex) => (
                    <div key={sectionIndex}>
                      <h3 className="[word-break:break-word]">
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
                </>
              )}
          </div>
        )}

        {/* Instructions */}
        {recipe.instructions && recipe.instructions.length > 0 && (
          <div>
            <h2>{t("instructions")}:</h2>

            <ol className="list-decimal space-y-1 pl-8">
              {recipe.instructions.map((instruction, i) => (
                <li key={i}>{instruction}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Source */}
        {recipe.source && (
          <div className="flex flex-wrap items-baseline gap-2">
            <h2>{t("source")}:</h2>
            <span className="[word-wrap:break-word]">
              {renderTextWithLinks(recipe.source)}
            </span>
          </div>
        )}

        {/* Extra Notes */}
        {recipe.notes && recipe.notes.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-2">
            <h2>{t("notes")}:</h2>
            <div className="[word-break:break-word] whitespace-pre-wrap">
              {recipe.notes}
            </div>
          </div>
        )}

        {/* Nutrition */}
        {/* NOTE here - show the nutrition title and condition here?? but hen make the componet just the table  */}
        <NutritionPanel recipe={recipe} />
      </CardContent>

      {/* Share Modal - only for owned recipes */}
      {!isSharedView && recipe?.user_id === user?.id && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          recipe={recipe}
        />
      )}
    </Card>
  );
};

export default Recipe;
