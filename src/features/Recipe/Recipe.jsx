import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Copy,
  Lock,
  LockOpen,
  RotateCcw,
  Minus,
  Plus,
} from "lucide-react";

import { AppStateContext } from "../../contexts/AppStateContext";
import { useRecipe } from "../../hooks/data/useRecipe";
import { setRecipePrivate } from "../../services/recipes";
import { getFriendProfile } from "../../services/friendsService";
import { useAuth } from "../../hooks/data/useAuth";
import { useSignedImageUrls } from "../../hooks/data/useSignedImageUrls";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import ImageGallery from "./components/ImageGallery";
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
import { linkifyText } from "../../utils/linkUtils";
import { recipeToText } from "../../utils/recipeToText";
import { useWakeLock } from "./hooks/useWakeLock";
import NutritionPanel from "./components/NutritionPanel";
import { toast } from "@/components/ui/toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnlineStatus } from "../../hooks/ui/useOnlineStatus";

const Recipe = () => {
  const { id } = useParams();
  const { recipe, loading, error } = useRecipe(id);
  const {
    active: wakeLockActive,
    supported: wakeLockSupported,
    toggle: toggleWakeLock,
  } = useWakeLock();
  const [multiplier, setMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [privateOverride, setPrivateOverride] = useState(null);
  const recipeStorageKey = id;
  const isOnline = useOnlineStatus();

  // Reset scale and privacy override when navigating to a different recipe
  useEffect(() => {
    setMultiplier(1);
    setPrivateOverride(null);
  }, [id]);

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
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { setFriendBar } = useContext(AppStateContext);

  const isOwner = !!user?.id && recipe?.user_id === user?.id;
  const isPrivate = privateOverride ?? recipe?.private ?? false;

  // When viewing a friend's recipe, show the "viewing a friend" banner in
  // Header (fetching their profile for the name pill); hide it for your own.
  const showFriendBar = !!recipe && !isOwner;
  const { data: friendProfile, isLoading: friendProfileLoading } = useQuery({
    queryKey: ["friendProfile", recipe?.user_id],
    queryFn: () => getFriendProfile(recipe.user_id),
    enabled: showFriendBar,
  });

  // Show images for the owner, or for a friend who has image sharing enabled.
  const canViewImages = isOwner || !!friendProfile?.friends_can_view_images;
  const { signedImages } = useSignedImageUrls(
    canViewImages ? recipe?.images : []
  );

  useEffect(() => {
    if (!showFriendBar) {
      setFriendBar(null);
      return;
    }
    setFriendBar({
      name: friendProfile?.first_name || null,
      loading: friendProfileLoading,
      hideBack: true,
    });
    return () => setFriendBar(null);
  }, [showFriendBar, friendProfile, friendProfileLoading, setFriendBar]);

  const handleTogglePrivate = async () => {
    const next = !isPrivate;
    setPrivateOverride(next);
    try {
      await setRecipePrivate(recipe.id, next);
      toast.add({
        title: next
          ? t("recipe_marked_private")
          : t("recipe_visible_to_friends"),
        type: "success",
      });
    } catch {
      setPrivateOverride(!next);
      toast.add({
        title: t("recipe_privacy_update_failed"),
        type: "error",
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        recipeToText(recipe, {
          t,
          units: t("units", { returnObjects: true }),
          language: i18n.language,
        })
      );
      toast.add({
        title: t("recipe_copied"),
        type: "success",
      });
    } catch {
      toast.add({
        title: t("recipe_copy_failed"),
        type: "error",
      });
    }
  };

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
              className="text-muted-foreground inline-flex items-center gap-1 underline decoration-2 underline-offset-2 transition-colors hover:text-accent-red"
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
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        {error}
      </div>
    );
  }
  if (!recipe) return <div>{t("recipe_not_found")}</div>;

  const hasIngredients =
    (recipe.ungroupedIngredients && recipe.ungroupedIngredients.length > 0) ||
    (recipe.ingredientSections && recipe.ingredientSections.length > 0) ||
    (recipe.ingredients && recipe.ingredients.length > 0);

  return (
    <>
      <Card size="lg" className="mx-auto max-w-3xl text-left">
        <CardHeader>
          <div
            className={
              isOwner
                ? "flex flex-col gap-4 md:gap-2"
                : "flex items-center gap-2"
            }
          >
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                onClick={() => navigate(-1)}
                aria-label={t("go_back")}
              >
                <ArrowLeft />
              </Button>

              {!isOwner && (
                <CardTitle className="text-accent-red font-forta min-w-0 flex-1 [word-wrap:break-word] text-2xl leading-tight md:text-3xl">
                  {recipe.title}
                </CardTitle>
              )}

              {isOwner && (
                <ButtonGroup className="ml-auto shrink-0">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="dashed"
                          size="icon-lg"
                          onClick={() =>
                            navigate(`/edit-recipe/${recipe.id}/${recipe.slug}`)
                          }
                          data-testid="edit-recipe-btn"
                          aria-label={t("edit_recipe")}
                          disabled={!isOnline}
                        >
                          <Pencil />
                        </Button>
                      }
                    />
                    <TooltipContent>{t("edit_recipe")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="dashed"
                          size="icon-lg"
                          onClick={handleShare}
                          data-testid="share-recipe-btn"
                          aria-label={t("copy_recipe")}
                        >
                          <Copy />
                        </Button>
                      }
                    />
                    <TooltipContent>{t("copy_recipe")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="dashed"
                          size="icon-lg"
                          onClick={handleTogglePrivate}
                          data-testid="toggle-private-btn"
                          aria-label={
                            isPrivate
                              ? t("make_recipe_visible_to_friends")
                              : t("make_recipe_private")
                          }
                          disabled={!isOnline}
                        >
                          {isPrivate ? <Lock /> : <LockOpen />}
                        </Button>
                      }
                    />
                    <TooltipContent>
                      {isPrivate
                        ? t("make_recipe_visible_to_friends")
                        : t("make_recipe_private")}
                    </TooltipContent>
                  </Tooltip>
                </ButtonGroup>
              )}
            </div>

            {isOwner && (
              <CardTitle className="text-accent-red font-forta [word-wrap:break-word] text-2xl leading-tight md:text-3xl">
                {recipe.title}
              </CardTitle>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Recipe Images - floating within content - only show when logged in */}
          {canViewImages && signedImages && signedImages.length > 0 && (
            <ImageGallery images={signedImages} />
          )}

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
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <h2>{t("source")}:</h2>
              <span className="[word-wrap:break-word]">
                {linkifyText(recipe.source)}
              </span>
            </div>
          )}

          {/* Extra Notes */}
          {recipe.notes && recipe.notes.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <h2>{t("notes")}:</h2>
              <div className="[word-break:break-word] whitespace-pre-wrap">
                {recipe.notes}
              </div>
            </div>
          )}

          {/* Nutrition */}
          <NutritionPanel recipe={recipe} />
        </CardContent>
      </Card>
    </>
  );
};

export default Recipe;
