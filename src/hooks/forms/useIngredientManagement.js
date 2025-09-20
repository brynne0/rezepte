import { useCallback } from "react";

export const useIngredientManagement = ({
  formData,
  setFormData,
  validationErrors,
  setValidationErrors,
  generateUniqueId,
}) => {
  // Handle ingredient field changes
  const handleIngredientChange = useCallback(
    (sectionId, tempId, field, value, clearError) => {
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
    },
    [setFormData, validationErrors, setValidationErrors]
  );

  // Handle section field changes
  const handleSectionChange = useCallback(
    (sectionId, field, value) => {
      setFormData((prev) => ({
        ...prev,
        ingredientSections: prev.ingredientSections.map((section) =>
          section.id === sectionId ? { ...section, [field]: value } : section
        ),
      }));
    },
    [setFormData]
  );

  // Add new ingredient
  const addIngredient = useCallback(
    (sectionId) => {
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
              recipe_ingredient_id: "",
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
                      recipe_ingredient_id: "",
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
            lastInput.click();
          }
        }
      }, 10);
    },
    [setFormData, generateUniqueId]
  );

  // Add new section
  const addSection = useCallback(() => {
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
              recipe_ingredient_id: "",
              name: "",
              quantity: "",
              unit: "",
              notes: "",
            },
          ],
        },
      ],
    }));

    // Focus on the section title input
    setTimeout(() => {
      const sectionInputs = document.querySelectorAll(".section-title-input");
      if (sectionInputs.length > 0) {
        const lastInput = sectionInputs[sectionInputs.length - 1];
        lastInput.focus();
        lastInput.click();
      }
    }, 10);
  }, [setFormData, generateUniqueId]);

  // Remove section
  const removeSection = useCallback(
    (sectionId) => {
      setFormData((prev) => ({
        ...prev,
        ingredientSections: prev.ingredientSections.filter(
          (section) => section.id !== sectionId
        ),
      }));
    },
    [setFormData]
  );

  // Remove ingredient
  const removeIngredient = useCallback(
    (sectionId, tempId) => {
      if (sectionId === "ungrouped") {
        setFormData((prev) => ({
          ...prev,
          ungroupedIngredients: prev.ungroupedIngredients.filter(
            (ingredient) => ingredient.tempId !== tempId
          ),
        }));
      } else {
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
    },
    [setFormData]
  );

  // Handle ingredient linking
  const handleIngredientLink = useCallback(
    (sectionId, tempId, linkedRecipe) => {
      const linkKey = `${sectionId}-${tempId}`;
      setFormData((prev) => ({
        ...prev,
        ingredientLinks: {
          ...prev.ingredientLinks,
          [linkKey]: linkedRecipe,
        },
      }));
    },
    [setFormData]
  );

  // Remove ingredient link
  const removeIngredientLink = useCallback(
    (sectionId, tempId) => {
      const linkKey = `${sectionId}-${tempId}`;
      setFormData((prev) => {
        const newLinks = { ...prev.ingredientLinks };
        delete newLinks[linkKey];
        return {
          ...prev,
          ingredientLinks: newLinks,
        };
      });
    },
    [setFormData]
  );

  // Get ingredient link
  const getIngredientLink = useCallback(
    (sectionId, tempId) => {
      const linkKey = `${sectionId}-${tempId}`;
      const result = formData.ingredientLinks?.[linkKey];
      return result;
    },
    [formData.ingredientLinks]
  );

  // Handle keyboard navigation between ingredient fields
  const handleIngredientFieldEnter = useCallback(
    (e, currentField, sectionId, tempId, index) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();

        const fieldOrder = ["name", "quantity", "unit", "notes"];
        const currentFieldIndex = fieldOrder.indexOf(currentField);
        const nextFieldIndex = currentFieldIndex + 1;

        if (nextFieldIndex < fieldOrder.length) {
          // Move to next field in same ingredient
          const nextField = fieldOrder[nextFieldIndex];
          const nextInput = document.getElementById(
            `ingredient-${nextField}-${sectionId}-${index}-${tempId}`
          );
          if (nextInput) {
            nextInput.focus();
            nextInput.click();
          }
        } else {
          // Move to first field of next ingredient or create new one
          const nextIndex = index + 1;
          let nextIngredientInput;

          if (sectionId === "ungrouped") {
            nextIngredientInput = document.getElementById(
              `ingredient-name-ungrouped-${nextIndex}-${formData.ungroupedIngredients[nextIndex]?.tempId}`
            );
          } else {
            const section = formData.ingredientSections.find(
              (s) => s.id === sectionId
            );
            if (section && section.ingredients[nextIndex]) {
              nextIngredientInput = document.getElementById(
                `ingredient-name-${sectionId}-${nextIndex}-${section.ingredients[nextIndex].tempId}`
              );
            }
          }

          if (nextIngredientInput) {
            nextIngredientInput.focus();
            nextIngredientInput.click();
          } else {
            // No next ingredient, add a new one
            addIngredient(sectionId);
          }
        }
      }
    },
    [formData, addIngredient]
  );

  // Handle drag and drop reordering
  const handleDragEnd = useCallback(
    (result) => {
      if (!result.destination) return;

      const { source, destination, type } = result;

      if (type === "instruction") {
        // Handle instruction reordering
        setFormData((prev) => {
          const newInstructions = Array.from(prev.instructions);
          const [reorderedItem] = newInstructions.splice(source.index, 1);
          newInstructions.splice(destination.index, 0, reorderedItem);
          return { ...prev, instructions: newInstructions };
        });
      } else if (type === "ingredient") {
        // Handle ingredient reordering
        const sourceDroppableId = source.droppableId;
        const destinationDroppableId = destination.droppableId;

        if (sourceDroppableId === destinationDroppableId) {
          // Same container
          if (sourceDroppableId === "ungrouped") {
            setFormData((prev) => {
              const newIngredients = Array.from(prev.ungroupedIngredients);
              const [reorderedItem] = newIngredients.splice(source.index, 1);
              newIngredients.splice(destination.index, 0, reorderedItem);
              return { ...prev, ungroupedIngredients: newIngredients };
            });
          } else {
            // Within a section
            setFormData((prev) => ({
              ...prev,
              ingredientSections: prev.ingredientSections.map((section) =>
                section.id === sourceDroppableId
                  ? {
                      ...section,
                      ingredients: (() => {
                        const newIngredients = Array.from(section.ingredients);
                        const [reorderedItem] = newIngredients.splice(
                          source.index,
                          1
                        );
                        newIngredients.splice(
                          destination.index,
                          0,
                          reorderedItem
                        );
                        return newIngredients;
                      })(),
                    }
                  : section
              ),
            }));
          }
        } else {
          // Different containers - move ingredient
          setFormData((prev) => {
            let sourceIngredients, destinationIngredients;
            let ingredientToMove;

            // Get source ingredients
            if (sourceDroppableId === "ungrouped") {
              sourceIngredients = [...prev.ungroupedIngredients];
              [ingredientToMove] = sourceIngredients.splice(source.index, 1);
            } else {
              const sourceSection = prev.ingredientSections.find(
                (s) => s.id === sourceDroppableId
              );
              sourceIngredients = [...sourceSection.ingredients];
              [ingredientToMove] = sourceIngredients.splice(source.index, 1);
            }

            // Update destination ingredients
            if (destinationDroppableId === "ungrouped") {
              destinationIngredients = [...prev.ungroupedIngredients];
              destinationIngredients.splice(
                destination.index,
                0,
                ingredientToMove
              );
            } else {
              const destinationSection = prev.ingredientSections.find(
                (s) => s.id === destinationDroppableId
              );
              destinationIngredients = [...destinationSection.ingredients];
              destinationIngredients.splice(
                destination.index,
                0,
                ingredientToMove
              );
            }

            // Build new state
            const newState = { ...prev };

            if (sourceDroppableId === "ungrouped") {
              newState.ungroupedIngredients = sourceIngredients;
            } else {
              newState.ingredientSections = prev.ingredientSections.map(
                (section) =>
                  section.id === sourceDroppableId
                    ? { ...section, ingredients: sourceIngredients }
                    : section
              );
            }

            if (destinationDroppableId === "ungrouped") {
              newState.ungroupedIngredients = destinationIngredients;
            } else {
              newState.ingredientSections = newState.ingredientSections.map(
                (section) =>
                  section.id === destinationDroppableId
                    ? { ...section, ingredients: destinationIngredients }
                    : section
              );
            }

            return newState;
          });
        }
      } else if (type === "section") {
        // Handle section reordering
        setFormData((prev) => {
          const newSections = Array.from(prev.ingredientSections);
          const [reorderedItem] = newSections.splice(source.index, 1);
          newSections.splice(destination.index, 0, reorderedItem);
          return { ...prev, ingredientSections: newSections };
        });
      }
    },
    [setFormData]
  );

  return {
    handleIngredientChange,
    handleSectionChange,
    addIngredient,
    addSection,
    removeSection,
    removeIngredient,
    handleIngredientLink,
    removeIngredientLink,
    getIngredientLink,
    handleIngredientFieldEnter,
    handleDragEnd,
  };
};
