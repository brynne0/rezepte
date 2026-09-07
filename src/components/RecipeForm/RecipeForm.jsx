import { useState, Fragment } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  ArrowLeft,
  GripVertical,
  Link,
  NotepadText,
  Clipboard,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "cn";

import { useRecipeForm } from "../../hooks/forms/useRecipeForm";
import { emptyNutritionColumn } from "../../utils/nutritionUtils";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
import ImageUpload from "../ImageUpload/ImageUpload";
import RecipeLinkDropdown from "../RecipeLinkDropdown/RecipeLinkDropdown";
import IngredientRow from "./IngredientRow";
import InstructionsSection from "./InstructionsSection";
import RecipeAutofill from "./RecipeAutofill";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  InputGroup,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const NUTRITION_FORM_FIELDS = [
  { key: "calories", labelKey: "nutrition_calories", unit: "kcal", step: "1" },
  { key: "fiber", labelKey: "nutrition_fiber", unit: "g", step: "0.1" },
  { key: "protein", labelKey: "nutrition_protein", unit: "g", step: "0.1" },
  { key: "sodium", labelKey: "nutrition_sodium", unit: "mg", step: "1" },
  { key: "carbs", labelKey: "nutrition_carbs", unit: "g", step: "0.1" },
  { key: "sugar", labelKey: "nutrition_sugar", unit: "g", step: "0.1" },
  { key: "fat", labelKey: "nutrition_fat", unit: "g", step: "0.1" },
];

