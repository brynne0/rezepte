import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useRecipeActions } from "../data/useRecipeActions";
import { normaliseUnicodeFractions } from "../../utils/fractionUtils";

export const useRecipeFormActions = ({
  formData,
  setFormData,
  setSubmissionError,
  setValidationErrors,
  setIsUploadingImages,
  setUploadProgress,
  setUploadingImageIds,
  initialRecipe,
  isEditingTranslation,
  validateForm,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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

  // Handle image upload progress
  const handleImageUploadProgress = useCallback(
    (imageId, progress) => {
      if (progress === 0) {
        // Starting upload
        setIsUploadingImages(true);
        setUploadingImageIds((prev) => new Set([...prev, imageId]));
      } else if (progress === 100) {
        // Upload complete
        setUploadingImageIds((prev) => {
          const newSet = new Set([...prev]);
          newSet.delete(imageId);
          return newSet;
        });

        if (setUploadingImageIds.size === 1) {
          // This was the last upload
          setIsUploadingImages(false);
          setUploadProgress(null);
        }
      } else {
        // Progress update
        setUploadProgress(progress);
      }
    },
    [setIsUploadingImages, setUploadProgress, setUploadingImageIds]
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
    };
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Clear any previous submission errors
      setSubmissionError("");

      // Validate form
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        window.scrollTo(0, 0);
        return;
      }

      // Clear validation errors if form is valid
      setValidationErrors({});

      const recipeData = transformFormDataForSubmission();
      const hasLocalImages = formData.images?.some((img) => img.file);

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
                  const originalSection =
                    initialRecipe.ingredientSections?.find(
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
            result = initialRecipe; // Return original recipe data
          } else {
            // Normal recipe editing - update the original recipe
            result = await updateRecipe(
              initialRecipe.id,
              recipeData,
              hasLocalImages ? handleImageUploadProgress : null
            );
          }
        } else {
          // Create mode - set original_language based on current UI language
          const currentLanguage = i18n.language?.split("-")[0] || "en";
          recipeData.original_language = currentLanguage;

          result = await createRecipe(
            recipeData,
            hasLocalImages ? handleImageUploadProgress : null
          );
        }

        navigate(`/${result.id}/${result.slug}`);
      } catch (err) {
        console.error(
          `Failed to ${initialRecipe ? "update" : "create"} recipe:`,
          err
        );
        // Set user-friendly error message
        const errorKey = initialRecipe
          ? "recipe_update_error"
          : "recipe_create_error";
        setSubmissionError(t(errorKey));

        // Scroll to top to show the error message
        window.scrollTo(0, 0);
      } finally {
        // Clean up upload state
        setIsUploadingImages(false);
        setUploadProgress(null);
        setUploadingImageIds(new Set());
      }
    },
    [
      formData,
      initialRecipe,
      isEditingTranslation,
      validateForm,
      transformFormDataForSubmission,
      handleImageUploadProgress,
      setSubmissionError,
      setIsUploadingImages,
      setUploadProgress,
      setUploadingImageIds,
      createRecipe,
      updateRecipe,
      updateTranslation,
      navigate,
      t,
      i18n,
    ]
  );

  // Handle cancel action
  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Handle delete action
  const handleDelete = useCallback(async () => {
    if (!initialRecipe) return;
    try {
      await deleteRecipe(initialRecipe.id);
      navigate("/");
    } catch (err) {
      console.error("Failed to delete recipe:", err);
    }
  }, [initialRecipe, deleteRecipe, navigate]);

  return {
    handleImagesChange,
    handleSubmit,
    handleCancel,
    handleDelete,
    loading,
    error,
  };
};
