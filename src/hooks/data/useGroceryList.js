import { useState, useEffect } from "react";
import {
  fetchGroceryListForDisplay,
  updateGroceryList,
  addIngredientsToGroceryList,
  clearGroceryList,
  removeFromGroceryList,
} from "../../services/groceryListService";
import { useTranslation } from "react-i18next";

export const useGroceryList = () => {
  const [groceryList, setGroceryList] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [loading, setLoading] = useState(false);
  const [addingToGroceryList, setAddingToGroceryList] = useState(false);
  const [error, setError] = useState(null);
  const { i18n } = useTranslation();

  // Handle checkbox change
  const handleCheckboxChange = (ingredientId) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [ingredientId]: !prev[ingredientId],
    }));
  };

  // Load grocery list from database on mount
  useEffect(() => {
    const loadGroceryList = async () => {
      try {
        setLoading(true);
        const currentLanguage = i18n.language.split("-")[0]; // Normalise language code
        const data = await fetchGroceryListForDisplay(currentLanguage);
        setGroceryList(data);
        setError(null);
      } catch (err) {
        console.error("Error loading grocery list:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadGroceryList();
  }, [i18n.language]);

  // Update grocery list
  const handleUpdateGroceryList = async (updatedList) => {
    try {
      setLoading(true);
      const data = await updateGroceryList(updatedList);
      setGroceryList(data);
      setError(null);
    } catch (err) {
      console.error("Error updating grocery list:", err);
      setError(err.message);
      throw err; // Re-throw so component can handle the error
    } finally {
      setLoading(false);
    }
  };

  // Add selected ingredients to grocery list
  const addToGroceryList = async (
    recipeIngredients,
    recipeTitle = "",
    recipeId = null
  ) => {
    const selectedIngredients = recipeIngredients.filter(
      (ingredient) => checkedIngredients[ingredient.recipe_ingredient_id]
    );

    if (selectedIngredients.length === 0) {
      return;
    }

    try {
      setAddingToGroceryList(true);
      await addIngredientsToGroceryList(
        recipeIngredients,
        checkedIngredients,
        recipeTitle,
        recipeId
      );

      // Reload grocery list with current language
      const currentLanguage = i18n.language.split("-")[0];
      const data = await fetchGroceryListForDisplay(currentLanguage);
      setGroceryList(data);

      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Clear selections
      setCheckedIngredients({});
      setError(null);
    } catch (err) {
      console.error("Error adding to grocery list:", err);
      setError(err.message);
    } finally {
      setAddingToGroceryList(false);
    }
  };

  // Clear grocery list
  const handleClearGroceryList = async () => {
    try {
      setLoading(true);
      const data = await clearGroceryList();
      setGroceryList(data);
      setError(null);
    } catch (err) {
      console.error("Error clearing grocery list:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Remove item from grocery list
  const handleRemoveFromGroceryList = async (itemId) => {
    try {
      const data = await removeFromGroceryList(itemId);
      setGroceryList(data);
      setError(null);
    } catch (err) {
      console.error("Error removing item from grocery list:", err);
      setError(err.message);
    }
  };

  return {
    checkedIngredients,
    groceryList,
    showSuccess,
    loading,
    addingToGroceryList,
    error,
    handleCheckboxChange,
    addToGroceryList,
    clearGroceryList: handleClearGroceryList,
    removeFromGroceryList: handleRemoveFromGroceryList,
    updateGroceryList: handleUpdateGroceryList,
  };
};
