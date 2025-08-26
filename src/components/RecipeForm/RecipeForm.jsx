import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Trash2,
  Plus,
  ArrowBigLeft,
  GripHorizontal,
  Link,
  NotepadText,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { useRecipeForm } from "../../hooks/forms/useRecipeForm";
import { formatQuantityForUnit } from "../../utils/ingredientFormatting";
import AutoResizeTextArea from "../AutoResizeTextArea/AutoResizeTextArea";
import ConfirmationModal from "../ConfirmationModal/ConfirmationModal";
import Selector from "../Selector/Selector";
import "./RecipeForm.css";

const RecipeForm = ({
  categories,
  initialRecipe = null,
  title = "",
  isEditingTranslation = false,
}) => {
  const { t, i18n } = useTranslation();
  const units = t("units", { returnObjects: true });

  const {
    formData,
    validationErrors,
    submissionError,
    loading,
    // error,
    isEditMode,
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
    handleIngredientFieldEnter,
    handleSubmit,
    handleCancel,
    handleDelete,
    toTitleCase,
  } = useRecipeForm({ initialRecipe, isEditingTranslation });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [sourceMode, setSourceMode] = useState(() => {
    // Initialise based on existing source content
    if (initialRecipe?.source) {
      const source = initialRecipe.source;
      if (
        source.startsWith("http://") ||
        source.startsWith("https://") ||
        source.startsWith("www.")
      ) {
        return "link";
      } else {
        return "note";
      }
    }
    return "note"; // default to note mode
  });

  // Smart detection: auto-switch between link and note modes
  const handleSourceChange = (value) => {
    handleInputChange("source", value);

    // Auto-detect URLs and switch to link mode
    if (
      value &&
      (value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("www."))
    ) {
      if (sourceMode !== "link") {
        setSourceMode("link");
      }
    } else if (value && sourceMode !== "note") {
      // Auto-switch to note mode for non-link content
      setSourceMode("note");
    }
  };

  return (
    <div className="card card-form">
      <header className="page-header flex-center">
        <button
          className="btn-unstyled back-arrow-left"
          onClick={() => {
            handleCancel();
          }}
          data-testid="back-arrow"
          aria-label={t("go_back")}
        >
          <ArrowBigLeft size={28} />
        </button>
        <h1 className="forta">{title}</h1>
      </header>

      {/* Translation Editing Notice */}
      {isEditingTranslation && (
        <span className="warning-notice flex-center">
          {t("editing_translation_notice")}
        </span>
      )}

      {/* Submission Error Message */}
      {submissionError && (
        <div className="error-message submission-error">{submissionError}</div>
      )}

      <form onSubmit={handleSubmit} className="recipe-form" role="form">
        {/* Recipe Title and Servings */}
        <div className="form-group">
          <div className="title-servings-row">
            <div className="title-field">
              <span className="form-header">
                <h3>{t("recipe_title")}</h3>
              </span>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) =>
                  handleInputChange(
                    "title",
                    e.target.value,
                    !!validationErrors.title
                  )
                }
                onBlur={(e) => {
                  handleInputChange(
                    "title",
                    toTitleCase(e.target.value),
                    !!validationErrors.title
                  );
                  handleTitleBlur();
                }}
                className={`input--full-width input--edit input ${
                  validationErrors.title ? "input--error" : ""
                }`}
              />
              {validationErrors.title && (
                <span className="error-message-small">
                  {validationErrors.title}
                </span>
              )}
            </div>

            <div
              className={`servings-field ${
                isEditingTranslation ? "translation-disabled" : ""
              }`}
            >
              <span className="form-header">
                <h3 id="servings-label">{t("servings")}</h3>
              </span>
              <div
                className={isEditingTranslation ? "translation-disabled" : ""}
              >
                <input
                  id="servings"
                  type="text"
                  value={formData.servings || ""}
                  onChange={(e) =>
                    handleInputChange("servings", e.target.value)
                  }
                  className="input input--full-width input--edit"
                  aria-labelledby="servings-label"
                  disabled={isEditingTranslation}
                  onWheel={(e) => {
                    e.target.blur();
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Category */}
        <div
          className={`form-group ${
            isEditingTranslation ? "translation-disabled" : ""
          }`}
        >
          <div className="form-header">
            <h3 id="category-label">{t("category")}</h3>
          </div>

          <div
            className={`form-categories-wrapper ${
              validationErrors.category ? "input--error" : ""
            } ${isEditingTranslation ? "translation-disabled" : ""}`}
            role="group"
            aria-labelledby="category-label"
          >
            {categories
              ?.filter((category) => category.value !== "all")
              .map((category) => (
                <button
                  key={category.value}
                  type="button"
                  className={`subheading-wrapper${
                    formData.categories?.includes(category.value)
                      ? " selected"
                      : ""
                  }`}
                  disabled={isEditingTranslation}
                  onClick={() => {
                    const currentCategories = formData.categories || [];
                    const isSelected = currentCategories.includes(
                      category.value
                    );
                    const newCategories = isSelected
                      ? currentCategories.filter(
                          (cat) => cat !== category.value
                        )
                      : [...currentCategories, category.value];

                    handleInputChange("categories", newCategories, true);
                  }}
                >
                  <h3 className="forta">{category.label}</h3>
                </button>
              ))}
          </div>
          {validationErrors.category && (
            <span className="error-message-small">
              {validationErrors.category}
            </span>
          )}
        </div>

        <DragDropContext
          onDragEnd={isEditingTranslation ? () => {} : handleDragEnd}
        >
          {/* Ingredients */}
          <div className="form-group">
            <div className="form-header flex-between">
              <h3>{t("ingredients")}</h3>
              <button
                type="button"
                onClick={addSection}
                className={`btn btn-section ${
                  isEditingTranslation ? "translation-disabled" : ""
                }`}
                disabled={isEditingTranslation}
              >
                {t("add_section")}
              </button>
            </div>
            {/* Ungrouped Ingredients First */}
            {formData.ungroupedIngredients.length > 0 && (
              <Droppable droppableId="ungrouped" type="ingredient">
                {(provided, snapshot) => (
                  <div
                    className={`flex-column ingredient-list ${
                      snapshot.isDraggingOver ? "drag-over" : ""
                    }`}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {formData.ungroupedIngredients.map((ingredient, index) => (
                      <Draggable
                        key={`ungrouped-${index}-${ingredient.tempId}`}
                        draggableId={`ungrouped-${index}-${ingredient.tempId}`}
                        index={index}
                        type="ingredient"
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`ingredient-row ${
                              snapshot.isDragging ? "dragging" : ""
                            }`}
                          >
                            {/* Ingredient Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className={`drag-handle ${
                                isEditingTranslation
                                  ? "translation-disabled"
                                  : ""
                              }`}
                              style={{
                                pointerEvents: isEditingTranslation
                                  ? "none"
                                  : "auto",
                              }}
                            >
                              <GripHorizontal size={16} />
                            </div>

                            <div className="ingredient-content">
                              {/* Ingredient Name */}
                              <input
                                id={`ingredient-name-ungrouped-${index}-${ingredient.tempId}`}
                                type="text"
                                value={ingredient.name || ""}
                                onChange={(e) => {
                                  handleIngredientChange(
                                    "ungrouped",
                                    ingredient.tempId,
                                    "name",
                                    e.target.value,
                                    validationErrors.ingredients
                                      ? "ingredients"
                                      : null
                                  );
                                }}
                                onKeyDown={(e) =>
                                  handleIngredientFieldEnter(
                                    e,
                                    "name",
                                    "ungrouped",
                                    ingredient.tempId,
                                    index
                                  )
                                }
                                onBlur={(e) => {
                                  const value =
                                    i18n.language === "de"
                                      ? e.target.value
                                          .split(" ")
                                          .map(
                                            (word) =>
                                              word.charAt(0).toUpperCase() +
                                              word.slice(1).toLowerCase()
                                          )
                                          .join(" ")
                                      : e.target.value.toLowerCase();

                                  handleIngredientChange(
                                    "ungrouped",
                                    ingredient.tempId,
                                    "name",
                                    value,
                                    validationErrors.ingredients
                                      ? "ingredients"
                                      : null
                                  );
                                }}
                                className={`input input--full-width input--edit ${
                                  validationErrors.ingredients
                                    ? "input--error"
                                    : ""
                                }`}
                                placeholder={t("ingredient_name")}
                              />

                              {/* Ingredient Details */}
                              <div className="ingredient-details">
                                <div
                                  className={
                                    isEditingTranslation
                                      ? "translation-disabled"
                                      : ""
                                  }
                                >
                                  <input
                                    id={`ingredient-quantity-ungrouped-${index}-${ingredient.tempId}`}
                                    type="text"
                                    value={formatQuantityForUnit(
                                      ingredient.quantity
                                    )}
                                    onChange={(e) =>
                                      handleIngredientChange(
                                        "ungrouped",
                                        ingredient.tempId,
                                        "quantity",
                                        e.target.value
                                      )
                                    }
                                    onKeyDown={(e) =>
                                      handleIngredientFieldEnter(
                                        e,
                                        "quantity",
                                        "ungrouped",
                                        ingredient.tempId,
                                        index
                                      )
                                    }
                                    className="input input--full-width input--edit"
                                    placeholder={t("quantity")}
                                    disabled={isEditingTranslation}
                                    onWheel={(e) => e.target.blur()}
                                  />
                                </div>

                                <div
                                  className={
                                    isEditingTranslation
                                      ? "translation-disabled"
                                      : ""
                                  }
                                >
                                  <Selector
                                    id={`ingredient-unit-ungrouped-${index}-${ingredient.tempId}`}
                                    value={ingredient.unit || ""}
                                    onChange={(value) =>
                                      handleIngredientChange(
                                        "ungrouped",
                                        ingredient.tempId,
                                        "unit",
                                        value
                                      )
                                    }
                                    onKeyDown={(e) =>
                                      handleIngredientFieldEnter(
                                        e,
                                        "unit",
                                        "ungrouped",
                                        ingredient.tempId,
                                        index
                                      )
                                    }
                                    type="unit"
                                    className="input--full-width"
                                    disabled={isEditingTranslation}
                                  />
                                </div>

                                <input
                                  id={`ingredient-notes-ungrouped-${index}-${ingredient.tempId}`}
                                  type="text"
                                  value={ingredient.notes || ""}
                                  onChange={(e) =>
                                    handleIngredientChange(
                                      "ungrouped",
                                      ingredient.tempId,
                                      "notes",
                                      e.target.value.toLowerCase()
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    handleIngredientFieldEnter(
                                      e,
                                      "notes",
                                      "ungrouped",
                                      ingredient.tempId,
                                      index
                                    )
                                  }
                                  className="input input--full-width input--edit"
                                  placeholder={t("notes")}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeIngredient(
                                      "ungrouped",
                                      ingredient.tempId
                                    )
                                  }
                                  className={`btn btn-icon btn-icon-remove ${
                                    isEditingTranslation
                                      ? "translation-disabled"
                                      : ""
                                  }`}
                                  aria-label={t("remove_ingredient")}
                                  disabled={isEditingTranslation}
                                >
                                  <Trash2
                                    size={16}
                                    data-testid="remove-ingredient-btn"
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}

            {/* Add Ingredient Button for Ungrouped */}
            <div className="flex-center">
              <button
                type="button"
                onClick={() => addIngredient("ungrouped")}
                className={`btn btn-icon btn-icon-green ${
                  isEditingTranslation ? "translation-disabled" : ""
                }`}
                disabled={isEditingTranslation}
              >
                <Plus
                  size={16}
                  data-testid="add-ingredient-btn"
                  aria-label={t("add_ingredient")}
                />
              </button>
            </div>

            {/* Ingredient Sections */}
            {formData.ingredientSections.length > 0 && (
              <Droppable droppableId="sections" type="section">
                {(provided) => (
                  <div
                    className="flex-column"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {formData.ingredientSections.map(
                      (section, sectionIndex) => (
                        <Draggable
                          key={section.id}
                          draggableId={section.id}
                          index={sectionIndex}
                          type="section"
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`ingredient-section ${
                                snapshot.isDragging ? "dragging" : ""
                              }`}
                            >
                              {/* Section Header */}
                              <div className="flex-row">
                                <div
                                  {...provided.dragHandleProps}
                                  className={`drag-handle ${
                                    isEditingTranslation
                                      ? "translation-disabled"
                                      : ""
                                  }`}
                                  style={{
                                    pointerEvents: isEditingTranslation
                                      ? "none"
                                      : "auto",
                                  }}
                                >
                                  <GripHorizontal size={16} />
                                </div>
                                <input
                                  type="text"
                                  value={section.subheading}
                                  onChange={(e) =>
                                    handleSectionChange(
                                      section.id,
                                      "subheading",
                                      e.target.value
                                    )
                                  }
                                  className="input input--borderless section-title-input"
                                  placeholder={t("section_title")}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeSection(section.id)}
                                  className={`btn btn-section ${
                                    isEditingTranslation
                                      ? "translation-disabled"
                                      : ""
                                  }`}
                                  disabled={isEditingTranslation}
                                >
                                  {t("remove_section")}
                                </button>
                              </div>

                              {/* Section Ingredients */}
                              <Droppable
                                droppableId={section.id}
                                type="ingredient"
                              >
                                {(provided, snapshot) => (
                                  <div
                                    className={`flex-column ingredient-list ${
                                      snapshot.isDraggingOver ? "drag-over" : ""
                                    }`}
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                  >
                                    {section.ingredients.map(
                                      (ingredient, ingredientIndex) => (
                                        <Draggable
                                          key={`${section.id}-${ingredientIndex}-${ingredient.tempId}`}
                                          draggableId={`${section.id}-${ingredientIndex}-${ingredient.tempId}`}
                                          index={ingredientIndex}
                                          type="ingredient"
                                        >
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              className={`ingredient-row ${
                                                snapshot.isDragging
                                                  ? "dragging"
                                                  : ""
                                              }`}
                                            >
                                              {/* Ingredient Drag Handle */}
                                              <div
                                                {...provided.dragHandleProps}
                                                className={`drag-handle ${
                                                  isEditingTranslation
                                                    ? "translation-disabled"
                                                    : ""
                                                }`}
                                                style={{
                                                  pointerEvents:
                                                    isEditingTranslation
                                                      ? "none"
                                                      : "auto",
                                                }}
                                              >
                                                <GripHorizontal size={16} />
                                              </div>

                                              <div className="ingredient-content">
                                                {/* Ingredient Name */}
                                                <input
                                                  id={`ingredient-name-${section.id}-${ingredientIndex}-${ingredient.tempId}`}
                                                  type="text"
                                                  value={ingredient.name || ""}
                                                  onChange={(e) => {
                                                    handleIngredientChange(
                                                      section.id,
                                                      ingredient.tempId,
                                                      "name",
                                                      e.target.value,
                                                      validationErrors.ingredients
                                                        ? "ingredients"
                                                        : null
                                                    );
                                                  }}
                                                  onKeyDown={(e) =>
                                                    handleIngredientFieldEnter(
                                                      e,
                                                      "name",
                                                      section.id,
                                                      ingredient.tempId,
                                                      ingredientIndex
                                                    )
                                                  }
                                                  onBlur={(e) => {
                                                    const value =
                                                      i18n.language === "de"
                                                        ? e.target.value
                                                            .split(" ")
                                                            .map(
                                                              (word) =>
                                                                word
                                                                  .charAt(0)
                                                                  .toUpperCase() +
                                                                word
                                                                  .slice(1)
                                                                  .toLowerCase()
                                                            )
                                                            .join(" ")
                                                        : e.target.value.toLowerCase();

                                                    handleIngredientChange(
                                                      section.id,
                                                      ingredient.tempId,
                                                      "name",
                                                      value,
                                                      validationErrors.ingredients
                                                        ? "ingredients"
                                                        : null
                                                    );
                                                  }}
                                                  className={`input input--full-width input--edit ${
                                                    validationErrors.ingredients
                                                      ? "input--error"
                                                      : ""
                                                  }`}
                                                  placeholder={t(
                                                    "ingredient_name"
                                                  )}
                                                />

                                                {/* Ingredient Details */}
                                                <div className="ingredient-details">
                                                  <div
                                                    className={
                                                      isEditingTranslation
                                                        ? "translation-disabled"
                                                        : ""
                                                    }
                                                  >
                                                    <input
                                                      id={`ingredient-quantity-${section.id}-${ingredientIndex}-${ingredient.tempId}`}
                                                      type="text"
                                                      value={formatQuantityForUnit(
                                                        ingredient.quantity
                                                      )}
                                                      onChange={(e) =>
                                                        handleIngredientChange(
                                                          section.id,
                                                          ingredient.tempId,
                                                          "quantity",
                                                          e.target.value
                                                        )
                                                      }
                                                      className="input input--full-width input--edit"
                                                      placeholder={t(
                                                        "quantity"
                                                      )}
                                                      disabled={
                                                        isEditingTranslation
                                                      }
                                                      onKeyDown={(e) =>
                                                        handleIngredientFieldEnter(
                                                          e,
                                                          "quantity",
                                                          section.id,
                                                          ingredient.tempId,
                                                          ingredientIndex
                                                        )
                                                      }
                                                      onWheel={(e) =>
                                                        e.target.blur()
                                                      }
                                                    />
                                                  </div>

                                                  <div
                                                    className={
                                                      isEditingTranslation
                                                        ? "translation-disabled"
                                                        : ""
                                                    }
                                                  >
                                                    <Selector
                                                      id={`ingredient-unit-${section.id}-${ingredientIndex}-${ingredient.tempId}`}
                                                      value={
                                                        ingredient.unit || ""
                                                      }
                                                      onChange={(unitValue) =>
                                                        handleIngredientChange(
                                                          section.id,
                                                          ingredient.tempId,
                                                          "unit",
                                                          unitValue
                                                        )
                                                      }
                                                      type="unit"
                                                      onKeyDown={(e) =>
                                                        handleIngredientFieldEnter(
                                                          e,
                                                          "unit",
                                                          section.id,
                                                          ingredient.tempId,
                                                          ingredientIndex
                                                        )
                                                      }
                                                      className="input--full-width"
                                                      disabled={
                                                        isEditingTranslation
                                                      }
                                                    />
                                                  </div>

                                                  <input
                                                    id={`ingredient-notes-${section.id}-${ingredientIndex}-${ingredient.tempId}`}
                                                    type="text"
                                                    value={
                                                      ingredient.notes || ""
                                                    }
                                                    onChange={(e) =>
                                                      handleIngredientChange(
                                                        section.id,
                                                        ingredient.tempId,
                                                        "notes",
                                                        e.target.value.toLowerCase()
                                                      )
                                                    }
                                                    onKeyDown={(e) =>
                                                      handleIngredientFieldEnter(
                                                        e,
                                                        "notes",
                                                        section.id,
                                                        ingredient.tempId,
                                                        ingredientIndex
                                                      )
                                                    }
                                                    className="input input--full-width input--edit"
                                                    placeholder={t("notes")}
                                                  />

                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      removeIngredient(
                                                        section.id,
                                                        ingredient.tempId
                                                      )
                                                    }
                                                    className={`btn btn-icon btn-icon-remove ${
                                                      isEditingTranslation
                                                        ? "translation-disabled"
                                                        : ""
                                                    }`}
                                                    aria-label={t(
                                                      "remove_ingredient"
                                                    )}
                                                    disabled={
                                                      isEditingTranslation
                                                    }
                                                    data-testid={`remove-section-ingredient-btn-${section.id}-${ingredient.tempId}`} // Updated data-testid
                                                  >
                                                    <Trash2 size={16} />
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      )
                                    )}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>

                              {/* Add Ingredient Button */}
                              <div className="flex-center">
                                <button
                                  type="button"
                                  onClick={() => addIngredient(section.id)}
                                  className={`btn btn-icon btn-icon-green ${
                                    isEditingTranslation
                                      ? "translation-disabled"
                                      : ""
                                  }`}
                                  aria-label={t("add_ingredient")}
                                  disabled={isEditingTranslation}
                                >
                                  <Plus
                                    size={16}
                                    data-testid="add-section-ingredient-btn"
                                  />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}

            {validationErrors.ingredients && (
              <span className="error-message-small">
                {validationErrors.ingredients}
              </span>
            )}
          </div>

          {/* Instructions */}
          <div className="form-group">
            <label className="form-header ">
              <h3>{t("instructions")}</h3>
            </label>

            <Droppable droppableId="instructions" type="instruction">
              {(provided, snapshot) => (
                <div
                  className={`flex-column instructions-list ${
                    snapshot.isDraggingOver ? "drag-over" : ""
                  }`}
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {formData.instructions.map((instruction, index) => (
                    <Draggable
                      key={index}
                      draggableId={`instruction-${index}`}
                      index={index}
                      type="instruction"
                      isDragDisabled={isEditingTranslation}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`instruction-row ${
                            snapshot.isDragging ? "dragging" : ""
                          }`}
                        >
                          <div className="flex-column">
                            {/* Step Number */}
                            <span className="step-number">{index + 1}.</span>

                            {/* Instruction Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className={`drag-handle ${
                                isEditingTranslation
                                  ? "translation-disabled"
                                  : ""
                              }`}
                              style={{
                                pointerEvents: isEditingTranslation
                                  ? "none"
                                  : "auto",
                              }}
                            >
                              <GripHorizontal size={16} />
                            </div>
                          </div>
                          <AutoResizeTextArea
                            value={instruction}
                            onChange={(e) =>
                              handleInstructionChange(index, e.target.value)
                            }
                            onKeyDown={handleEnter}
                            className="input input--full-width input--textarea input--edit "
                          />

                          <button
                            type="button"
                            onClick={() => removeInstruction(index)}
                            className={`btn btn-icon btn-icon-remove ${
                              isEditingTranslation ? "translation-disabled" : ""
                            }`}
                            aria-label={t("remove_instruction")}
                            disabled={isEditingTranslation}
                          >
                            <Trash2
                              size={16}
                              data-testid="remove-instruction-btn"
                            />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <div className="btn-icon-green-wrapper">
              <button
                type="button"
                onClick={addInstruction}
                className={`btn btn-icon btn-icon-green ${
                  isEditingTranslation ? "translation-disabled" : ""
                }`}
                disabled={isEditingTranslation}
              >
                <Plus
                  size={16}
                  data-testid="add-instruction-btn"
                  aria-label={t("add_instruction")}
                />
              </button>
            </div>
          </div>
        </DragDropContext>

        {/* Source */}
        <div className="form-group">
          <div className="form-header">
            <h3>{t("source")}</h3>
          </div>
          <div className="source-input-wrapper">
            <input
              id="source"
              type="text"
              value={formData.source || ""}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="input input--full-width input--edit"
              placeholder={
                sourceMode === "link" ? t("source_link") : t("source_note")
              }
            />
            <button
              type="button"
              className={`btn btn-icon source-toggle ${
                sourceMode === "link" ? "active" : ""
              }`}
              onClick={() =>
                setSourceMode(sourceMode === "link" ? "note" : "link")
              }
              aria-label={
                sourceMode === "link"
                  ? t("switch_to_note")
                  : t("switch_to_link")
              }
              title={
                sourceMode === "link"
                  ? t("switch_to_note")
                  : t("switch_to_link")
              }
            >
              {sourceMode === "link" ? (
                <Link size={16} />
              ) : (
                <NotepadText size={16} />
              )}
            </button>
          </div>
        </div>

        {/* Extra Notes */}
        <div className="form-group">
          <label htmlFor="extra-notes" className="form-header flex-between">
            <h3> {t("notes")}</h3>
          </label>
          <input
            id="extra-notes"
            type="text"
            value={formData.notes || ""}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            className="input input--full-width input--edit "
            placeholder={t("notes")}
          />
        </div>

        <div className={`btn-wrapper ${isEditMode ? "edit" : ""}`}>
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
              ? isEditMode
                ? isEditingTranslation
                  ? t("updating_translation")
                  : t("updating")
                : t("creating")
              : isEditMode
              ? isEditingTranslation
                ? t("update_translation")
                : t("update_recipe")
              : t("create_recipe")}
          </button>
        </div>
      </form>

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        message={t("recipe_delete_confirmation")}
        confirmText={t("delete")}
        cancelText={t("cancel")}
        confirmButtonType="danger"
      />
    </div>
  );
};

export default RecipeForm;
