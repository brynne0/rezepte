import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  validateRecipeForm,
  validateRecipeTitleUnique,
} from "../../utils/validation";

export const useRecipeFormValidation = ({
  formData,
  setValidationErrors,
  initialRecipe,
}) => {
  const { t } = useTranslation();

  // Title case conversion utility
  const toTitleCase = useCallback((str) => {
    if (!str) return str;
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }, []);

  // Handle title blur validation
  const handleTitleBlur = useCallback(async () => {
    if (formData.title.trim()) {
      const excludeId = initialRecipe ? initialRecipe.id : null;
      const titleError = await validateRecipeTitleUnique(
        formData.title,
        t,
        excludeId
      );
      if (titleError) {
        setValidationErrors((prev) => ({ ...prev, title: titleError }));
      }
    }
  }, [formData.title, initialRecipe, setValidationErrors, t]);

  // Validate entire form
  const validateForm = useCallback(() => {
    return validateRecipeForm(formData, t);
  }, [formData, t]);

  return {
    toTitleCase,
    handleTitleBlur,
    validateForm,
  };
};
