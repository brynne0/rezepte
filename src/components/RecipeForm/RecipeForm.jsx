import React from "react";
import { Trash2 } from "lucide-react";

import { useRecipeForm } from "../../hooks/UseRecipeForm";
import "./RecipeForm.css";

const RecipeForm = ({
  categories,
  initialRecipe = null,
  title = "Add New Recipe",
}) => {
  const {
    formData,
    validationErrors,
    loading,
    error,
    isEditMode,
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
    toTitleCase,
  } = useRecipeForm(initialRecipe);

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
    <div className="recipe-form-container">
      <header className="page-header">
        <h1>{title}</h1>
      </header>

      <form onSubmit={handleSubmit} className="recipe-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="title" className="form-header">
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
          />
          {validationErrors.title && (
            <span className="field-error">{validationErrors.title}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="category" className="form-header">
            Category
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleInputChange("category", e.target.value)}
            className={`form-input ${validationErrors.category ? "error" : ""}`}
          >
            <option value="" disabled>
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
          <label htmlFor="servings" className="form-header">
            Servings
          </label>
          <input
            id="servings"
            type="number"
            min="1"
            value={formData.servings}
            onChange={(e) => handleInputChange("servings", e.target.value)}
            className="form-input"
            onWheel={(e) => {
              e.target.blur();
            }}
          />
        </div>

        <div className="form-group">
          <label htmlFor="source" className="form-header">
            Source
          </label>
          <input
            id="source"
            type="url"
            value={formData.source}
            onChange={(e) => handleInputChange("source", e.target.value)}
            className="form-input"
            placeholder="Source link or note"
          />
        </div>

        <div className="form-group">
          <div className="ingredients-header">
            <label className="form-header">Ingredients</label>
            <button type="button" onClick={addIngredient} className="add-btn">
              + Add Ingredient
            </button>
          </div>

          {validationErrors.ingredients && (
            <span className="field-error">{validationErrors.ingredients}</span>
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
                  onWheel={(e) => {
                    e.target.blur();
                  }}
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
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <div className="instructions-header">
            <label className="form-header">Instructions</label>
            <button type="button" onClick={addInstruction} className="add-btn">
              + Add Step
            </button>
          </div>

          {validationErrors.instructions && (
            <span className="field-error">{validationErrors.instructions}</span>
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
                  rows="2"
                  onKeyDown={handleEnter}
                />
                {formData.instructions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="remove-btn"
                  >
                    <Trash2 size={16} />
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
            {loading
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
              ? "Update Recipe"
              : "Create Recipe"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecipeForm;
