import pluralize from "pluralize";
import supabase from "../lib/supabase";

// Helper function to normalise ingredient names for comparison
const normalizeIngredientName = (name) => {
  return pluralize.singular(name.toLowerCase().trim());
};

// Load grocery list from database
export const fetchGroceryList = async () => {
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

  return data || [];
};

// Update grocery list - handles both new items and existing items
export const updateGroceryList = async (updatedList) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Get current items from database
  const { data: currentItems, error: fetchError } = await supabase
    .from("grocery_items")
    .select("*")
    .eq("user_id", user.id);

  if (fetchError) throw fetchError;

  const currentItemIds = new Set(currentItems.map((item) => item.id));
  const updatedItemIds = new Set(
    updatedList.filter((item) => item.id).map((item) => item.id)
  );

  // Items to delete (in current but not in updated)
  const itemsToDelete = currentItems.filter(
    (item) => !updatedItemIds.has(item.id)
  );

  // Items to update (existing items with changes)
  const itemsToUpdate = updatedList.filter(
    (item) => item.id && currentItemIds.has(item.id)
  );

  // Items to insert (new items without id or with tempId)
  const itemsToInsert = updatedList
    .filter(
      (item) => !item.id || (item.tempId && item.tempId.startsWith("temp-"))
    )
    .filter(
      (item) =>
        // Only insert items that have a name (avoid empty items)
        item.name && item.name.trim() !== ""
    );

  // Delete removed items
  if (itemsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("grocery_items")
      .delete()
      .in(
        "id",
        itemsToDelete.map((item) => item.id)
      );

    if (deleteError) throw deleteError;
  }

  // Update existing items
  for (const item of itemsToUpdate) {
    const { error: updateError } = await supabase
      .from("grocery_items")
      .update({
        name: item.name,
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit,
        source_recipes: item.source_recipes || [],
      })
      .eq("id", item.id);

    if (updateError) throw updateError;
  }

  // Insert new items
  if (itemsToInsert.length > 0) {
    const itemsWithUserId = itemsToInsert.map((item) => ({
      user_id: user.id,
      name: item.name.trim(),
      quantity: parseFloat(item.quantity) || 0,
      unit: item.unit || "",
      source_recipes: item.source_recipes || [],
    }));

    const { error: insertError } = await supabase
      .from("grocery_items")
      .insert(itemsWithUserId);

    if (insertError) throw insertError;
  }

  // Return refreshed list
  return await fetchGroceryList();
};

// Add selected ingredients to grocery list
export const addIngredientsToGroceryList = async (recipeIngredients, checkedIngredients, recipeTitle = "") => {
  const selectedIngredients = recipeIngredients.filter(
    (ingredient) => checkedIngredients[ingredient.id]
  );

  if (selectedIngredients.length === 0) {
    return await fetchGroceryList(); // Return current list if nothing selected
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("User not authenticated");
  }

  // Get current grocery list from database
  const currentList = await fetchGroceryList();

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

  // Return updated list
  return await fetchGroceryList();
};

// Clear grocery list
export const clearGroceryList = async () => {
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

  return [];
};

// Remove item from grocery list
export const removeFromGroceryList = async (itemId) => {
  const { error } = await supabase
    .from("grocery_items")
    .delete()
    .eq("id", itemId);

  if (error) throw error;

  return await fetchGroceryList();
};