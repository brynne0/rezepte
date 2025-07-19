import { useState } from "react";

export const useGroceryList = () => {
  const [groceryList, setGroceryList] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState({});

  // Handle checkbox change
  const handleCheckboxChange = (ingredientId) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [ingredientId]: !prev[ingredientId],
    }));
  };

  // Add selected ingredients to grocery list
  const addToGroceryList = (recipeIngredients) => {
    const selectedIngredients = recipeIngredients.filter(
      (ingredient) => checkedIngredients[ingredient.id]
    );

    if (selectedIngredients.length === 0) {
      return;
    }

    // Add selected ingredients to grocery list, avoiding duplicates
    setGroceryList((prevList) => {
      const newList = [...prevList];

      selectedIngredients.forEach((ingredient) => {
        // Check if ingredient already exists in the list
        const existingIndex = newList.findIndex(
          (item) => item.name === ingredient.name
        );

        if (existingIndex >= 0) {
          // TODO - also check for plurals using pluralize and convert units
          // If it exists in the list, either:
          // 1. Update quantity (uncomment below)
          // 2. Skip adding (current behavior)
          // newList[existingIndex].quantity += ingredient.quantity;
        } else {
          // Add new ingredient to list
          newList.push({
            id: Date.now() + Math.random(), // Generate unique ID
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            addedAt: new Date().toISOString(),
          });
        }
      });

      return newList;
    });

    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    // Clear selections
    setCheckedIngredients({});
  };

  const clearGroceryList = () => {
    setGroceryList([]);
  };

  // Remove item from grocery list
  const removeFromGroceryList = (itemId) => {
    setGroceryList((prev) => prev.filter((item) => item.id !== itemId));
  };

  return {
    checkedIngredients,
    groceryList,
    showSuccess,
    handleCheckboxChange,
    addToGroceryList,
    clearGroceryList,
    removeFromGroceryList,
  };
};
