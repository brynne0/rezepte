import { useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { buildNutritionColumns } from "../../../utils/nutritionUtils";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useRecipeActions,
  OFFLINE_ERROR,
} from "../../../hooks/data/useRecipeActions";
import { normaliseUnicodeFractions } from "../../../utils/fractionUtils";
import { toast } from "@/components/ui/toast";
import { useOnlineStatus } from "../../../hooks/ui/useOnlineStatus";

// Scroll to and focus the first invalid field, or the page top as a fallback
const scrollToInvalidField = () => {
  requestAnimationFrame(() => {
    const invalidField = document.querySelector(
      '[data-invalid="true"], [aria-invalid="true"]'
    );
    if (invalidField) {
      invalidField.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = invalidField.matches("input, textarea, select")
        ? invalidField
        : invalidField.querySelector("input, textarea, select");
      focusable?.focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
    }
  });
};

// Postgres's unique_user_recipe_title constraint on (user_id, title)
const isDuplicateTitleError = (err) =>
  err.message?.includes("unique_user_recipe_title");

// recipe_categories is unordered, so sort before comparing
const normaliseCategories = (categories) =>
  (categories || [])
    .filter((name) => name && name !== "all_recipes")
    .slice()
    .sort();

export const useRecipeFormActions = ({
  formData,
  setFormData,
  initialFormData,
  setValidationErrors,
  setSubmitStatus,
  setUploadingImageIds,
  initialRecipe,
  isEditingTranslation,
  validateForm,
  setInitialFormData,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const {
    createRecipe,
    updateRecipe,
    updateTranslation,
    deleteRecipe,
    loading,
    error,
  } = useRecipeActions();

  // Handle images change
  const handleImagesChange = useCallback(
    (images) => {
      setFormData((prev) => ({ ...prev, images }));
    },
    [setFormData]
  );

  // Reports progress across recipe write, ingredients, categories, images
  const handleSubmitProgress = useCallback(
    ({
      completed,
      total,
      phase,
      phaseCompleted,
      phaseTotal,
      imageId,
      uploading,
    }) => {
      setSubmitStatus({
        percent: Math.round((completed / total) * 100),
        phase,
        phaseCompleted,
        phaseTotal,
      });

      if (imageId !== undefined) {
        setUploadingImageIds((prev) => {
          const newSet = new Set(prev);
          if (uploading) {
            newSet.add(imageId);
          } else {
            newSet.delete(imageId);
          }
          return newSet;
        });
      }
    },
    [setSubmitStatus, setUploadingImageIds]
  );

  // Transform form data for submission
  const transformFormDataForSubmission = useCallback(() => {
    // Helper to prepare ingredient data
    const prepareIngredientData = (ingredient, sectionId = "ungrouped") => {
      let quantity = ingredient.quantity || "";

      // Normalize Unicode fractions
      if (quantity) {
        quantity = normaliseUnicodeFractions(quantity);
      }

      return {
        ingredient_id: ingredient.ingredient_id || null,
        recipe_ingredient_id: ingredient.recipe_ingredient_id || null,
        name: ingredient.name || "",
        quantity: quantity,
        unit: ingredient.unit || "",
        notes: ingredient.notes || "",
        tempId: ingredient.tempId,
        linked_recipe:
          formData.ingredientLinks?.[`${sectionId}-${ingredient.tempId}`] ||
          null,
      };
    };

    // Convert ungrouped ingredients
    const ungroupedIngredients = formData.ungroupedIngredients
      .filter((ing) => ing.name.trim() !== "")
      .map((ing) => prepareIngredientData(ing, "ungrouped"));

    // Convert ingredient sections
    const ingredientSections = formData.ingredientSections
      .filter(
        (section) =>
          section.subheading.trim() !== "" ||
          section.ingredients.some((ing) => ing.name.trim() !== "")
      )
      .map((section) => ({
        id: section.id,
        subheading: section.subheading || "",
        ingredients: section.ingredients
          .filter((ing) => ing.name.trim() !== "")
          .map((ing) => prepareIngredientData(ing, section.id)),
      }));

    const toNutritionValue = (v) =>
      v !== "" && v !== null && v !== undefined ? parseFloat(v) : null;

    const parsedColumns = (formData.nutrition_columns || []).map((col) => ({
      label: col.label || "",
      calories: toNutritionValue(col.calories),
      protein: toNutritionValue(col.protein),
      fat: toNutritionValue(col.fat),
      carbs: toNutritionValue(col.carbs),
      fiber: toNutritionValue(col.fiber),
      sugar: toNutritionValue(col.sugar),
      sodium: toNutritionValue(col.sodium),
    }));

    return {
      title: formData.title.trim(),
      categories: formData.categories,
      servings: formData.servings || null,
      ungroupedIngredients,
      ingredientSections,
      instructions: formData.instructions.filter((inst) => inst.trim() !== ""),
      source: formData.source?.trim() || "",
      notes: formData.notes?.trim() || "",
      images: formData.images || [],
      ingredientLinks: formData.ingredientLinks || {},
      nutrition: buildNutritionColumns(parsedColumns),
    };
  }, [formData]);

  // Confirmed saving without a category, for this session
  const categoryConfirmedRef = useRef(false);
  const [showCategoryConfirm, setShowCategoryConfirm] = useState(false);

  // Called directly, or after confirming a no-category save
  const performSubmit = useCallback(async () => {
    const recipeData = transformFormDataForSubmission();

    try {
      let result;

      if (initialRecipe) {
        if (isEditingTranslation) {
          // Translation editing mode
          const currentLanguage = i18n.language;

          // Prepare translation data
          const translationData = {
            title: recipeData.title,
            source: recipeData.source,
            notes: recipeData.notes,
            instructions: recipeData.instructions,
          };

          // Collect ingredient name overrides and notes updates
          const ingredientOverrides = [];
          const ingredientNotesUpdates = [];

          // Helper functions
          const getOriginalDisplayName = (originalIngredient) => {
            const overrides = originalIngredient.name_overrides || [];
            const override = overrides.find(
              (o) => o.language === currentLanguage
            );
            return (
              override?.name ||
              originalIngredient.singular_name ||
              originalIngredient.name ||
              ""
            );
          };

          const getOriginalDisplayNotes = (originalIngredient) => {
            const notes = originalIngredient.notes_by_language || {};
            return notes[currentLanguage] || originalIngredient.notes || "";
          };

          // Process ungrouped ingredients
          formData.ungroupedIngredients.forEach((ingredient) => {
            if (ingredient.recipe_ingredient_id) {
              const originalIngredient =
                initialRecipe.ungroupedIngredients?.find(
                  (orig) =>
                    orig.recipe_ingredient_id ===
                    ingredient.recipe_ingredient_id
                );

              if (originalIngredient) {
                // Handle name overrides
                if (ingredient.name) {
                  const originalDisplayName =
                    getOriginalDisplayName(originalIngredient);
                  if (originalDisplayName !== ingredient.name) {
                    ingredientOverrides.push({
                      recipe_ingredient_id: ingredient.recipe_ingredient_id,
                      name: ingredient.name,
                      language: currentLanguage,
                    });
                  }
                }

                // Handle notes updates
                const originalDisplayNotes =
                  getOriginalDisplayNotes(originalIngredient);
                const currentNotes = ingredient.notes || "";
                if (originalDisplayNotes !== currentNotes) {
                  ingredientNotesUpdates.push({
                    recipe_ingredient_id: ingredient.recipe_ingredient_id,
                    notes: currentNotes,
                    language: currentLanguage,
                  });
                }
              }
            }
          });

          // Process ingredient sections
          formData.ingredientSections.forEach((section) => {
            section.ingredients.forEach((ingredient) => {
              if (ingredient.recipe_ingredient_id) {
                const originalSection = initialRecipe.ingredientSections?.find(
                  (origSection) => origSection.id === section.id
                );
                const originalIngredient = originalSection?.ingredients?.find(
                  (orig) =>
                    orig.recipe_ingredient_id ===
                    ingredient.recipe_ingredient_id
                );

                if (originalIngredient) {
                  // Handle name overrides
                  if (ingredient.name) {
                    const originalDisplayName =
                      getOriginalDisplayName(originalIngredient);
                    if (originalDisplayName !== ingredient.name) {
                      ingredientOverrides.push({
                        recipe_ingredient_id: ingredient.recipe_ingredient_id,
                        name: ingredient.name,
                        language: currentLanguage,
                      });
                    }
                  }

                  // Handle notes updates
                  const originalDisplayNotes =
                    getOriginalDisplayNotes(originalIngredient);
                  const currentNotes = ingredient.notes || "";
                  if (originalDisplayNotes !== currentNotes) {
                    ingredientNotesUpdates.push({
                      recipe_ingredient_id: ingredient.recipe_ingredient_id,
                      notes: currentNotes,
                      language: currentLanguage,
                    });
                  }
                }
              }
            });
          });

          await updateTranslation(
            initialRecipe.id,
            currentLanguage,
            translationData,
            ingredientOverrides,
            ingredientNotesUpdates
          );
          result = initialRecipe;
        } else {
          // Normal recipe editing - update the original recipe.
          // Omit ingredients/categories when unchanged, so updateRecipe leaves them untouched.
          const ingredientsUnchanged =
            JSON.stringify(formData.ungroupedIngredients) ===
              JSON.stringify(initialFormData.ungroupedIngredients) &&
            JSON.stringify(formData.ingredientSections) ===
              JSON.stringify(initialFormData.ingredientSections);
          const categoriesUnchanged =
            JSON.stringify(normaliseCategories(formData.categories)) ===
            JSON.stringify(normaliseCategories(initialFormData.categories));

          const updateData = { ...recipeData };
          if (ingredientsUnchanged) {
            delete updateData.ungroupedIngredients;
            delete updateData.ingredientSections;
          }
          if (categoriesUnchanged) {
            delete updateData.categories;
          }

          result = await updateRecipe(
            initialRecipe.id,
            updateData,
            handleSubmitProgress
          );
        }
      } else {
        // Create mode - set original_language based on current UI language
        const currentLanguage = i18n.language?.split("-")[0] || "en";
        recipeData.original_language = currentLanguage;

        result = await createRecipe(recipeData, handleSubmitProgress);
      }

      flushSync(() => setInitialFormData(formData));

      // String(id): useRecipe() keys its query off the route param, a string
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["recipe", String(result.id)],
        }),
        queryClient.refetchQueries({ queryKey: ["recipes"] }),
      ]);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      if (result.imageUpdateFailed) {
        toast.add({
          title: t("recipe_saved_image_failed"),
          type: "error",
        });
      } else {
        toast.add({
          title: t(
            initialRecipe ? "recipe_updated_success" : "recipe_created_success"
          ),
          type: "success",
        });
      }
      if (initialRecipe) {
        navigate(-1);
      } else {
        navigate(`/${result.id}/${result.slug}`, { replace: true });
      }
    } catch (err) {
      console.error(
        `Failed to ${initialRecipe ? "update" : "create"} recipe:`,
        err
      );

      if (isDuplicateTitleError(err)) {
        // Treat as a field error, not a generic failure - the fix is the title
        setValidationErrors({ title: t("title_already_exists") });
        scrollToInvalidField();
      } else {
        const errorKey =
          err.message === OFFLINE_ERROR
            ? "action_requires_internet"
            : initialRecipe
              ? "recipe_update_error"
              : "recipe_create_error";
        toast.add({ title: t(errorKey), type: "error" });
      }
    } finally {
      setSubmitStatus(null);
      setUploadingImageIds(new Set());
    }
  }, [
    formData,
    initialFormData,
    initialRecipe,
    isEditingTranslation,
    transformFormDataForSubmission,
    handleSubmitProgress,
    setValidationErrors,
    setSubmitStatus,
    setUploadingImageIds,
    createRecipe,
    updateRecipe,
    updateTranslation,
    navigate,
    setInitialFormData,
    queryClient,
    t,
    i18n,
  ]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Guard double-click before the button re-renders as disabled
      if (loading) {
        return;
      }

      // Validate form
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        scrollToInvalidField();
        return;
      }

      // Clear validation errors if form is valid
      setValidationErrors({});

      if (
        !isEditingTranslation &&
        (formData.categories?.length ?? 0) === 0 &&
        !categoryConfirmedRef.current
      ) {
        setShowCategoryConfirm(true);
        return;
      }

      await performSubmit();
    },
    [
      loading,
      formData,
      isEditingTranslation,
      validateForm,
      setValidationErrors,
      performSubmit,
    ]
  );

  // Confirm saving the recipe without a category
  const confirmSaveWithoutCategory = useCallback(async () => {
    categoryConfirmedRef.current = true;
    setShowCategoryConfirm(false);
    await performSubmit();
  }, [performSubmit]);

  // Dismiss the no-category confirmation, returning to the form
  const cancelCategoryConfirm = useCallback(() => {
    setShowCategoryConfirm(false);
  }, []);

  // Handle cancel action
  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Handle delete action
  const handleDelete = useCallback(async () => {
    if (!initialRecipe) return;
    try {
      await deleteRecipe(initialRecipe.id);
      await queryClient.refetchQueries({ queryKey: ["recipes"] });
      queryClient.removeQueries({
        queryKey: ["recipe", String(initialRecipe.id)],
      });
      navigate("/");
    } catch (err) {
      console.error("Failed to delete recipe:", err);
      const titleKey =
        err.message === OFFLINE_ERROR
          ? "action_requires_internet"
          : "delete_recipe_failed";
      toast.add({ title: t(titleKey), type: "error" });
    }
  }, [initialRecipe, deleteRecipe, navigate, queryClient, t]);

  return {
    handleImagesChange,
    handleSubmit,
    handleCancel,
    handleDelete,
    loading,
    error,
    isOnline,
    showCategoryConfirm,
    confirmSaveWithoutCategory,
    cancelCategoryConfirm,
  };
};
