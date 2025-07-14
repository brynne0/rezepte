import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRecipeActions } from "./useRecipeActions";

export const useRecipeForm = (initialRecipe = null) => {
  const navigate = useNavigate();
  const { createRecipe, updateRecipe, deleteRecipe, loading, error } =
    useRecipeActions();

  const getInitialFormData = useCallback(() => {
    if (initialRecipe) {
      return {
        title: initialRecipe.title || "",
        category: initialRecipe.category || "",
        servings: initialRecipe.servings || "",
        instructions:
          initialRecipe.instructions?.length > 0
            ? initialRecipe.instructions
            : [""],
        source: initialRecipe.source || "",
        ingredients:
          initialRecipe.ingredients?.length > 0
            ? initialRecipe.ingredients.map((ing) => ({
                tempId: ing.id || Date.now() + Math.random(),
                ingredient_id: ing.ingredient_id || "",
                name: ing.name || "",
                quantity: ing.quantity || "",
                unit: ing.unit || "",
                notes: ing.notes || "",
              }))
            : [
                {
                  tempId: Date.now() + Math.random(),
                  ingredient_id: "",
                  name: "",
                  quantity: "",
                  unit: "",
                  notes: "",
                },
              ],
      };
    }

    return {
      title: "",
      category: "",
      servings: "",
      instructions: [""],
      source: "",
      ingredients: [
        {
          tempId: Date.now() + Math.random(),
          ingredient_id: "",
          name: "",
          quantity: "",
          unit: "",
          notes: "",
        },
      ],
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

    if (clearError) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleIngredientChange = (tempId, field, value, clearError) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient) =>
        ingredient.tempId === tempId
          ? { ...ingredient, [field]: value }
          : ingredient
      ),
    }));

    if (clearError) {
      setValidationErrors((prev) => ({ ...prev, [clearError]: undefined }));
    }
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
  };

  const removeInstruction = (index) => {
    if (formData.instructions.length > 1) {
      setFormData((prev) => ({
        ...prev,
        instructions: prev.instructions.filter((_, i) => i !== index),
      }));
    }
  };

  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          tempId: Date.now() + Math.random(),
          ingredient_id: "",
          name: "",
          quantity: "",
          unit: "",
          notes: "",
        },
      ],
    }));
  };

  const removeIngredient = (tempId) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter(
        (ingredient) => ingredient.tempId !== tempId
      ),
    }));
  };

  const handleEnter = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      const current = event.target;
      const allTextareas = [
        ...document.querySelectorAll(".instruction-textarea"),
      ];
      const currentIndex = allTextareas.indexOf(current);
      const nextTextarea = allTextareas[currentIndex + 1];

      if (nextTextarea) {
        nextTextarea.focus();
      } else {
        addInstruction();
        setTimeout(() => {
          const newTextareas = document.querySelectorAll(
            ".instruction-textarea"
          );
          newTextareas[newTextareas.length - 1].focus();
        }, 10);
      }
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Recipe title is required";
    }

    if (!formData.category.trim()) {
      errors.category = "Category is required";
    }

    if (formData.ingredients.every((ing) => !ing.name || !ing.name.trim())) {
      errors.ingredients = "At least one ingredient is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const validIngredients = formData.ingredients.filter(
        (ingredient) => ingredient.name && ingredient.name.trim()
      );

      const validInstructions = formData.instructions.filter((instruction) =>
        instruction.trim()
      );

      const recipeData = {
        title: formData.title.trim(),
        category: formData.category.trim(),
        servings: formData.servings ? parseInt(formData.servings) : null,
        instructions: validInstructions,
        source: formData.source.trim() || null,
        ingredients: validIngredients.map((ing) => ({
          name: ing.name.trim(),
          quantity: ing.quantity ? parseFloat(ing.quantity) : null,
          unit: ing.unit.trim() || null,
          notes: ing.notes.trim() || null,
        })),
      };

      let result;
      if (initialRecipe) {
        // Edit mode
        result = await updateRecipe(initialRecipe.id, recipeData);
      } else {
        // Create mode
        result = await createRecipe(recipeData);
      }

      navigate(`/${result.slug}`);
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
      window.location.reload();
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
    handleIngredientChange,
    handleInstructionChange,
    addInstruction,
    removeInstruction,
    addIngredient,
    removeIngredient,
    handleEnter,
    handleSubmit,
    handleCancel,
    handleDelete,
    toTitleCase,
  };
};
