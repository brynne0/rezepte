import { useState, useCallback, useEffect } from "react";

export const useRecipeFormState = ({ initialRecipe = null }) => {
  // Generate unique IDs for ingredients
  const generateUniqueId = () => {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  };

  const getInitialFormData = useCallback(() => {
    if (initialRecipe) {
      // Handle ungrouped ingredients and sections separately
      let ungroupedIngredients = [];
      let ingredientSections = [];

      if (
        initialRecipe.ungroupedIngredients ||
        initialRecipe.ingredientSections
      ) {
        // New structure with separated ungrouped and grouped ingredients
        ungroupedIngredients = (initialRecipe.ungroupedIngredients || []).map(
          (ing) => ({
            tempId: generateUniqueId(),
            ingredient_id: ing.ingredient_id || "",
            recipe_ingredient_id: ing.recipe_ingredient_id || "",
            name: ing.name || ing.singular_name || "",
            quantity: ing.quantity || "",
            unit: ing.unit || "",
            notes: ing.notes || "",
            linked_recipe: ing.linked_recipe,
          })
        );

        ingredientSections = (initialRecipe.ingredientSections || []).map(
          (section, index) => ({
            id: section.id || `section-${index}`,
            subheading: section.subheading || "",
            ingredients: section.ingredients.map((ing) => ({
              tempId: generateUniqueId(),
              ingredient_id: ing.ingredient_id || "",
              recipe_ingredient_id: ing.recipe_ingredient_id || "",
              name: ing.name || ing.singular_name || "",
              quantity: ing.quantity || "",
              unit: ing.unit || "",
              notes: ing.notes || "",
              linked_recipe: ing.linked_recipe,
            })),
          })
        );
      } else if (initialRecipe.ingredients?.length > 0) {
        // Convert flat ingredient list: separate ungrouped from grouped
        initialRecipe.ingredients.forEach((ing) => {
          const ingredient = {
            tempId: generateUniqueId(),
            ingredient_id: ing.ingredient_id || "",
            name: ing.name || ing.singular_name || "",
            quantity: ing.quantity || "",
            unit: ing.unit || "",
            notes: ing.notes || "",
            linked_recipe: ing.linked_recipe,
          };

          if (!ing.subheading || ing.subheading.trim() === "") {
            ungroupedIngredients.push(ingredient);
          } else {
            // Find or create section
            let section = ingredientSections.find(
              (s) => s.subheading === ing.subheading
            );
            if (!section) {
              section = {
                id: `section-${ingredientSections.length}`,
                subheading: ing.subheading,
                ingredients: [],
              };
              ingredientSections.push(section);
            }
            section.ingredients.push(ingredient);
          }
        });
      }

      // Build ingredient links object - ensure at least one ungrouped ingredient if none exist
      if (
        ungroupedIngredients.length === 0 &&
        ingredientSections.length === 0
      ) {
        ungroupedIngredients = [
          {
            tempId: generateUniqueId(),
            ingredient_id: "",
            recipe_ingredient_id: "",
            name: "",
            quantity: "",
            unit: "",
            notes: "",
          },
        ];
      }

      const ingredientLinks = {};
      ungroupedIngredients.forEach((ing) => {
        if (ing.linked_recipe) {
          const linkKey = `ungrouped-${ing.tempId}`;
          ingredientLinks[linkKey] = ing.linked_recipe;
        }
      });
      ingredientSections.forEach((section) => {
        section.ingredients.forEach((ing) => {
          if (ing.linked_recipe) {
            const linkKey = `${section.id}-${ing.tempId}`;
            ingredientLinks[linkKey] = ing.linked_recipe;
          }
        });
      });

      return {
        title: initialRecipe.title || "",
        categories: initialRecipe.categories || [],
        servings: initialRecipe.servings || "",
        ungroupedIngredients,
        ingredientSections,
        instructions: initialRecipe.instructions || [""],
        source: initialRecipe.source || "",
        notes: initialRecipe.notes || "",
        images: initialRecipe.images || [],
        ingredientLinks,
      };
    }

    // Default empty form
    return {
      title: "",
      categories: [],
      servings: "",
      ungroupedIngredients: [
        {
          tempId: generateUniqueId(),
          ingredient_id: "",
          recipe_ingredient_id: "",
          name: "",
          quantity: "",
          unit: "",
          notes: "",
        },
      ],
      ingredientSections: [],
      instructions: [""],
      source: "",
      notes: "",
      images: [],
      ingredientLinks: {},
    };
  }, [initialRecipe]);

  const [formData, setFormData] = useState(getInitialFormData);
  const [validationErrors, setValidationErrors] = useState({});
  const [submissionError, setSubmissionError] = useState("");
  const [initialFormData, setInitialFormData] = useState(getInitialFormData);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadingImageIds, setUploadingImageIds] = useState(new Set());

  // Update form data when initialRecipe changes (for edit mode)
  useEffect(() => {
    if (initialRecipe) {
      const newFormData = getInitialFormData();
      setFormData(newFormData);
      setInitialFormData(newFormData);
    }
  }, [initialRecipe, getInitialFormData]);

  // Basic input change handler
  const handleInputChange = useCallback(
    (field, value, clearError = false) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear validation error for this field when user types (like auth form)
      // Special handling for categories field since error key is "category"
      const errorKey = field === "categories" ? "category" : field;
      if (clearError || validationErrors[errorKey]) {
        setValidationErrors((prev) => ({ ...prev, [errorKey]: "" }));
      }
    },
    [validationErrors, setValidationErrors]
  );

  // Unsaved changes detection
  const hasUnsavedChanges = useCallback(() => {
    const currentData = JSON.stringify(formData);
    const initial = JSON.stringify(initialFormData);
    return currentData !== initial;
  }, [formData, initialFormData]);

  return {
    // State
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
    submissionError,
    setSubmissionError,
    initialFormData,
    setInitialFormData,
    uploadProgress,
    setUploadProgress,
    isUploadingImages,
    setIsUploadingImages,
    uploadingImageIds,
    setUploadingImageIds,

    // Computed
    isEditMode: !!initialRecipe,

    // Utilities
    generateUniqueId,
    getInitialFormData,
    handleInputChange,
    hasUnsavedChanges,
  };
};
