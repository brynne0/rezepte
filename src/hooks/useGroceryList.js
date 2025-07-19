import { useState, useEffect } from "react";
import pluralize from "pluralize";
import supabase from "../utils/supabaseClient";

export const useGroceryList = () => {
  const [groceryList, setGroceryList] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle checkbox change
  const handleCheckboxChange = (ingredientId) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [ingredientId]: !prev[ingredientId],
    }));
  };

  // Helper function to normalise ingredient names for comparison
  const normalizeIngredientName = (name) => {
    return pluralize.singular(name.toLowerCase().trim());
  };

  // Load grocery list from database on mount
  useEffect(() => {
    const loadGroceryList = async () => {
      try {
        setLoading(true);

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        const { data, error } = await supabase
          .from("grocery_items")
          .select("*")
          .eq("user_id", user.id)
          .order("id", { ascending: false });

        if (error) {
          throw error;
        }

        setGroceryList(data || []);
        setError(null);
      } catch (err) {
        console.error("Error loading grocery list:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadGroceryList();
  }, []);

  // Add selected ingredients to grocery list
  const addToGroceryList = async (recipeIngredients, recipeTitle = "") => {
    const selectedIngredients = recipeIngredients.filter(
      (ingredient) => checkedIngredients[ingredient.id]
    );

    if (selectedIngredients.length === 0) {
      // No ingredients selected
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get current grocery list from database
      const { data: currentList, error: fetchError } = await supabase
        .from("grocery_items")
        .select("*")
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      const itemsToInsert = [];
      const itemsToUpdate = [];

      selectedIngredients.forEach((ingredient) => {
        // Normalise the ingredient name for comparison
        const normalizedNewName = normalizeIngredientName(ingredient.name);

        // Check if ingredient already exists in the list
        const existingItem = currentList.find((item) => {
          const normalizedExistingName = normalizeIngredientName(item.name);
          return (
            normalizedExistingName === normalizedNewName &&
            item.unit === ingredient.unit
          );
        });

        if (existingItem) {
          // If it exists with same unit, combine quantities
          if (existingItem.quantity && ingredient.quantity) {
            const updatedRecipes = [
              ...(existingItem.source_recipes || []),
              recipeTitle,
            ].filter(Boolean);
            itemsToUpdate.push({
              id: existingItem.id,
              quantity: existingItem.quantity + ingredient.quantity,
              source_recipes: updatedRecipes,
            });
          }
        } else {
          // Add new ingredient
          itemsToInsert.push({
            user_id: user.id,
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            source_recipes: recipeTitle ? [recipeTitle] : [],
          });
        }
      });

      // Insert new grocery items into database
      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("grocery_items")
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      // Update existing items in database
      for (const item of itemsToUpdate) {
        const { error: updateError } = await supabase
          .from("grocery_items")
          .update({
            quantity: item.quantity,
            source_recipes: item.source_recipes,
          })
          .eq("id", item.id);

        if (updateError) throw updateError;
      }

      // Reload the grocery list
      const { data: updatedList, error: reloadError } = await supabase
        .from("grocery_items")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false });

      if (reloadError) throw reloadError;

      setGroceryList(updatedList || []);

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
      setLoading(false);
    }
  };

  // Clear grocery list
  const clearGroceryList = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("grocery_items")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setGroceryList([]);
      setError(null);
    } catch (err) {
      console.error("Error clearing grocery list:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Remove item from grocery list
  const removeFromGroceryList = async (itemId) => {
    try {
      const { error } = await supabase
        .from("grocery_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setGroceryList((prev) => prev.filter((item) => item.id !== itemId));
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
    error,
    handleCheckboxChange,
    addToGroceryList,
    clearGroceryList,
    removeFromGroceryList,
  };
};
