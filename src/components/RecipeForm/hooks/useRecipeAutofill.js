export const useRecipeAutofill = ({
  setFormData,
  handleInputChange,
  toTitleCase,
  generateUniqueId,
  onDone,
}) => {
  const handleAutofill = (parsed) => {
    // Clear existing form data first
    setFormData((prev) => ({
      ...prev,
      title: "",
      servings: "",
      categories: [],
      ungroupedIngredients: [],
      ingredientSections: [],
      instructions: [],
    }));

    // Auto-fill form fields
    if (parsed.title) {
      handleInputChange("title", toTitleCase(parsed.title));
    }
    if (parsed.servings) {
      handleInputChange("servings", parsed.servings);
    }

    // Handle category prediction
    if (parsed.categories && Array.isArray(parsed.categories)) {
      handleInputChange("categories", parsed.categories);
    }

    // Handle ingredient sections (if present)
    if (
      parsed.ingredientSections &&
      Array.isArray(parsed.ingredientSections) &&
      parsed.ingredientSections.length > 0
    ) {
      // Build new sections with proper structure
      const newSections = parsed.ingredientSections.map((section) => ({
        id: `section-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        subheading: section.subheading || "",
        ingredients: section.ingredients.map((ing) => ({
          tempId: generateUniqueId(),
          ingredient_id: "",
          recipe_ingredient_id: "",
          name: ing.name || "",
          quantity: ing.quantity || "",
          unit: ing.unit || "",
          notes: ing.notes || "",
        })),
      }));

      // Add sections (form is already cleared)
      setFormData((prev) => ({
        ...prev,
        ingredientSections: newSections,
      }));
    } else if (
      parsed.ingredients &&
      Array.isArray(parsed.ingredients) &&
      parsed.ingredients.length > 0
    ) {
      // Handle flat ingredients (no sections)
      // Build new ingredients with proper structure
      const newIngredients = parsed.ingredients.map((ing) => ({
        tempId: generateUniqueId(),
        ingredient_id: "",
        recipe_ingredient_id: "",
        name: ing.name || "",
        quantity: ing.quantity || "",
        unit: ing.unit || "",
        notes: ing.notes || "",
      }));

      // Add ingredients (form is already cleared)
      setFormData((prev) => ({
        ...prev,
        ungroupedIngredients: newIngredients,
      }));
    }

    // Handle instructions
    if (
      parsed.instructions &&
      Array.isArray(parsed.instructions) &&
      parsed.instructions.length > 0
    ) {
      // Add instructions (form is already cleared)
      setFormData((prev) => ({
        ...prev,
        instructions: parsed.instructions,
      }));
    }

    // Handle source URL (if provided)
    if (parsed.source) {
      handleInputChange("source", parsed.source);
    }

    onDone?.();
  };

  return handleAutofill;
};
