import { useState } from "react";
import { createRecipe, updateRecipe, deleteRecipe } from "../../services/recipes";
import { updateTranslationOnly } from "../../services/translationService";

// Hooks for manual CRUD operations
export const useRecipeActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCreateRecipe = async (recipeData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await createRecipe(recipeData);
      return result;
    } catch (err) {
      const errorMessage = err.message || "Failed to create recipe";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecipe = async (id, recipeData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await updateRecipe(id, recipeData);
      return result;
    } catch (err) {
      const errorMessage = err.message || "Failed to update recipe";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (id) => {
    setLoading(true);
    setError(null);

    try {
      const result = await deleteRecipe(id);
      return result;
    } catch (err) {
      const errorMessage = err.message || "Failed to delete recipe";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTranslation = async (id, language, translatedData) => {
    setLoading(true);
    setError(null);

    try {
      const result = await updateTranslationOnly(id, language, translatedData);
      return result;
    } catch (err) {
      const errorMessage = err.message || "Failed to update translation";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    createRecipe: handleCreateRecipe,
    updateRecipe: handleUpdateRecipe,
    updateTranslation: handleUpdateTranslation,
    deleteRecipe: handleDeleteRecipe,
    loading,
    error,
    clearError,
  };
};