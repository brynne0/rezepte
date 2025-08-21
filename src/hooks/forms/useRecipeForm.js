import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useRecipeActions } from "../data/useRecipeActions";
import {
  validateRecipeForm,
  validateRecipeTitleUnique,
} from "../../utils/validation";
import { parseFraction } from "../../utils/fractionUtils";

export const useRecipeForm = ({ initialRecipe = null, isEditingTranslation = false }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { createRecipe, updateRecipe, updateTranslation, deleteRecipe, loading, error } =
    useRecipeActions();

  // Generate unique IDs for ingredients
  const generateUniqueId = () => {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

      // Ensure at least one ungrouped ingredient exists if nothing else
      if (
        ungroupedIngredients.length === 0 &&
        ingredientSections.length === 0
      ) {
        ungroupedIngredients = [
          {
            tempId: generateUniqueId(),
            ingredient_id: "",
            name: "",
            quantity: "",
            unit: "",
            notes: "",
          },
        ];
      }

      return {
        title: initialRecipe.title || "",
        categories: initialRecipe.categories || [], // Array of selected categories
        servings: initialRecipe.servings || "",
        instructions:
          initialRecipe.instructions?.length > 0
            ? initialRecipe.instructions
            : [""],
        source: initialRecipe.source || "",
        ungroupedIngredients: ungroupedIngredients,
        ingredientSections: ingredientSections,
        notes: initialRecipe.notes,
      };
    }

    return {
      title: "",
      categories: [], // Array of selected categories
      servings: "",
      instructions: [""],
      source: "",
      ungroupedIngredients: [
        {
          tempId: generateUniqueId(),
          ingredient_id: "",
          name: "",
          quantity: "",
          unit: "",
          notes: "",
        },
      ],
      ingredientSections: [],

      notes: "",
    };
  }, [initialRecipe]);

  const [formData, setFormData] = useState(getInitialFormData);
  const [validationErrors, setValidationErrors] = useState({});
  const [submissionError, setSubmissionError] = useState("");

  // Update form data when initialRecipe changes (for edit mode)
  useEffect(() => {
    if (initialRecipe) {
      setFormData(getInitialFormData());
    }
  }, [initialRecipe, getInitialFormData]);

  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleInputChange = (field, value, clearError = false) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field when user types (like auth form)
    // Special handling for categories field since error key is "category"
    const errorKey = field === "categories" ? "category" : field;
    if (clearError || validationErrors[errorKey]) {
      setValidationErrors((prev) => ({ ...prev, [errorKey]: "" }));
    }
  };

  const handleTitleBlur = async () => {
    if (formData.title.trim()) {
      const excludeId = initialRecipe ? initialRecipe.id : null;
      const titleError = await validateRecipeTitleUnique(
        formData.title,
        t,
        excludeId
      );
      if (titleError) {
        setValidationErrors((prev) => ({ ...prev, title: titleError }));
      }
    }
  };

  const handleIngredientChange = (
    sectionId,
    tempId,
    field,
    value,
    clearError
  ) => {
    // Store raw value - parsing happens during display
    const processedValue = value;

    if (sectionId === "ungrouped") {
      // Handle ungrouped ingredients
      setFormData((prev) => ({
        ...prev,
        ungroupedIngredients: prev.ungroupedIngredients.map((ingredient) =>
          ingredient.tempId === tempId
            ? { ...ingredient, [field]: processedValue }
            : ingredient
        ),
      }));
    } else {
      // Handle grouped ingredients
      setFormData((prev) => ({
        ...prev,
        ingredientSections: prev.ingredientSections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                ingredients: section.ingredients.map((ingredient) =>
                  ingredient.tempId === tempId
                    ? { ...ingredient, [field]: processedValue }
                    : ingredient
                ),
              }
            : section
        ),
      }));
    }

    // Clear validation error for ingredients when user types
    if (clearError || validationErrors[clearError]) {
      setValidationErrors((prev) => ({ ...prev, [clearError]: "" }));
    }
  };

  const handleSectionChange = (sectionId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      ingredientSections: prev.ingredientSections.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section
      ),
    }));
  };

  const handleInstructionChange = (index, value) => {
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions.map((instruction, i) =>
        i === index ? value : instruction
      ),
    }));
  };

  const addInstruction = () => {
    setFormData((prev) => ({
      ...prev,
      instructions: [...prev.instructions, ""],
    }));

    // Focus on the new instruction text box
    setTimeout(() => {
      const instructionTextareas = document.querySelectorAll(
        ".instruction-row .input"
      );
      if (instructionTextareas.length > 0) {
        const lastTextarea = instructionTextareas[instructionTextareas.length - 1];
        lastTextarea.focus();
        // Trigger click to ensure mobile keyboard opens
        lastTextarea.click();
      }
    }, 10);
  };

  const removeInstruction = (index) => {
    setFormData((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  };

  const addIngredient = (sectionId) => {
    const newTempId = generateUniqueId();

    if (sectionId === "ungrouped") {
      // Add to ungrouped ingredients
      setFormData((prev) => ({
        ...prev,
        ungroupedIngredients: [
          ...prev.ungroupedIngredients,
          {
            tempId: newTempId,
            ingredient_id: "",
            name: "",
            quantity: "",
            unit: "",
            notes: "",
          },
        ],
      }));
    } else {
      // Add to specific section
      setFormData((prev) => ({
        ...prev,
        ingredientSections: prev.ingredientSections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                ingredients: [
                  ...section.ingredients,
                  {
                    tempId: newTempId,
                    ingredient_id: "",
                    name: "",
                    quantity: "",
                    unit: "",
                    notes: "",
                  },
                ],
              }
            : section
        ),
      }));
    }

    // Focus on the new ingredient name input
    setTimeout(() => {
      if (sectionId === "ungrouped") {
        // Focus on the last ungrouped ingredient
        const ungroupedInputs = document.querySelectorAll(
          '[id^="ingredient-name-ungrouped-"]'
        );
        if (ungroupedInputs.length > 0) {
          const lastInput = ungroupedInputs[ungroupedInputs.length - 1];
          lastInput.focus();
          // Trigger click to ensure mobile keyboard opens
          lastInput.click();
        }
      } else {
        // Focus on the last ingredient in the specific section
        const sectionInputs = document.querySelectorAll(
          `[id^="ingredient-name-${sectionId}-"]`
        );
        if (sectionInputs.length > 0) {
          const lastInput = sectionInputs[sectionInputs.length - 1];
          lastInput.focus();
          // Trigger click to ensure mobile keyboard opens
          lastInput.click();
        }
      }
    }, 10);
  };

  const addSection = () => {
    const newSectionId = `section-${Date.now()}`;
    const newTempId = generateUniqueId();

    setFormData((prev) => ({
      ...prev,
      ingredientSections: [
        ...prev.ingredientSections,
        {
          id: newSectionId,
          subheading: "",
          ingredients: [
            {
              tempId: newTempId,
              ingredient_id: "",
              name: "",
              quantity: "",
              unit: "",
              notes: "",
            },
          ],
        },
      ],
    }));

    // Focus on the new section title input
    setTimeout(() => {
      const sectionTitleInputs = document.querySelectorAll('.section-title-input');
      if (sectionTitleInputs.length > 0) {
        sectionTitleInputs[sectionTitleInputs.length - 1].focus();
      }
    }, 10);
  };

  const removeSection = (sectionId) => {
    setFormData((prev) => ({
      ...prev,
      ingredientSections: prev.ingredientSections.filter(
        (section) => section.id !== sectionId
      ),
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const { source, destination, type } = result;

    if (type === "section") {
      // Reorder sections
      const reorderedSections = Array.from(formData.ingredientSections);
      const [reorderedSection] = reorderedSections.splice(source.index, 1);
      reorderedSections.splice(destination.index, 0, reorderedSection);

      setFormData((prev) => ({
        ...prev,
        ingredientSections: reorderedSections,
      }));
    } else if (type === "ingredient") {
      // Handle drag between ungrouped, sections, and within same container
      const sourceId = source.droppableId;
      const destId = destination.droppableId;

      if (sourceId === destId) {
        // Reorder within same container (ungrouped or same section)
        if (sourceId === "ungrouped") {
          // Reorder within ungrouped ingredients
          const reorderedIngredients = Array.from(
            formData.ungroupedIngredients
          );
          const [reorderedIngredient] = reorderedIngredients.splice(
            source.index,
            1
          );
          reorderedIngredients.splice(
            destination.index,
            0,
            reorderedIngredient
          );

          setFormData((prev) => ({
            ...prev,
            ungroupedIngredients: reorderedIngredients,
          }));
        } else {
          // Reorder within same section
          const sectionIndex = formData.ingredientSections.findIndex(
            (section) => section.id === sourceId
          );
          const section = formData.ingredientSections[sectionIndex];
          const reorderedIngredients = Array.from(section.ingredients);
          const [reorderedIngredient] = reorderedIngredients.splice(
            source.index,
            1
          );
          reorderedIngredients.splice(
            destination.index,
            0,
            reorderedIngredient
          );

          const newSections = [...formData.ingredientSections];
          newSections[sectionIndex] = {
            ...section,
            ingredients: reorderedIngredients,
          };

          setFormData((prev) => ({
            ...prev,
            ingredientSections: newSections,
          }));
        }
      } else {
        // Move between containers (ungrouped <-> sections or section <-> section)
        let sourceIngredients, destIngredients;
        let movedIngredient;

        // Get source ingredients
        if (sourceId === "ungrouped") {
          sourceIngredients = Array.from(formData.ungroupedIngredients);
          [movedIngredient] = sourceIngredients.splice(source.index, 1);
        } else {
          const sourceSectionIndex = formData.ingredientSections.findIndex(
            (section) => section.id === sourceId
          );
          const sourceSection = formData.ingredientSections[sourceSectionIndex];
          sourceIngredients = Array.from(sourceSection.ingredients);
          [movedIngredient] = sourceIngredients.splice(source.index, 1);
        }

        // Get destination ingredients and insert
        if (destId === "ungrouped") {
          destIngredients = Array.from(formData.ungroupedIngredients);
          destIngredients.splice(destination.index, 0, movedIngredient);
        } else {
          const destSectionIndex = formData.ingredientSections.findIndex(
            (section) => section.id === destId
          );
          const destSection = formData.ingredientSections[destSectionIndex];
          destIngredients = Array.from(destSection.ingredients);
          destIngredients.splice(destination.index, 0, movedIngredient);
        }

        // Update form data
        setFormData((prev) => {
          const newData = { ...prev };

          // Update source
          if (sourceId === "ungrouped") {
            newData.ungroupedIngredients = sourceIngredients;
          } else {
            const sourceSectionIndex = prev.ingredientSections.findIndex(
              (section) => section.id === sourceId
            );
            newData.ingredientSections = [...prev.ingredientSections];
            newData.ingredientSections[sourceSectionIndex] = {
              ...prev.ingredientSections[sourceSectionIndex],
              ingredients: sourceIngredients,
            };
          }

          // Update destination
          if (destId === "ungrouped") {
            newData.ungroupedIngredients = destIngredients;
          } else {
            const destSectionIndex = prev.ingredientSections.findIndex(
              (section) => section.id === destId
            );
            if (!newData.ingredientSections) {
              newData.ingredientSections = [...prev.ingredientSections];
            }
            newData.ingredientSections[destSectionIndex] = {
              ...prev.ingredientSections[destSectionIndex],
              ingredients: destIngredients,
            };
          }

          return newData;
        });
      }
    }
  };

  const removeIngredient = (sectionId, tempId) => {
    if (sectionId === "ungrouped") {
      // Remove from ungrouped ingredients
      setFormData((prev) => ({
        ...prev,
        ungroupedIngredients: prev.ungroupedIngredients.filter(
          (ingredient) => ingredient.tempId !== tempId
        ),
      }));
    } else {
      // Remove from specific section
      setFormData((prev) => ({
        ...prev,
        ingredientSections: prev.ingredientSections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                ingredients: section.ingredients.filter(
                  (ingredient) => ingredient.tempId !== tempId
                ),
              }
            : section
        ),
      }));
    }
  };

  const handleEnter = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      const current = event.target;
      const allTextareas = [...document.querySelectorAll(".input--textarea")];
      const currentIndex = allTextareas.indexOf(current);
      const nextTextarea = allTextareas[currentIndex + 1];

      if (nextTextarea) {
        nextTextarea.focus();
      } else {
        addInstruction();
        setTimeout(() => {
          const newTextareas = document.querySelectorAll(".input--textarea");
          newTextareas[newTextareas.length - 1].focus();
        }, 10);
      }
    }
  };

  const handleValidation = async () => {
    const errors = validateRecipeForm(formData, t);

    // Check for duplicate title (only for new recipes or when title changed)
    if (!errors.title && formData.title.trim()) {
      const excludeId = initialRecipe ? initialRecipe.id : null;
      const titleError = await validateRecipeTitleUnique(
        formData.title,
        t,
        excludeId
      );
      if (titleError) {
        errors.title = titleError;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear any previous submission error
    setSubmissionError("");

    if (!(await handleValidation())) {
      window.scrollTo(0, 0);
      return;
    }

    try {
      // Filter out empty ungrouped ingredients
      const validUngroupedIngredients = formData.ungroupedIngredients.filter(
        (ingredient) => ingredient.name && ingredient.name.trim()
      );

      // Filter out empty sections and ingredients
      const validSections = formData.ingredientSections
        .map((section) => ({
          ...section,
          ingredients: section.ingredients.filter(
            (ingredient) => ingredient.name && ingredient.name.trim()
          ),
        }))
        .filter((section) => section.ingredients.length > 0);

      const validInstructions = formData.instructions.filter((instruction) =>
        instruction.trim()
      );

      const recipeData = {
        title: formData.title.trim(),
        categories: formData.categories || [],
        servings: formData.servings.trim() || null,
        instructions: validInstructions,
        source: formData.source.trim() || null,
        ungroupedIngredients: validUngroupedIngredients.map((ing) => ({
          name: ing.name.trim(),
          quantity: ing.quantity ? parseFraction(ing.quantity) : null,
          unit: ing.unit.trim() || null,
          notes: ing.notes.trim() || null,
        })),
        ingredientSections: validSections.map((section) => ({
          ...section,
          ingredients: section.ingredients.map((ing) => ({
            name: ing.name.trim(),
            quantity: ing.quantity ? parseFraction(ing.quantity) : null,
            unit: ing.unit.trim() || null,
            notes: ing.notes.trim() || null,
          })),
        })),

        notes: formData.notes,
      };

      // Only set original_language when creating a new recipe
      if (!initialRecipe) {
        // Normalise language code (remove region codes like 'de-DE' -> 'de')
        recipeData.original_language = i18n.language.split("-")[0];
      }

      let result;
      if (initialRecipe) {
        // Edit mode
        if (isEditingTranslation) {
          // Translation editing mode - update translation data and ingredient overrides
          const currentLanguage = i18n.language.split("-")[0];
          const translationData = {
            title: recipeData.title,
            instructions: recipeData.instructions,
            notes: recipeData.notes,
            source: recipeData.source,
          };
          
          // Also handle ingredient name overrides and notes updates for translation
          const ingredientOverrides = [];
          const ingredientNotesUpdates = [];
          
          // Helper function to get the original displayed name (accounting for pluralization)
          const getOriginalDisplayName = (originalIngredient) => {
            if (!originalIngredient) return '';
            
            // This should return exactly what the user saw when they opened the translation
            // which is what's in the 'name' field after translation processing
            return originalIngredient.name || '';
          };
          
          // Helper function to get the original displayed notes
          const getOriginalDisplayNotes = (originalIngredient) => {
            if (!originalIngredient) return '';
            return originalIngredient.notes || '';
          };
          
          // Collect ungrouped ingredient overrides (only for changed ingredients)
          formData.ungroupedIngredients.forEach((ingredient) => {
            if (ingredient.recipe_ingredient_id) {
              const originalIngredient = initialRecipe.ungroupedIngredients?.find(
                ing => ing.recipe_ingredient_id === ingredient.recipe_ingredient_id
              );
              
              // Handle name overrides
              if (ingredient.name) {
                const originalDisplayName = getOriginalDisplayName(originalIngredient);
                
                // Only save override if the name actually changed
                if (originalDisplayName !== ingredient.name) {
                  ingredientOverrides.push({
                    recipe_ingredient_id: ingredient.recipe_ingredient_id,
                    name: ingredient.name,
                    language: currentLanguage
                  });
                }
              }
              
              // Handle notes updates
              const originalDisplayNotes = getOriginalDisplayNotes(originalIngredient);
              const currentNotes = ingredient.notes || '';
              
              // Only save notes update if the notes actually changed
              if (originalDisplayNotes !== currentNotes) {
                ingredientNotesUpdates.push({
                  recipe_ingredient_id: ingredient.recipe_ingredient_id,
                  notes: currentNotes,
                  language: currentLanguage
                });
              }
            }
          });
          
          // Collect sectioned ingredient overrides (only for changed ingredients)
          formData.ingredientSections.forEach((section) => {
            section.ingredients.forEach((ingredient) => {
              if (ingredient.recipe_ingredient_id) {
                // Find original ingredient in sections
                let originalIngredient = null;
                for (const originalSection of initialRecipe.ingredientSections || []) {
                  originalIngredient = originalSection.ingredients.find(
                    ing => ing.recipe_ingredient_id === ingredient.recipe_ingredient_id
                  );
                  if (originalIngredient) break;
                }
                
                // Handle name overrides
                if (ingredient.name) {
                  const originalDisplayName = getOriginalDisplayName(originalIngredient);
                  
                  // Only save override if the name actually changed
                  if (originalDisplayName !== ingredient.name) {
                    ingredientOverrides.push({
                      recipe_ingredient_id: ingredient.recipe_ingredient_id,
                      name: ingredient.name,
                      language: currentLanguage
                    });
                  }
                }
                
                // Handle notes updates
                const originalDisplayNotes = getOriginalDisplayNotes(originalIngredient);
                const currentNotes = ingredient.notes || '';
                
                // Only save notes update if the notes actually changed
                if (originalDisplayNotes !== currentNotes) {
                  ingredientNotesUpdates.push({
                    recipe_ingredient_id: ingredient.recipe_ingredient_id,
                    notes: currentNotes,
                    language: currentLanguage
                  });
                }
              }
            });
          });
          
          await updateTranslation(initialRecipe.id, currentLanguage, translationData, ingredientOverrides, ingredientNotesUpdates);
          result = initialRecipe; // Return original recipe data
        } else {
          // Normal recipe editing - update the original recipe
          result = await updateRecipe(initialRecipe.id, recipeData);
        }
      } else {
        // Create mode
        result = await createRecipe(recipeData);
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
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleDelete = async () => {
    if (!initialRecipe) return;
    try {
      await deleteRecipe(initialRecipe.id);

      navigate("/");
    } catch (err) {
      console.error("Failed to delete recipe:", err);
    }
  };

  return {
    formData,
    validationErrors,
    setValidationErrors,
    submissionError,
    loading,
    error,
    isEditMode: !!initialRecipe,
    handleInputChange,
    handleTitleBlur,
    handleIngredientChange,
    handleSectionChange,
    handleInstructionChange,
    addInstruction,
    removeInstruction,
    addIngredient,
    addSection,
    removeSection,
    removeIngredient,
    handleDragEnd,
    handleEnter,
    handleSubmit,
    handleCancel,
    handleDelete,
    toTitleCase,
  };
};
