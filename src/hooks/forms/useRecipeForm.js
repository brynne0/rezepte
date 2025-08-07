import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useRecipeActions } from "../data/useRecipeActions";
import {
  validateRecipeForm,
  validateRecipeTitleUnique,
} from "../../utils/validation";
import { parseFraction } from "../../utils/fractionUtils";

export const useRecipeForm = ({ initialRecipe = null }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { createRecipe, updateRecipe, deleteRecipe, loading, error } =
    useRecipeActions();

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
            tempId: ing.id || Date.now() + Math.random(),
            ingredient_id: ing.ingredient_id || "",
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
              tempId: ing.id || Date.now() + Math.random(),
              ingredient_id: ing.ingredient_id || "",
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
            tempId: ing.id || Date.now() + Math.random(),
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
            tempId: Date.now() + Math.random(),
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
        category: initialRecipe.category || "",
        servings: initialRecipe.servings || "",
        instructions:
          initialRecipe.instructions?.length > 0
            ? initialRecipe.instructions
            : [""],
        source: initialRecipe.source || "",
        ungroupedIngredients: ungroupedIngredients,
        ingredientSections: ingredientSections,
        link_only: initialRecipe.link_only,
        notes: initialRecipe.notes,
      };
    }

    return {
      title: "",
      category: "",
      servings: "",
      instructions: [""],
      source: "",
      ungroupedIngredients: [
        {
          tempId: Date.now() + Math.random(),
          ingredient_id: "",
          name: "",
          quantity: "",
          unit: "",
          notes: "",
        },
      ],
      ingredientSections: [],
      link_only: false,
      notes: "",
    };
  }, [initialRecipe]);

  const [formData, setFormData] = useState(getInitialFormData);
  const [validationErrors, setValidationErrors] = useState({});

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
    if (clearError || validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
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
    // Parse fractions to decimals for quantity field
    const processedValue = field === "quantity" ? parseFraction(value) : value;

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

    // Focus on the new ingredient text box
    setTimeout(() => {
      const ingredientTextareas = document.querySelectorAll(
        ".instruction-row .input--textarea"
      );
      if (ingredientTextareas.length > 0) {
        ingredientTextareas[ingredientTextareas.length - 1].focus();
      }
    }, 10);
  };

  const removeInstruction = (index) => {
    if (formData.instructions.length > 1) {
      setFormData((prev) => ({
        ...prev,
        instructions: prev.instructions.filter((_, i) => i !== index),
      }));
    }
  };

  const addIngredient = (sectionId) => {
    const newTempId = Date.now() + Math.random();

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
      const newIngredientNameInput = document.getElementById(
        `ingredient-name-${newTempId}`
      );
      if (newIngredientNameInput) {
        newIngredientNameInput.focus();
      }
    }, 10);
  };

  const addSection = () => {
    const newSectionId = `section-${Date.now()}`;
    const newTempId = Date.now() + Math.random();

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

    if (!(await handleValidation())) {
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
        category: formData.category.trim(),
        servings: formData.servings ? parseInt(formData.servings) : null,
        instructions: validInstructions,
        source: formData.source.trim() || null,
        ungroupedIngredients: validUngroupedIngredients.map((ing) => ({
          name: ing.name.trim(),
          quantity: ing.quantity ? parseFloat(ing.quantity) : null,
          unit: ing.unit.trim() || null,
          notes: ing.notes.trim() || null,
        })),
        ingredientSections: validSections.map((section) => ({
          ...section,
          ingredients: section.ingredients.map((ing) => ({
            name: ing.name.trim(),
            quantity: ing.quantity ? parseFloat(ing.quantity) : null,
            unit: ing.unit.trim() || null,
            notes: ing.notes.trim() || null,
          })),
        })),
        link_only: formData.link_only,
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
        result = await updateRecipe(initialRecipe.id, recipeData);
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
