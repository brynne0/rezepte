import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  ArrowBigLeft,
  GripVertical,
  Link,
  NotepadText,
  Clipboard,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import { useRecipeForm } from "../../hooks/forms/useRecipeForm";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
import ConfirmationModal from "../ConfirmationModal/ConfirmationModal";
import ImageUpload from "../ImageUpload/ImageUpload";
import RecipeLinkDropdown from "../RecipeLinkDropdown/RecipeLinkDropdown";
import IngredientRow from "./IngredientRow";
import InstructionsSection from "./InstructionsSection";
import RecipeAutofill from "./RecipeAutofill";
import "./RecipeForm.css";
import AutoResizeTextArea from "../AutoResizeTextArea/AutoResizeTextArea";

const RecipeForm = ({
  categories,
  initialRecipe = null,
  title = "",
  isEditingTranslation = false,
}) => {
  const { t } = useTranslation();

  // Autofill state
  const [showPasteArea, setShowPasteArea] = useState(false);

  // Handle autofill callback from RecipeAutofill component
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
      handleInputChange("title", parsed.title);
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

    // Hide paste area after successful autofill
    setShowPasteArea(false);
  };

  const {
    formData,
    setFormData,
    validationErrors,
    submissionError,
    loading,
    // error,
    isEditMode,
    hasUnsavedChanges,

    uploadingImageIds,
    handleInputChange,
    handleTitleBlur,
    handleImagesChange,
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
    handleDelete,
    toTitleCase,
    handleIngredientLink,
    removeIngredientLink,
    getIngredientLink,
    generateUniqueId,
  } = useRecipeForm({ initialRecipe, isEditingTranslation });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [linkDropdownOpen, setLinkDropdownOpen] = useState(false);
  const [linkingIngredient, setLinkingIngredient] = useState(null);

  // Unsaved changes detection
  const {
    isModalOpen: isUnsavedChangesModalOpen,
    navigate: navigateWithConfirmation,
    confirmNavigation,
    cancelNavigation,
    message: unsavedChangesMessage,
  } = useUnsavedChanges(hasUnsavedChanges(), t("unsaved_changes_warning"));

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

  // Handle opening the recipe link dropdown
  const handleOpenLinkDropdown = (sectionId, tempId, ingredient) => {
    setLinkingIngredient({ sectionId, tempId, ingredient });
    setLinkDropdownOpen(true);
  };

  // Handle selecting a recipe to link to
  const handleSelectRecipe = (recipe) => {
    if (linkingIngredient) {
      handleIngredientLink(
        linkingIngredient.sectionId,
        linkingIngredient.tempId,
        recipe
      );
    }
  };

  return (
    <div className="card card-form">
      <header className="page-header flex-between">
        <button
          className="btn-unstyled back-arrow"
          onClick={() => {
            navigateWithConfirmation(-1);
          }}
          data-testid="back-arrow"
          aria-label={t("go_back")}
        >
          <ArrowBigLeft size={28} />
        </button>
        <h1 className="forta">{title}</h1>

        {/* Recipe Autofill Toggle Button */}
        {!isEditMode ? (
          <div>
            <button
              type="button"
              onClick={() => setShowPasteArea(!showPasteArea)}
              className="btn btn-secondary"
              aria-label={t("autofill_recipe")}
            >
              <Clipboard />
            </button>
          </div>
        ) : (
          <div style={{ visibility: "hidden" }}>
            <Clipboard size={28} />
          </div>
        )}
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

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.type !== "submit") {
            e.preventDefault();
          }
        }}
        className="recipe-form"
        role="form"
      >
        {/*  Recipe Paste Area  */}
        <div className="form-group">
          {showPasteArea && (
            <RecipeAutofill
              onAutofill={handleAutofill}
              categories={categories}
            />
          )}
        </div>

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
                          <IngredientRow
                            ingredient={ingredient}
                            index={index}
                            sectionId="ungrouped"
                            validationErrors={validationErrors}
                            isEditingTranslation={isEditingTranslation}
                            provided={provided}
                            snapshot={snapshot}
                            handleIngredientChange={handleIngredientChange}
                            handleIngredientFieldEnter={
                              handleIngredientFieldEnter
                            }
                            handleOpenLinkDropdown={handleOpenLinkDropdown}
                            removeIngredient={removeIngredient}
                            getIngredientLink={getIngredientLink}
                            removeIngredientLink={removeIngredientLink}
                          />
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
                                  <GripVertical size={16} />
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
                                            <IngredientRow
                                              ingredient={ingredient}
                                              index={ingredientIndex}
                                              sectionId={section.id}
                                              validationErrors={
                                                validationErrors
                                              }
                                              isEditingTranslation={
                                                isEditingTranslation
                                              }
                                              provided={provided}
                                              snapshot={snapshot}
                                              handleIngredientChange={
                                                handleIngredientChange
                                              }
                                              handleIngredientFieldEnter={
                                                handleIngredientFieldEnter
                                              }
                                              handleOpenLinkDropdown={
                                                handleOpenLinkDropdown
                                              }
                                              removeIngredient={
                                                removeIngredient
                                              }
                                              getIngredientLink={
                                                getIngredientLink
                                              }
                                              removeIngredientLink={
                                                removeIngredientLink
                                              }
                                            />
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
          <InstructionsSection
            instructions={formData.instructions}
            isEditingTranslation={isEditingTranslation}
            handleInstructionChange={handleInstructionChange}
            handleEnter={handleEnter}
            removeInstruction={removeInstruction}
            addInstruction={addInstruction}
          />
        </DragDropContext>

        {/* Recipe Images */}
        <div
          className={`form-group ${
            isEditingTranslation ? "translation-disabled" : ""
          }`}
        >
          <div className="form-header">
            <h3>{t("images")}</h3>
          </div>
          <ImageUpload
            images={formData.images}
            onChange={handleImagesChange}
            disabled={isEditingTranslation}
            uploadingImageIds={uploadingImageIds}
          />
        </div>

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
          <AutoResizeTextArea
            id="extra-notes"
            value={formData.notes || ""}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
              }
            }}
            className="input input--full-width input--textarea input--edit"
            placeholder={t("notes")}
          />
        </div>

        <div className={`action-buttons-end ${isEditMode ? "edit" : ""}`}>
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
            onClick={() => navigateWithConfirmation(-1)}
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

      {/* Unsaved Changes Modal */}
      <ConfirmationModal
        isOpen={isUnsavedChangesModalOpen}
        onClose={confirmNavigation}
        onConfirm={cancelNavigation}
        message={unsavedChangesMessage}
        confirmText={t("stay")}
        cancelText={t("leave_page")}
        confirmButtonType="primary"
      />

      {/* Recipe Link Dropdown */}
      <RecipeLinkDropdown
        isOpen={linkDropdownOpen}
        onClose={() => {
          setLinkDropdownOpen(false);
          setLinkingIngredient(null);
        }}
        onSelectRecipe={handleSelectRecipe}
        currentRecipeId={initialRecipe?.id}
      />
    </div>
  );
};

export default RecipeForm;
