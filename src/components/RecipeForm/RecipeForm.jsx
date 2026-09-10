import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clipboard } from "lucide-react";
import { DragDropContext } from "@hello-pangea/dnd";

import { useRecipeForm } from "../../hooks/forms/useRecipeForm";
import { useRecipeAutofill } from "../../hooks/forms/useRecipeAutofill";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
import ImageUpload from "../ImageUpload/ImageUpload";
import RecipeLinkDropdown from "./RecipeLinkDropdown";
import IngredientsSection from "./IngredientsSection";
import InstructionsSection from "./InstructionsSection";
import NutritionSection from "./NutritionSection";
import RecipeAutofill from "./RecipeAutofill";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RecipeForm = ({
  categories,
  initialRecipe = null,
  title = "",
  isEditingTranslation = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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

  const handleAutofill = useRecipeAutofill({
    setFormData,
    handleInputChange,
    toTitleCase,
    generateUniqueId,
    onDone: () => setShowPasteArea(false),
  });

  // Unsaved changes detection
  const {
    isModalOpen: isUnsavedChangesModalOpen,
    confirmNavigation,
    cancelNavigation,
    message: unsavedChangesMessage,
  } = useUnsavedChanges(hasUnsavedChanges(), t("unsaved_changes_warning"));

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
    <>
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="flex flex-col items-stretch gap-4">
          <div className="relative flex w-full items-center justify-center">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute left-0"
              onClick={() => navigate(-1)}
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
            <Alert variant="destructive">
              <AlertDescription>
                {t("editing_translation_notice")}
              </AlertDescription>
            </Alert>
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
                  className="h-auto w-full items-start whitespace-normal py-1.5 text-center"
                  onClick={() => setShowPasteArea(true)}
                >
                  <Clipboard size={16} className="mt-0.5" />
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
                      className="aria-pressed:border-accent-red aria-pressed:bg-accent-red/10 aria-pressed:text-accent-red"
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
              <IngredientsSection
                ungroupedIngredients={formData.ungroupedIngredients}
                ingredientSections={formData.ingredientSections}
                validationErrors={validationErrors}
                isEditingTranslation={isEditingTranslation}
                addSection={addSection}
                addIngredient={addIngredient}
                removeSection={removeSection}
                handleSectionChange={handleSectionChange}
                handleIngredientChange={handleIngredientChange}
                handleIngredientFieldEnter={handleIngredientFieldEnter}
                handleOpenLinkDropdown={handleOpenLinkDropdown}
                removeIngredient={removeIngredient}
                getIngredientLink={getIngredientLink}
                removeIngredientLink={removeIngredientLink}
              />
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
              <Input
                id="source"
                type="text"
                value={formData.source || ""}
                onChange={(e) => handleInputChange("source", e.target.value)}
                placeholder={t("source_placeholder")}
              />
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
            <NutritionSection
              columns={formData.nutrition_columns}
              onChange={(columns) =>
                handleInputChange("nutrition_columns", columns)
              }
              isEditingTranslation={isEditingTranslation}
            />

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
                onClick={() => navigate(-1)}
              >
                {t("cancel")}
              </Button>
              {/* Submit button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading && <Spinner />}
                {isEditMode
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
    </>
  );
};

export default RecipeForm;
