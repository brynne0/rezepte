import { Trash2, Plus, ArrowBigLeft } from "lucide-react";
import { useRecipeForm } from "../../hooks/useRecipeForm";
import "./RecipeForm.css";
import { useState, useEffect, useRef } from "react";

const RecipeForm = ({ categories, initialRecipe = null, title = "" }) => {
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
    handleDelete,
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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const AutoResizeTextarea = ({ value, onChange, onKeyDown, className }) => {
    const textareaRef = useRef(null);

    const resizeTextarea = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }
    };

    useEffect(() => {
      resizeTextarea();
    }, [value]); // Resize when value changes

    const handleChange = (e) => {
      onChange(e);
      resizeTextarea();
    };

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        className={className}
      />
    );
  };

  // Delete Recipe Modal Component
  const DeleteRecipeModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
      <div className="delete-modal-overlay" onClick={onClose}>
        <div className="delete-modal-content">
          <p className="delete-modal-message">
            Are you sure you want to delete this recipe?
          </p>
          <div className="delete-modal-actions">
            <button onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button onClick={onConfirm} className="delete-btn">
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="recipe-form-container">
      <header className="page-header-wrapper">
        <ArrowBigLeft
          className="form-back-arrow"
          size={30}
          onClick={() => {
            handleCancel();
          }}
        />
        <h1>{title}</h1>
      </header>

      <form onSubmit={handleSubmit} className="recipe-form">
        {error && <div className="error-message">{error}</div>}

        {/* Recipe Title */}
        <div className="form-group">
          <label htmlFor="title" className="form-header">
            Recipe Title
          </label>
          {validationErrors.title && (
            <span className="field-error">{validationErrors.title}</span>
          )}
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) =>
              handleInputChange(
                "title",
                toTitleCase(e.target.value),
                !!validationErrors.title
              )
            }
            className={`form-input ${validationErrors.title ? "error" : ""}`}
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <label htmlFor="category" className="form-header">
            Category
          </label>
          {validationErrors.category && (
            <span className="field-error">{validationErrors.category}</span>
          )}
          <select
            id="category"
            value={formData.category}
            onChange={(e) =>
              handleInputChange(
                "category",
                e.target.value,
                !!validationErrors.category
              )
            }
            className={`form-input ${validationErrors.category ? "error" : ""}`}
            required
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
        </div>

        {/* Servings */}
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

        {/* Ingredients */}
        <div className="form-group">
          <label className="form-header">Ingredients</label>

          {validationErrors.ingredients && (
            <span className="field-error">{validationErrors.ingredients}</span>
          )}

          <div className="ingredients-list">
            {formData.ingredients.map((ingredient) => (
              <div key={ingredient.tempId} className="ingredient-row">
                {/* Ingredient Name */}
                <input
                  id={`ingredient-name-${ingredient.tempId}`}
                  type="text"
                  value={ingredient.name || ""}
                  onChange={(e) => {
                    handleIngredientChange(
                      ingredient.tempId,
                      "name",
                      e.target.value.toLowerCase(),
                      validationErrors.ingredients ? "ingredients" : null
                    );
                  }}
                  className="form-input"
                  placeholder="Ingredient name"
                />
                {/* Ingredient Quantity */}
                <div className="ingredient-details">
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
                    className="form-input"
                    placeholder="Qty"
                    onWheel={(e) => {
                      e.target.blur();
                    }}
                  />
                  {/* Ingredient Unit */}
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
                    className={"form-input"}
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

                  {/* Ingredient Notes */}
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
                    className="form-input"
                    placeholder={isEditMode ? "Notes" : "Extra notes"}
                  />
                  {formData.ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(ingredient.tempId)}
                      className="remove-btn"
                      aria-label="Remove ingredient"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="add-btn-wrapper">
            <button type="button" onClick={addIngredient} className="add-btn">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="form-group">
          <label className="form-header">Instructions</label>

          <div className="instructions-list">
            {formData.instructions.map((instruction, index) => (
              <div key={index} className="instruction-row">
                <span className="step-number">{index + 1}.</span>
                <AutoResizeTextarea
                  value={instruction}
                  onChange={(e) =>
                    handleInstructionChange(index, e.target.value)
                  }
                  onKeyDown={handleEnter}
                  className="instruction-textarea"
                />
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  className="remove-btn"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="add-btn-wrapper">
            <button type="button" onClick={addInstruction} className="add-btn">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Source */}
        <div className="form-group">
          <label htmlFor="source" className="form-header">
            Source
          </label>
          <input
            id="source"
            type="text"
            value={formData.source}
            onChange={(e) => handleInputChange("source", e.target.value)}
            className="form-input"
            placeholder="Source link or note"
          />
        </div>

        <div className={`form-actions ${isEditMode ? "edit" : ""}`}>
          {/* Delete Button */}
          {isEditMode && (
            <>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="delete-btn"
              >
                Delete Recipe
              </button>
            </>
          )}
          {/* Cancel Button */}
          <button type="button" onClick={handleCancel} className="cancel-btn">
            Cancel
          </button>
          {/* Submit button */}
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

      {/* Delete Modal */}
      <DeleteRecipeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        recipeName={formData.title}
      />
    </div>
  );
};

export default RecipeForm;
