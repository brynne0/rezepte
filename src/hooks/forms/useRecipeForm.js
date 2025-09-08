import { useRecipeFormState } from "./useRecipeFormState";
import { useIngredientManagement } from "./useIngredientManagement";
import { useInstructionsManagement } from "./useInstructionsManagement";
import { useRecipeFormValidation } from "./useRecipeFormValidation";
import { useRecipeFormActions } from "./useRecipeFormActions";

export const useRecipeForm = (options) => {
  // Core form state management
  const formState = useRecipeFormState(options);

  // Form validation
  const validation = useRecipeFormValidation({
    formData: formState.formData,
    setValidationErrors: formState.setValidationErrors,
    initialRecipe: options.initialRecipe,
  });

  // Ingredient management
  const ingredients = useIngredientManagement({
    formData: formState.formData,
    setFormData: formState.setFormData,
    validationErrors: formState.validationErrors,
    setValidationErrors: formState.setValidationErrors,
    generateUniqueId: formState.generateUniqueId,
  });

  // Instructions management
  const instructions = useInstructionsManagement({
    setFormData: formState.setFormData,
  });

  // Form actions (submit, cancel, delete, etc.)
  const actions = useRecipeFormActions({
    formData: formState.formData,
    setFormData: formState.setFormData,
    setSubmissionError: formState.setSubmissionError,
    setIsUploadingImages: formState.setIsUploadingImages,
    setUploadProgress: formState.setUploadProgress,
    setUploadingImageIds: formState.setUploadingImageIds,
    initialRecipe: options.initialRecipe,
    isEditingTranslation: options.isEditingTranslation,
    validateForm: validation.validateForm,
  });

  // Combine all functionality
  return {
    // Form state
    formData: formState.formData,
    validationErrors: formState.validationErrors,
    setValidationErrors: formState.setValidationErrors,
    submissionError: formState.submissionError,
    isEditMode: formState.isEditMode,
    hasUnsavedChanges: formState.hasUnsavedChanges,
    uploadProgress: formState.uploadProgress,
    isUploadingImages: formState.isUploadingImages,
    uploadingImageIds: formState.uploadingImageIds,

    // Basic input handling
    handleInputChange: formState.handleInputChange,

    // Validation
    toTitleCase: validation.toTitleCase,
    handleTitleBlur: validation.handleTitleBlur,

    // Ingredients
    handleIngredientChange: ingredients.handleIngredientChange,
    handleSectionChange: ingredients.handleSectionChange,
    addIngredient: ingredients.addIngredient,
    addSection: ingredients.addSection,
    removeSection: ingredients.removeSection,
    removeIngredient: ingredients.removeIngredient,
    handleIngredientLink: ingredients.handleIngredientLink,
    removeIngredientLink: ingredients.removeIngredientLink,
    getIngredientLink: ingredients.getIngredientLink,
    handleIngredientFieldEnter: ingredients.handleIngredientFieldEnter,
    handleDragEnd: ingredients.handleDragEnd,

    // Instructions
    handleInstructionChange: instructions.handleInstructionChange,
    addInstruction: instructions.addInstruction,
    removeInstruction: instructions.removeInstruction,
    handleEnter: instructions.handleEnter,

    // Actions
    handleImagesChange: actions.handleImagesChange,
    handleSubmit: actions.handleSubmit,
    handleCancel: actions.handleCancel,
    handleDelete: actions.handleDelete,
    loading: actions.loading,
    error: actions.error,
  };
};
