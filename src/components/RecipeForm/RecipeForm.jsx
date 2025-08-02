import { Trash2, Plus, ArrowBigLeft } from "lucide-react";
import { useRecipeForm } from "../../hooks/forms/useRecipeForm";
import "./RecipeForm.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import AutoResizeTextArea from "../AutoResizeTextArea";

const RecipeForm = ({ categories, initialRecipe = null, title = "" }) => {
  const { t, i18n } = useTranslation();

  const {
    formData,
    validationErrors,
    loading,
    error,
    isEditMode,
    handleInputChange,
    handleTitleBlur,
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
  } = useRecipeForm({ initialRecipe });

  const units = t("units", { returnObjects: true });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const IsLinkRecipe = formData.link_only;

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
            <button onClick={onClose} className="btn btn-action btn-secondary">
              {t("cancel")}
            </button>
            <button onClick={onConfirm} className="btn btn-action btn-danger">
              {t("delete")}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card card-form">
      <header className="page-header flex-center">
        <ArrowBigLeft
          className="back-arrow"
          size={30}
          onClick={() => {
            handleCancel();
          }}
        />
        <h1>{title}</h1>
      </header>

      {/* Recipe type toggle */}
      <div>
        {/* Full Recipe */}
        <button
          className={`subheading-wrapper ${!IsLinkRecipe ? "selected" : ""}`}
          type="button"
          onClick={() => {
            handleInputChange("link_only", false);
          }}
        >
          <h2 className="forta">{t("full_recipe")}</h2>
        </button>
        {/* Link Only Recipe */}
        <button
          className={`subheading-wrapper ${IsLinkRecipe ? "selected" : ""}`}
          type="button"
          onClick={() => {
            handleInputChange("link_only", true);
          }}
        >
          <h2 className="forta">{t("link_only")}</h2>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="recipe-form">
        {error && <div className="error-message">{error}</div>}

        {/* Recipe Title */}
        <div className="form-group">
          <label htmlFor="title" className="form-header-wrapper">
            <h3>{t("recipe_title")}</h3>
          </label>
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
            onBlur={handleTitleBlur}
            className={`input--full-width input--shadow input ${
              validationErrors.title ? "input--error" : ""
            }`}
          />
          {validationErrors.title && (
            <span className="error-message-small">
              {validationErrors.title}
            </span>
          )}
        </div>

        {/* Category */}
        <div className="form-group">
          <label htmlFor="category" className="form-header-wrapper">
            <h3>{t("category")}</h3>
          </label>

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
            className={`input--full-width input--shadow input--select input ${
              validationErrors.category ? "input--error" : ""
            }`}
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
          {validationErrors.category && (
            <span className="error-message-small">
              {validationErrors.category}
            </span>
          )}
        </div>

        {!IsLinkRecipe && (
          <>
            {/* Servings */}
            <div className="form-group">
              <label htmlFor="servings" className="form-header-wrapper">
                <h3> {t("servings")}</h3>
              </label>
              <input
                id="servings"
                type="number"
                min="1"
                value={formData.servings || ""}
                onChange={(e) => handleInputChange("servings", e.target.value)}
                className="input input--full-width input--shadow "
                onWheel={(e) => {
                  e.target.blur();
                }}
              />
            </div>

            {/* Ingredients */}
            <div className="form-group">
              <label className="form-header-wrapper">
                <h3>{t("ingredients")}</h3>
              </label>

              <div className="ingredients-list">
                {formData.ingredients.map((ingredient) => (
                  <div key={ingredient.tempId} className="ingredient-row">
                    {/* Ingredient Name */}
                    <input
                      id={`ingredient-name-${ingredient.tempId}`}
                      type="text"
                      value={ingredient.name || ""}
                      onChange={(e) => {
                        // Apply language-specific capitalisation
                        const value =
                          i18n.language === "de"
                            ? e.target.value.charAt(0).toUpperCase() +
                              e.target.value.slice(1).toLowerCase()
                            : e.target.value.toLowerCase();

                        handleIngredientChange(
                          ingredient.tempId,
                          "name",
                          value,
                          validationErrors.ingredients ? "ingredients" : null
                        );
                      }}
                      className={`input input--full-width input--shadow ${
                        validationErrors.ingredients ? "input--error" : ""
                      }`}
                      placeholder={t("ingredient_name")}
                    />
                    {/* Ingredient Quantity */}
                    <div className="ingredient-details">
                      <input
                        id={`ingredient-quantity-${ingredient.tempId}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={ingredient.quantity || ""}
                        onChange={(e) =>
                          handleIngredientChange(
                            ingredient.tempId,
                            "quantity",
                            e.target.value
                          )
                        }
                        className="input input--full-width input--shadow "
                        placeholder={t("quantity")}
                        onWheel={(e) => {
                          e.target.blur();
                        }}
                      />
                      {/* Ingredient Unit */}
                      <select
                        id={`ingredient-unit-${ingredient.tempId}`}
                        value={ingredient.unit || ""}
                        onChange={(e) =>
                          handleIngredientChange(
                            ingredient.tempId,
                            "unit",
                            e.target.value
                          )
                        }
                        className={
                          "input input--full-width input--select input--shadow "
                        }
                      >
                        {units.map((unit) => (
                          <option key={unit.value} value={unit.value}>
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
                            e.target.value.toLowerCase()
                          )
                        }
                        className="input input--full-width input--shadow "
                        placeholder={t("notes")}
                      />
                      {formData.ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIngredient(ingredient.tempId)}
                          className="btn btn-icon btn-icon-remove"
                          aria-label="Remove ingredient"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="btn-icon-success-wrapper">
                <button
                  type="button"
                  onClick={addIngredient}
                  className="btn btn-icon btn-icon-success"
                >
                  <Plus size={16} />
                </button>
              </div>
              {validationErrors.ingredients && (
                <span className="error-message-small">
                  {validationErrors.ingredients}
                </span>
              )}
            </div>

            {/* Instructions */}
            <div className="form-group">
              <label className="form-header-wrapper">
                <h3>{t("instructions")}</h3>
              </label>

              <div className="instructions-list">
                {formData.instructions.map((instruction, index) => (
                  <div key={index} className="instruction-row">
                    <span className="step-number">{index + 1}.</span>
                    <AutoResizeTextArea
                      value={instruction}
                      onChange={(e) =>
                        handleInstructionChange(index, e.target.value)
                      }
                      onKeyDown={handleEnter}
                      className="input input--full-width input--textarea input--shadow "
                    />
                    <button
                      type="button"
                      onClick={() => removeInstruction(index)}
                      className="btn btn-icon btn-icon-remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="btn-icon-success-wrapper">
                <button
                  type="button"
                  onClick={addInstruction}
                  className="btn btn-icon btn-icon-success"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Source */}
        <div className="form-group">
          <label htmlFor="source" className="form-header-wrapper">
            <h3>{t("source")}</h3>
          </label>
          <input
            id="source"
            type="text"
            value={formData.source || ""}
            onChange={(e) => handleInputChange("source", e.target.value)}
            className="input input--full-width input--shadow "
            placeholder={
              IsLinkRecipe ? t("source_link") : t("source_link_or_note")
            }
          />
        </div>

        {/* Extra Notes */}
        <div className="form-group">
          <label htmlFor="extra-notes" className="form-header-wrapper">
            <h3> {t("notes")}</h3>
          </label>
          <input
            id="extra-notes"
            type="text"
            value={formData.notes || ""}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            className="input input--full-width input--shadow "
            placeholder={t("notes")}
          />
        </div>

        <div className={`form-actions ${isEditMode ? "edit" : ""}`}>
          {/* Delete Button */}
          {isEditMode && (
            <>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="btn btn-action btn-danger"
              >
                {t("delete_recipe")}
              </button>
            </>
          )}
          {/* Cancel Button */}
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-action btn-secondary"
          >
            {t("cancel")}
          </button>
          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-action btn-primary"
          >
            {loading
              ? // TODODODO
                isEditMode
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