const RecipeForm = ({
  categories,
  initialRecipe = null,
  title = "",
  isEditingTranslation = false,
}) => {
  const { t } = useTranslation();

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

  const [showPasteArea, setShowPasteArea] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [linkDropdownOpen, setLinkDropdownOpen] = useState(false);
  const [linkingIngredient, setLinkingIngredient] = useState(null);
  const [showNutrition, setShowNutrition] = useState(() =>
    formData.nutrition_columns.some((col) =>
      ["calories", "protein", "fat", "carbs", "fiber", "sugar", "sodium"].some(
        (k) => col[k] != null
      )
    )
  );

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

  const selectedCategories = formData.categories || [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4">
          <div className="relative flex w-full items-center justify-center">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute left-0"
              onClick={() => navigateWithConfirmation(-1)}
              data-testid="back-arrow"
              aria-label={t("go_back")}
            >
              <ArrowLeft />
            </Button>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {/* Translation Editing Notice */}
          {isEditingTranslation && (
            <div className="rounded-lg border border-dashed border-destructive bg-destructive/10 p-2 text-center text-sm text-destructive">
              {t("editing_translation_notice")}
            </div>
          )}

          {/* Submission Error Message */}
          {submissionError && (
            <div className="text-sm text-destructive">{submissionError}</div>
          )}

          <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.type !== "submit") {
                e.preventDefault();
              }
            }}
            className="flex flex-col gap-6"
            role="form"
          >
            {/*  Recipe Paste Area  */}
            {!isEditingTranslation &&
              (showPasteArea ? (
                <RecipeAutofill
                  onAutofill={handleAutofill}
                  onCancel={() => setShowPasteArea(false)}
                  categories={categories}
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPasteArea(true)}
                >
                  <Clipboard size={16} />
                  {t("autofill_recipe_cta")}
                </Button>
              ))}

            {/* Recipe Title and Servings */}
            <FieldGroup className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <Field data-invalid={!!validationErrors.title}>
                <FieldLabel htmlFor="title">{t("recipe_title")}</FieldLabel>
                <Input
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
                  aria-invalid={!!validationErrors.title}
                />
                <FieldError>{validationErrors.title}</FieldError>
              </Field>

              <Field className={isEditingTranslation ? "opacity-50" : ""}>
                <FieldLabel htmlFor="servings">{t("servings")}</FieldLabel>
                <Input
                  id="servings"
                  type="text"
                  value={formData.servings || ""}
                  onChange={(e) =>
                    handleInputChange("servings", e.target.value)
                  }
                  disabled={isEditingTranslation}
                  onWheel={(e) => {
                    e.target.blur();
                  }}
                />
              </Field>
            </FieldGroup>

            {/* Category */}
            <Field
              data-invalid={!!validationErrors.category}
              className={isEditingTranslation ? "opacity-50" : ""}
            >
              <FieldLabel id="category-label">{t("category")}</FieldLabel>
              <ToggleGroup
                variant="outline"
                multiple
                value={selectedCategories}
                onValueChange={(value) =>
                  handleInputChange("categories", value, true)
                }
                aria-labelledby="category-label"
                className="flex flex-wrap"
                disabled={isEditingTranslation}
              >
                {categories
                  ?.filter((category) => category.value !== "all_recipes")
                  .map((category) => (
                    <ToggleGroupItem
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </ToggleGroupItem>
                  ))}
              </ToggleGroup>
              <FieldError>{validationErrors.category}</FieldError>
            </Field>

            <DragDropContext
              onDragEnd={isEditingTranslation ? () => {} : handleDragEnd}
            >
              {/* Ingredients */}
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel>{t("ingredients")}</FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSection}
                    disabled={isEditingTranslation}
                  >
                    <Plus size={16} />
                    {t("add_section")}
                  </Button>
                </div>

                {/* Ungrouped Ingredients First */}
                {formData.ungroupedIngredients.length > 0 && (
                  <Droppable droppableId="ungrouped" type="ingredient">
                    {(provided, snapshot) => (
                      <div
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-2",
                          snapshot.isDraggingOver && "bg-muted/50"
                        )}
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {formData.ungroupedIngredients.map(
                          (ingredient, index) => (
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
                                  handleIngredientChange={
                                    handleIngredientChange
                                  }
                                  handleIngredientFieldEnter={
                                    handleIngredientFieldEnter
                                  }
                                  handleOpenLinkDropdown={
                                    handleOpenLinkDropdown
                                  }
                                  removeIngredient={removeIngredient}
                                  getIngredientLink={getIngredientLink}
                                  removeIngredientLink={removeIngredientLink}
                                />
                              )}
                            </Draggable>
                          )
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                )}

                {/* Add Ingredient Button for Ungrouped */}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addIngredient("ungrouped")}
                    disabled={isEditingTranslation}
                  >
                    <Plus size={16} data-testid="add-ingredient-btn" />
                    {t("add_ingredient")}
                  </Button>
                </div>

                {/* Ingredient Sections */}
                {formData.ingredientSections.length > 0 && (
                  <Droppable droppableId="sections" type="section">
                    {(provided) => (
                      <div
                        className="flex flex-col gap-2"
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
                                  className={cn(
                                    "flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-2",
                                    snapshot.isDragging && "shadow-md"
                                  )}
                                >
                                  {/* Section Header */}
                                  <div className="flex items-center gap-2">
                                    <div
                                      {...provided.dragHandleProps}
                                      data-slot="drag-handle"
                                      style={{
                                        pointerEvents: isEditingTranslation
                                          ? "none"
                                          : "auto",
                                      }}
                                      className={cn(
                                        "flex cursor-grab items-center text-muted-foreground active:cursor-grabbing",
                                        isEditingTranslation && "opacity-50"
                                      )}
                                    >
                                      <GripVertical size={16} />
                                    </div>
                                    <Input
                                      type="text"
                                      value={section.subheading}
                                      onChange={(e) =>
                                        handleSectionChange(
                                          section.id,
                                          "subheading",
                                          e.target.value
                                        )
                                      }
                                      className="flex-1"
                                      placeholder={t("section_title")}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeSection(section.id)}
                                      disabled={isEditingTranslation}
                                    >
                                      {t("remove_section")}
                                    </Button>
                                  </div>

                                  {/* Section Ingredients */}
                                  <Droppable
                                    droppableId={section.id}
                                    type="ingredient"
                                  >
                                    {(provided, snapshot) => (
                                      <div
                                        className={cn(
                                          "flex flex-col gap-2",
                                          snapshot.isDraggingOver &&
                                            "bg-muted/50"
                                        )}
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
                                  <div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addIngredient(section.id)}
                                      disabled={isEditingTranslation}
                                    >
                                      <Plus
                                        size={16}
                                        data-testid="add-section-ingredient-btn"
                                      />
                                      {t("add_ingredient")}
                                    </Button>
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

                <FieldError>{validationErrors.ingredients}</FieldError>
              </Field>

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
            <Field className={isEditingTranslation ? "opacity-50" : ""}>
              <FieldLabel>{t("images")}</FieldLabel>
              <ImageUpload
                images={formData.images}
                onChange={handleImagesChange}
                disabled={isEditingTranslation}
                uploadingImageIds={uploadingImageIds}
              />
            </Field>

            {/* Source */}
            <Field>
              <FieldLabel htmlFor="source">{t("source")}</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="source"
                  type="text"
                  value={formData.source || ""}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  placeholder={
                    sourceMode === "link" ? t("source_link") : t("source_note")
                  }
                />
                <InputGroupButton
                  type="button"
                  size="icon-sm"
                  onClick={() =>
                    setSourceMode(sourceMode === "link" ? "note" : "link")
                  }
                  aria-label={
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
                </InputGroupButton>
              </InputGroup>
            </Field>

            {/* Extra Notes */}
            <Field>
              <FieldLabel htmlFor="extra-notes">{t("notes")}</FieldLabel>
              <Textarea
                id="extra-notes"
                value={formData.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                  }
                }}
                placeholder={t("notes")}
              />
            </Field>

            {/* Nutrition */}
            <Field className={isEditingTranslation ? "opacity-50" : ""}>
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNutrition((v) => !v)}
                >
                  {showNutrition ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                  {t("nutritional_info")}
                </Button>
                {showNutrition &&
                  (formData.nutrition_columns.length < 2 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleInputChange("nutrition_columns", [
                          ...formData.nutrition_columns,
                          emptyNutritionColumn(),
                        ])
                      }
                      disabled={isEditingTranslation}
                    >
                      + {t("nutrition_add_column")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleInputChange("nutrition_columns", [
                          formData.nutrition_columns[0],
                        ])
                      }
                      disabled={isEditingTranslation}
                    >
                      {t("nutrition_remove_column")}
                    </Button>
                  ))}
              </div>
              {showNutrition && (
                <div
                  className={cn(
                    "grid items-center gap-x-2 gap-y-2",
                    formData.nutrition_columns.length > 1
                      ? "grid-cols-[5rem_5.5rem_5.5rem_auto]"
                      : "grid-cols-[5rem_5.5rem_auto]"
                  )}
                >
                  {/* Label inputs row — aligned with the columns below */}
                  <span />
                  {formData.nutrition_columns.map((col, colIdx) => (
                    <Input
                      key={colIdx}
                      type="text"
                      value={col.label}
                      onChange={(e) => {
                        const updated = formData.nutrition_columns.map(
                          (c, i) =>
                            i === colIdx ? { ...c, label: e.target.value } : c
                        );
                        handleInputChange("nutrition_columns", updated);
                      }}
                      placeholder={
                        colIdx === 0 ? t("nutrition_per_serving") : "per 100g"
                      }
                      disabled={isEditingTranslation}
                    />
                  ))}
                  <span />
                  {/* Data rows */}
                  {NUTRITION_FORM_FIELDS.map(
                    ({ key, labelKey, unit, step }) => (
                      <Fragment key={key}>
                        <span className="text-sm text-muted-foreground">
                          {t(labelKey)}
                        </span>
                        {formData.nutrition_columns.map((col, colIdx) => (
                          <Input
                            key={`${key}-${colIdx}`}
                            type="number"
                            min="0"
                            step={step}
                            value={col[key] ?? ""}
                            onChange={(e) => {
                              const updated = formData.nutrition_columns.map(
                                (c, i) =>
                                  i === colIdx
                                    ? {
                                        ...c,
                                        [key]:
                                          e.target.value === ""
                                            ? null
                                            : e.target.value,
                                      }
                                    : c
                              );
                              handleInputChange("nutrition_columns", updated);
                            }}
                            placeholder="–"
                            disabled={isEditingTranslation}
                            onWheel={(e) => e.target.blur()}
                          />
                        ))}
                        <span className="text-sm text-muted-foreground">
                          {unit}
                        </span>
                      </Fragment>
                    )
                  )}
                </div>
              )}
            </Field>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {/* Delete Button */}
              {isEditMode && (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:mr-auto sm:w-auto"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  {t("delete_recipe")}
                </Button>
              )}
              {/* Cancel Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigateWithConfirmation(-1)}
              >
                {t("cancel")}
              </Button>
              {/* Submit button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto"
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
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_recipe")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("recipe_delete_confirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Modal */}
      <AlertDialog
        open={isUnsavedChangesModalOpen}
        onOpenChange={(open) => {
          // Dismissing (overlay click / Escape) is treated the same as
          // explicitly choosing to leave the page.
          if (!open) confirmNavigation();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsaved_changes_warning")}</AlertDialogTitle>
            <AlertDialogDescription>
              {unsavedChangesMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("leave_page")}</AlertDialogCancel>
            <AlertDialogAction onClick={cancelNavigation}>
              {t("stay")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
