import { Trash2, Plus, ArrowBigLeft } from "lucide-react";
import { useRecipeForm } from "../../hooks/useRecipeForm";
import "./RecipeForm.css";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const RecipeForm = ({ categories, initialRecipe = null, title = "" }) => {
  const { t } = useTranslation();

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

  const units = t("units", { returnObjects: true });

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
            {t("recipe_delete_confirmation")}
          </p>
          <div className="delete-modal-actions">
            <button onClick={onClose} className="cancel-btn">
              {t("cancel")}
            </button>
            <button onClick={onConfirm} className="delete-btn">
              {t("delete")}
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
            {t("recipe_title")}
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
            {t("category")}
          </label>
          {validationErrors.category && (
            <span className="field-error">{validationErrors.category}</span>
          )}
          <select
            id="category"
            value={formData.category.value}
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
              {t("select_category")}
            </option>
            {categories
              ?.filter((cat) => cat.value.toLowerCase() !== "all")
              .map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label || cat.value}
                </option>
              ))}
          </select>
        </div>

        {/* Servings */}
        <div className="form-group">
          <label htmlFor="servings" className="form-header">
            {t("servings")}
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
          <label className="form-header">{t("ingredients")}</label>

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
                  placeholder={t("ingredient_name")}
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
                    placeholder={t("quantity")}
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
                    {units.map((unit) => (
                      <option
                        key={unit.value}
                        value={unit.value}
                        disabled={unit.disabled}
                      >
                        {unit.label}
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
                    placeholder={isEditMode ? t("notes") : t("extra_notes")}
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
          <label className="form-header">{t("instructions")}</label>

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
            {t("source")}
          </label>
          <input
            id="source"
            type="text"
            value={formData.source}
            onChange={(e) => handleInputChange("source", e.target.value)}
            className="form-input"
            placeholder={t("source_link")}
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
                {t("delete_recipe")}
              </button>
            </>
          )}
          {/* Cancel Button */}
          <button type="button" onClick={handleCancel} className="cancel-btn">
            {t("cancel")}
          </button>
          {/* Submit button */}
          <button type="submit" disabled={loading} className="primary-btn">
            {loading
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
              ? t("update_recipe")
              : t("create_recipe")}
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
