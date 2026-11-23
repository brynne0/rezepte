import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RotateCcw,
  Minus,
  Plus,
  WifiOff,
  Lock,
  LockOpen,
  BookmarkCheck,
  BookmarkPlus,
  Languages,
} from "lucide-react";

import { AppStateContext } from "../../contexts/AppStateContext";
import { useRecipe } from "../../hooks/data/useRecipe";
import {
  setRecipePrivate,
  copyRecipeFromFriend,
  findCopiedRecipe,
} from "../../services/recipes";
import { getFriendProfile } from "../../services/friendsService";
import BackLink from "../../components/BackLink/BackLink";
import AddToMyRecipesModal from "../../components/AddToMyRecipesModal/AddToMyRecipesModal";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnlineStatus } from "../../hooks/ui/useOnlineStatus";
import { RecipeSection, RecipeSectionLabel } from "./components/RecipeSection";
import {
  readCachedValue,
  writeCachedValue,
} from "../../utils/localStorageCache";

const RECIPE_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const Recipe = () => {
  const { id } = useParams();
  const [showOriginal, setShowOriginal] = useState(false);
  const {
    recipe,
    loading,
    switching: switchingVersion,
    error,
  } = useRecipe(id, { original: showOriginal });
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

  // Reset per-recipe view state when navigating to a different recipe
  useEffect(() => {
    setPrivateOverride(null);
    setShowOriginal(false);
  }, [id]);

  // Restore ticked-off ingredients for this recipe (ignored once older than
  // RECIPE_STATE_MAX_AGE_MS, so a stale cooking session doesn't linger)
  useEffect(() => {
    if (!recipeStorageKey) return;
    setCheckedIngredients(
      readCachedValue(
        `checked-ingredients-${recipeStorageKey}`,
        RECIPE_STATE_MAX_AGE_MS
      ) ?? {}
    );
  }, [recipeStorageKey]);

  // Restore scale multiplier for this recipe, same expiry as above
  useEffect(() => {
    if (!recipeStorageKey) return;
    setMultiplier(
      readCachedValue(`scale-${recipeStorageKey}`, RECIPE_STATE_MAX_AGE_MS) ?? 1
    );
  }, [recipeStorageKey]);

  // Persisting on change (not via an effect keyed on multiplier) avoids
  // clobbering the value restored above with a stale write on mount.
  const updateMultiplier = (value) => {
    setMultiplier(value);
    if (!recipeStorageKey) return;
    writeCachedValue(`scale-${recipeStorageKey}`, value);
  };

  // Same reasoning as updateMultiplier: persist on change, not via an effect.
  const handleCheckboxChange = (ingredientId) => {
    setCheckedIngredients((prev) => {
      const next = {
        ...prev,
        [ingredientId]: !prev[ingredientId],
      };
      if (recipeStorageKey) {
        writeCachedValue(`checked-ingredients-${recipeStorageKey}`, next);
      }
      return next;
    });
  };

  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { setFriendBar } = useContext(AppStateContext);
  const queryClient = useQueryClient();

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const isOwner = !!user?.id && recipe?.user_id === user?.id;
  const isPrivate = privateOverride ?? recipe?.private ?? false;

  // Recipes written in another language can be flipped back to the original
  const appLanguage = i18n.language.split("-")[0];
  const recipeLanguage = recipe?.original_language || "en";
  const isForeignRecipe = !!recipe && recipeLanguage !== appLanguage;
  const displayLanguage = showOriginal ? recipeLanguage : appLanguage;
  // For recipe content (units, copied text), which follows the shown version
  const tContent = (key, options) =>
    t(key, { ...options, lng: displayLanguage });
  const unitLabels = tContent("units", { returnObjects: true });

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

  // Whether the user already copied this friend's recipe.
  const { data: existingCopy } = useQuery({
    queryKey: ["copiedRecipe", recipe?.id],
    queryFn: () => findCopiedRecipe(recipe.id),
    enabled: showFriendBar,
  });

  const existingCopyDate = existingCopy
    ? (() => {
        const copiedAt = new Date(existingCopy.created_at);
        const isCurrentYear =
          copiedAt.getFullYear() === new Date().getFullYear();
        return copiedAt.toLocaleDateString(i18n.language, {
          month: "short",
          day: "numeric",
          year: isCurrentYear ? undefined : "numeric",
        });
      })()
    : null;

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

  const handleConfirmCopy = async (categoryNames) => {
    setIsCopying(true);
    try {
      const newRecipe = await copyRecipeFromFriend(recipe.id, {
        categoryNames,
        friendFirstName: friendProfile?.first_name,
      });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["copiedRecipe"] });
      queryClient.invalidateQueries({ queryKey: ["copiedRecipeIds"] });
      toast.add({
        title: t("recipe_copied_to_my_recipes"),
        type: "success",
      });
      setShowCopyModal(false);
      navigate(`/${newRecipe.id}/${newRecipe.slug}`);
    } catch {
      toast.add({
        title: t("recipe_copy_to_my_recipes_failed"),
        type: "error",
      });
    } finally {
      setIsCopying(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        recipeToText(recipe, {
          t: tContent,
          units: unitLabels,
          language: displayLanguage,
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
      updateMultiplier(next / servingsInfo.base);
    } else {
      handleMultiplierChange(delta > 0 ? 1 : -1);
    }
  };

  const handleMultiplierChange = (direction) => {
    updateMultiplier(getNextMultiplierStep(multiplier, direction));
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
      unitLabels
    );
    return (
      <li
        key={`${keyPrefix}-${index}-${ingredient.id}`}
        className="flex items-start gap-2 py-0.5"
      >
        <Checkbox
          checked={checkedIngredients[ingredient.recipe_ingredient_id] || false}
          onCheckedChange={() =>
            handleCheckboxChange(ingredient.recipe_ingredient_id)
          }
          id={`ingredient-${keyPrefix}-${index}-${ingredient.id}`}
          className="mt-0.5"
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
              {getIngredientDisplayName(scaled, displayLanguage)}
            </a>
          ) : (
            getIngredientDisplayName(scaled, displayLanguage)
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
    if (!isOnline) {
      return (
        <Empty className="mt-20">
          <EmptyHeader>
            <EmptyMedia>
              <WifiOff />
            </EmptyMedia>
            <EmptyTitle>{t("recipe_unavailable_offline")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      );
    }
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

  // Back link names where it leads: your recipes, or the friend's
  const friendName = !isOwner ? friendProfile?.first_name : null;
  const backLabel = friendName
    ? t("recipe_action_back_friend", { name: friendName })
    : t("recipe_action_back");
  const backFallback =
    !isOwner && friendProfile?.username
      ? `/friends/${friendProfile.username}`
      : "/";

  return (
    <>
      {/* Navigation sits off the paper; the receipt only holds the recipe */}
      <BackLink
        label={backLabel}
        fallback={backFallback}
        className="mx-auto max-w-3xl"
      />

      <Card
        size="lg"
        variant="receipt"
        className="mx-auto my-2 w-full max-w-3xl text-left"
      >
        <CardHeader>
          <div className="flex flex-col gap-3">
            {recipe.translationUnavailable && (
              <Alert>
                <AlertDescription>
                  {t("recipe_translation_unavailable")}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-0.5">
              {isOwner && recipe.copied_from_name && (
                <span className="text-sm font-medium text-muted-foreground">
                  {t("recipe_owner_kicker", {
                    name: recipe.copied_from_name,
                  })}
                </span>
              )}
              <CardTitle className="text-accent-red font-receipt [word-wrap:break-word] text-xl leading-snug font-semibold md:text-2xl">
                {recipe.title}
              </CardTitle>
            </div>

            {/* Actions printed as text links under the title. Only the privacy
                link has a tooltip: its label shows the state, the tooltip says
                what tapping it does. */}
            <div className="-ml-2.5 flex flex-wrap items-center">
              {isOwner && (
                <>
                  <Button
                    variant="printed"
                    onClick={() =>
                      navigate(
                        `/edit-recipe/${recipe.id}/${recipe.slug}${
                          showOriginal && isForeignRecipe ? "?original=1" : ""
                        }`
                      )
                    }
                    data-testid="edit-recipe-btn"
                    aria-label={t("edit_recipe")}
                    disabled={!isOnline}
                  >
                    {t("recipe_action_edit")}
                  </Button>
                  <Button
                    variant="printed"
                    onClick={handleShare}
                    data-testid="share-recipe-btn"
                    aria-label={t("copy_recipe")}
                  >
                    {t("recipe_action_copy")}
                  </Button>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="printed"
                          onClick={handleTogglePrivate}
                          data-testid="toggle-private-btn"
                          disabled={!isOnline}
                        >
                          {isPrivate ? <Lock /> : <LockOpen />}
                          {isPrivate
                            ? t("recipe_status_private")
                            : t("recipe_status_friends")}
                        </Button>
                      }
                    />
                    <TooltipContent>
                      {isPrivate
                        ? t("make_recipe_visible_to_friends")
                        : t("make_recipe_private")}
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              {!isOwner && (
                <>
                  {existingCopy && (
                    <Button
                      variant="printed"
                      onClick={() =>
                        navigate(`/${existingCopy.id}/${existingCopy.slug}`)
                      }
                      aria-label={t("recipe_already_saved")}
                    >
                      <BookmarkCheck />
                      {t("recipe_status_saved", { date: existingCopyDate })}
                    </Button>
                  )}
                  <Button
                    variant="printed"
                    onClick={() => setShowCopyModal(true)}
                    data-testid="add-to-my-recipes-btn"
                    aria-label={t("add_to_my_recipes")}
                    disabled={!isOnline}
                    className="text-foreground"
                  >
                    <BookmarkPlus />
                    {t("save")}
                  </Button>
                </>
              )}

              {isForeignRecipe && (
                <Button
                  variant="printed"
                  onClick={() => setShowOriginal((prev) => !prev)}
                  disabled={switchingVersion}
                  aria-pressed={showOriginal}
                  data-testid="toggle-original-btn"
                >
                  <Languages />
                  {showOriginal
                    ? t("recipe_action_show_translation")
                    : t("recipe_action_show_original")}
                </Button>
              )}
            </div>
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
            <RecipeSection className="flex flex-wrap items-center gap-x-2">
              <RecipeSectionLabel>{t("servings")}</RecipeSectionLabel>
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
                      onClick={() => updateMultiplier(1)}
                      aria-label={t("reset_servings")}
                    >
                      <RotateCcw strokeWidth={2} />
                    </Button>
                  )}
                </>
              ) : (
                <span className="ml-2">{recipe.servings}</span>
              )}
            </RecipeSection>
          )}

          {/* Ingredients */}
          {hasIngredients && (
            <RecipeSection
              className="flex flex-col gap-2"
              rule={!recipe.servings}
            >
              <div className="flex flex-wrap items-center gap-2">
                <RecipeSectionLabel>{t("ingredients")}</RecipeSectionLabel>
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
                        onClick={() => updateMultiplier(1)}
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
            </RecipeSection>
          )}

          {/* Instructions */}
          {recipe.instructions && recipe.instructions.length > 0 && (
            <RecipeSection className="flex flex-col gap-2">
              <RecipeSectionLabel>{t("instructions")}</RecipeSectionLabel>

              <ol className="list-decimal space-y-1 pl-8">
                {recipe.instructions.map((instruction, i) => (
                  <li key={i}>{instruction}</li>
                ))}
              </ol>
            </RecipeSection>
          )}

          {/* Source */}
          {recipe.source && (
            <RecipeSection className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <RecipeSectionLabel>{t("source")}</RecipeSectionLabel>
              <span className="[word-wrap:break-word] whitespace-pre-wrap">
                {linkifyText(recipe.source)}
              </span>
            </RecipeSection>
          )}

          {/* Extra Notes */}
          {recipe.notes && recipe.notes.length > 0 && (
            <RecipeSection
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0"
              rule={!recipe.source}
            >
              <RecipeSectionLabel>{t("notes")}</RecipeSectionLabel>
              <div className="[word-break:break-word] whitespace-pre-wrap">
                {recipe.notes}
              </div>
            </RecipeSection>
          )}

          {/* Nutrition */}
          <NutritionPanel recipe={recipe} />
        </CardContent>
      </Card>

      {!isOwner && (
        <AddToMyRecipesModal
          open={showCopyModal}
          onOpenChange={setShowCopyModal}
          isSaving={isCopying}
          onConfirm={handleConfirmCopy}
        />
      )}
    </>
  );
};

export default Recipe;
