import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { X } from "lucide-react";

import "./AddRecipePage.css";

const AddRecipePage = ({ categories }) => {
  const navigate = useNavigate();
  const { createRecipe, loading, error } = useRecipeActions();

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    servings: "",
    instructions: [""],
    image_url: "",
    ingredients: [
      {
        tempId: Date.now(),
        ingredient_id: "",
        quantity: "",
        unit: "",
        notes: "",
      },
    ],
  });

  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleIngredientChange = (tempId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient) =>
        ingredient.tempId === tempId
          ? { ...ingredient, [field]: value }
          : ingredient
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
          tempId: Date.now(),
          ingredient_id: "",
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

  function handleEnter(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      // Find next textarea or create new instruction
      const current = event.target;
      const allTextareas = [
        ...document.querySelectorAll(".instruction-textarea"),
      ];
      const currentIndex = allTextareas.indexOf(current);
      const nextTextarea = allTextareas[currentIndex + 1];

      if (nextTextarea) {
        nextTextarea.focus();
      } else {
        // Call your existing addNewInstruction function
        addInstruction();
        // Focus the new textarea after it's created
        setTimeout(() => {
          const newTextareas = document.querySelectorAll(
            ".instruction-textarea"
          );
          newTextareas[newTextareas.length - 1].focus();
        }, 10);
      }
    }
  }

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

    if (formData.instructions.every((inst) => !inst.trim())) {
      errors.instructions = "At least one instruction is required";
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
      // Filter out empty ingredients and instructions
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
        image_url: formData.image_url.trim() || null,
        ingredients: validIngredients.map((ing) => ({
          name: ing.name.trim(), // Use name instead of ingredient_id
          quantity: ing.quantity ? parseFloat(ing.quantity) : null, // Use parseFloat for decimals
          unit: ing.unit.trim() || null,
          notes: ing.notes.trim() || null,
        })),
      };

      console.log("Submitting recipe data:", recipeData);

      const newRecipe = await createRecipe(recipeData);

      // Navigate to the newly created recipe
      navigate(`/${newRecipe.slug}`);
    } catch (err) {
      console.error("Failed to create recipe:", err);
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };

  const unitOptions = [
    { value: "", label: "Unit", disabled: true },
    { value: "tsp", label: "tsp" },
    { value: "tbsp", label: "tbsp" },
    { value: "cup", label: "cup" },
    { value: "cups", label: "cups" },
    { value: "ml", label: "ml" },
    { value: "g", label: "g" },
    { value: "kg", label: "kg" },
    { value: "can", label: "can" },
    { value: "cans", label: "cans" },
    { value: "piece", label: "piece" },
    { value: "pieces", label: "pieces" },
    { value: "clove", label: "clove" },
    { value: "cloves", label: "cloves" },
  ];

  return (
    <div className="add-recipe-page">
      <div className="add-recipe-container">
        <header className="page-header">
          <h1>Add New Recipe</h1>
        </header>

        <form onSubmit={handleSubmit} className="recipe-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Recipe Title
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) =>
                handleInputChange("title", toTitleCase(e.target.value))
              }
              className={`form-input ${validationErrors.title ? "error" : ""}`}
              // placeholder="Enter recipe title"
            />
            {validationErrors.title && (
              <span className="field-error">{validationErrors.title}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="category" className="form-label">
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className={`form-input ${
                validationErrors.category ? "error" : ""
              }`}
            >
              <option value="" disabled selected>
                Select a category
              </option>
              {categories
                ?.filter((cat) => cat.toLowerCase() !== "alle rezepte")
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>
            {validationErrors.category && (
              <span className="field-error">{validationErrors.category}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="servings" className="form-label">
              Servings
            </label>
            <input
              id="servings"
              type="number"
              min="1"
              value={formData.servings}
              onChange={(e) => handleInputChange("servings", e.target.value)}
              className="form-input"
              // placeholder="Number of servings"
            />
          </div>

          <div className="form-group">
            <label htmlFor="image_url" className="form-label">
              Image URL
            </label>
            <input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => handleInputChange("image_url", e.target.value)}
              className="form-input"
              // placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="form-group">
            <div className="ingredients-header">
              <label className="form-label">Ingredients</label>
              <button type="button" onClick={addIngredient} className="add-btn">
                + Add Ingredient
              </button>
            </div>

            {validationErrors.ingredients && (
              <span className="field-error">
                {validationErrors.ingredients}
              </span>
            )}

            <div className="ingredients-list">
              {formData.ingredients.map((ingredient) => (
                <div key={ingredient.tempId} className="ingredient-row">
                  <input
                    id={`ingredient-name-${ingredient.tempId}`}
                    type="text"
                    value={ingredient.name || ""}
                    onChange={(e) =>
                      handleIngredientChange(
                        ingredient.tempId,
                        "name",
                        e.target.value.toLowerCase()
                      )
                    }
                    className="ingredient-name"
                    placeholder="Ingredient name"
                  />
                  <input
                    id={`ingredient-quantity-${ingredient.tempId}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={ingredient.quantity}
                    onChange={(e) =>
                      handleIngredientChange(
                        ingredient.tempId,
                        "quantity",
                        e.target.value
                      )
                    }
                    className="ingredient-quantity"
                    placeholder="Qty"
                  />
                  <select
                    id={`ingredient-unit-${ingredient.tempId}`}
                    value={ingredient.unit}
                    onChange={(e) =>
                      handleIngredientChange(
                        ingredient.tempId,
                        "unit",
                        e.target.value
                      )
                    }
                    className={`form-input ${
                      validationErrors.unit ? "error" : ""
                    }`}
                  >
                    {unitOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <input
                    id={`ingredient-notes-${ingredient.tempId}`}
                    type="text"
                    value={ingredient.notes}
                    onChange={(e) =>
                      handleIngredientChange(
                        ingredient.tempId,
                        "notes",
                        e.target.value
                      )
                    }
                    className="ingredient-notes"
                    placeholder="Notes (optional)"
                  />
                  {formData.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(ingredient.tempId)}
                      className="remove-btn"
                    >
                      <X />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <div className="instructions-header">
              <label className="form-label">Instructions</label>
              <button
                type="button"
                onClick={addInstruction}
                className="add-btn"
              >
                + Add Step
              </button>
            </div>

            {validationErrors.instructions && (
              <span className="field-error">
                {validationErrors.instructions}
              </span>
            )}

            <div className="instructions-list">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="instruction-row">
                  <span className="step-number">{index + 1}.</span>
                  <textarea
                    value={instruction}
                    onChange={(e) =>
                      handleInstructionChange(index, e.target.value)
                    }
                    className="instruction-textarea"
                    // placeholder={`Step ${index + 1} instructions...`}
                    rows="2"
                    onKeyDown={handleEnter}
                  />
                  {formData.instructions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="remove-btn"
                    >
                      <X />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="secondary-btn"
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="primary-btn">
              {loading ? "Creating..." : "Create Recipe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRecipePage;
