import pluralize from "pluralize";
import supabase from "../lib/supabase";
import { getUserPreferredLanguage } from "./userService";

// Import translateText function for recipe title translation
const translateText = async (text, targetLanguage, sourceLanguage = null) => {
  if (!text || text.trim() === "") {
    return text;
  }

  try {
    const { data, error } = await supabase.functions.invoke("translate", {
      body: {
        text: text.trim(),
        target_lang: targetLanguage.toUpperCase(),
        source_lang: sourceLanguage ? sourceLanguage.toUpperCase() : null,
      },
    });

    if (error) {
      return text; // Return original text on error
    }

    return data?.translatedText || text;
  } catch {
    return text; // Return original text on error
  }
};

// Helper function to normalise ingredient names for comparison
export const normaliseIngredientName = (name) => {
  return pluralize.singular(name.toLowerCase().trim());
};

// Helper function to combine quantities - only handles g/kg and ml/l
const combineQuantities = (
  existingQuantity,
  existingUnit,
  newQuantity,
  newUnit
) => {
  const normaliseUnit = (unit) => {
    if (!unit) return "";
    const normalized = unit.toLowerCase().trim();
    // Handle singular/plural forms - convert "cup/s" to "cup" for matching
    if (normalized.includes("/")) {
      return normalized.split("/")[0];
    }
    return normalized;
  };

  const existingUnitNorm = normaliseUnit(existingUnit);
  const newUnitNorm = normaliseUnit(newUnit);

  // Direct unit match - simple addition
  if (existingUnitNorm === newUnitNorm) {
    return {
      quantity: existingQuantity + newQuantity,
      unit: existingUnit,
    };
  }

  // Only combine g/kg and ml/l - nothing else
  let canCombine = false;
  let existingInBase = existingQuantity;
  let newInBase = newQuantity;

  // Handle ml/l conversion
  if (
    (existingUnitNorm === "ml" && newUnitNorm === "l") ||
    (existingUnitNorm === "l" && newUnitNorm === "ml")
  ) {
    canCombine = true;
    if (existingUnitNorm === "ml") {
      // Keep as ml: existing stays same, convert l to ml
      newInBase = newQuantity * 1000;
    } else {
      // Keep as l: convert ml to l, existing stays same
      existingInBase = existingQuantity / 1000;
    }
  }

  // Handle g/kg conversion
  else if (
    (existingUnitNorm === "g" && newUnitNorm === "kg") ||
    (existingUnitNorm === "kg" && newUnitNorm === "g")
  ) {
    canCombine = true;
    if (existingUnitNorm === "g") {
      // Keep as g: existing stays same, convert kg to g
      newInBase = newQuantity * 1000;
    } else {
      // Keep as kg: convert g to kg, existing stays same
      existingInBase = existingQuantity / 1000;
    }
  }

  if (canCombine) {
    return {
      quantity: existingInBase + newInBase,
      unit: existingUnit, // Keep original unit
    };
  }

  // Units not convertible - return null
  return null;
};

// Helper function to get recipe title in user's preferred language
const getRecipeTitleInPreferredLanguage = async (
  recipeTitle,
  userPreferredLang,
  recipeId = null
) => {
  try {
    // If already in preferred language, return as is
    if (!recipeTitle || userPreferredLang === "en") {
      return recipeTitle;
    }

    // If we have recipe ID, try to get cached translation from database
    if (recipeId) {
      const { data: recipe } = await supabase
        .from("recipes")
        .select("translated_recipe, original_language")
        .eq("id", recipeId)
        .single();

      if (recipe?.translated_recipe?.[userPreferredLang]?.title) {
        return recipe.translated_recipe[userPreferredLang].title;
      }

      // Translate from original language if different from English
      const sourceLanguage = recipe?.original_language || "en";
      return await translateText(
        recipeTitle,
        userPreferredLang,
        sourceLanguage
      );
    }

    // No recipe ID, just translate the title
    return await translateText(recipeTitle, userPreferredLang);
  } catch (error) {
    console.error("Error getting recipe title in preferred language:", error);
    return recipeTitle; // Return original on error
  }
};

// Helper function to get ingredient name in user's preferred language with quantity awareness
const getIngredientNameInPreferredLanguage = async (
  ingredientName,
  quantity,
  targetLanguage
) => {
  try {
    // Get all ingredients and search through them (including translations)
    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("singular_name, plural_name, translated_names");

    if (!ingredients || ingredients.length === 0) return ingredientName;

    const normalizedInput = normaliseIngredientName(ingredientName);
    const shouldUsePlural = quantity && parseFloat(quantity) > 1;

    // Find matching ingredient
    const ingredient = ingredients.find((ing) => {
      // Check English names
      if (
        normaliseIngredientName(ing.singular_name) === normalizedInput ||
        normaliseIngredientName(ing.plural_name) === normalizedInput
      ) {
        return true;
      }

      // Check translations
      if (ing.translated_names) {
        for (const lang in ing.translated_names) {
          const translation = ing.translated_names[lang];
          if (translation && typeof translation === "object") {
            if (
              normaliseIngredientName(translation.singular_name) ===
                normalizedInput ||
              normaliseIngredientName(translation.plural_name) ===
                normalizedInput
            ) {
              return true;
            }
          }
        }
      }
      return false;
    });

    if (!ingredient) return ingredientName;

    // Return name in target language with correct singular/plural
    if (targetLanguage === "en") {
      return shouldUsePlural && ingredient.plural_name
        ? ingredient.plural_name
        : ingredient.singular_name;
    }

    // Check if translation exists for target language
    const translation = ingredient.translated_names?.[targetLanguage];
    if (translation && typeof translation === "object") {
      return shouldUsePlural && translation.plural_name
        ? translation.plural_name
        : translation.singular_name;
    }

    // No translation found, return English name
    return shouldUsePlural && ingredient.plural_name
      ? ingredient.plural_name
      : ingredient.singular_name;
  } catch (error) {
    console.error(
      "Error getting ingredient name in preferred language:",
      error
    );
    return ingredientName;
  }
};

// Helper function to find equivalent grocery item using database translations
const findEquivalentGroceryItem = async (ingredientName, unit, currentList) => {
  try {
    // Get all ingredients and search through them (including translations)
    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("id, singular_name, plural_name, translated_names");

    if (!ingredients || ingredients.length === 0) return null;

    const normalizedInput = normaliseIngredientName(ingredientName);

    // Find matching ingredient by English names or translations
    const ingredient = ingredients.find((ing) => {
      // Check English names
      if (
        normaliseIngredientName(ing.singular_name) === normalizedInput ||
        normaliseIngredientName(ing.plural_name) === normalizedInput
      ) {
        return true;
      }

      // Check translations
      if (ing.translated_names) {
        for (const lang in ing.translated_names) {
          const translation = ing.translated_names[lang];
          if (translation && typeof translation === "object") {
            if (
              normaliseIngredientName(translation.singular_name) ===
                normalizedInput ||
              normaliseIngredientName(translation.plural_name) ===
                normalizedInput
            ) {
              return true;
            }
          }
        }
      }
      return false;
    });

    if (!ingredient) return null;

    // Check if any current list item matches this ingredient
    return currentList.find((item) => {
      if (item.unit !== unit) return false;

      const itemName = normaliseIngredientName(item.name);

      // Check English forms
      if (
        itemName === normaliseIngredientName(ingredient.singular_name) ||
        itemName === normaliseIngredientName(ingredient.plural_name)
      ) {
        return true;
      }

      // Check translations
      if (ingredient.translated_names) {
        for (const lang in ingredient.translated_names) {
          const translation = ingredient.translated_names[lang];
          if (translation && typeof translation === "object") {
            if (
              itemName === normaliseIngredientName(translation.singular_name) ||
              itemName === normaliseIngredientName(translation.plural_name)
            ) {
              return true;
            }
          }
        }
      }

      return false;
    });
  } catch (error) {
    console.error("Error checking ingredient equivalence:", error);
    return null;
  }
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

// Fetch grocery list with translation to current UI language
export const fetchGroceryListForDisplay = async (currentLanguage) => {
  const groceryItems = await fetchGroceryList();

  if (!currentLanguage) {
    return groceryItems;
  }

  const userPreferredLang = await getUserPreferredLanguage();

  // If current UI language is same as preferred storage language, return as is
  if (currentLanguage === userPreferredLang) {
    return groceryItems;
  }

  // Translate ingredient names to current UI language
  const translatedItems = await Promise.all(
    groceryItems.map(async (item) => {
      try {
        const translatedName = await getIngredientNameInPreferredLanguage(
          item.name,
          item.quantity,
          currentLanguage
        );
        return {
          ...item,
          name: translatedName,
        };
      } catch (error) {
        console.error("Error translating grocery item:", error);
        return item; // Return original on error
      }
    })
  );

  return translatedItems;
};

// Update grocery list - handles both new items and existing items
export const updateGroceryList = async (updatedList) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Get user's preferred language to ensure items are stored correctly
  const userPreferredLang = await getUserPreferredLanguage();

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
  let itemsToInsert = updatedList
    .filter(
      (item) => !item.id || (item.tempId && item.tempId.startsWith("temp-"))
    )
    .filter(
      (item) =>
        // Only insert items that have a name (avoid empty items)
        item.name && item.name.trim() !== ""
    );

  // Combine new items with existing ones and among themselves
  const finalItemsToInsert = [];
  const combinedUpdates = new Map();

  for (const newItem of itemsToInsert) {
    const preferredLanguageName = await getIngredientNameInPreferredLanguage(
      newItem.name.trim(),
      newItem.quantity,
      userPreferredLang
    );

    // First check if this item can be combined with existing items
    const existingItem = await findEquivalentGroceryItem(
      preferredLanguageName,
      newItem.unit,
      currentItems
    );

    if (existingItem && newItem.quantity && existingItem.quantity) {
      const combinedResult = combineQuantities(
        existingItem.quantity,
        existingItem.unit,
        parseFloat(newItem.quantity),
        newItem.unit
      );

      if (combinedResult) {
        // Can combine with existing - update existing item
        const updatedRecipes = [
          ...new Set(
            [
              ...(existingItem.source_recipes || []),
              ...(newItem.source_recipes || []),
            ].filter(Boolean)
          ),
        ];
        combinedUpdates.set(existingItem.id, {
          id: existingItem.id,
          quantity: combinedResult.quantity,
          unit: combinedResult.unit,
          source_recipes: updatedRecipes,
        });
        continue;
      }
    }

    // Check if this item can be combined with other new items already processed
    const existingNewItem = finalItemsToInsert.find((item) => {
      const itemNormalized = normaliseIngredientName(item.name);
      const newItemNormalized = normaliseIngredientName(preferredLanguageName);
      return itemNormalized === newItemNormalized && item.unit === newItem.unit;
    });

    if (existingNewItem && newItem.quantity && existingNewItem.quantity) {
      const combinedResult = combineQuantities(
        existingNewItem.quantity,
        existingNewItem.unit,
        parseFloat(newItem.quantity),
        newItem.unit
      );

      if (combinedResult) {
        // Can combine with existing new item
        existingNewItem.quantity = combinedResult.quantity;
        existingNewItem.unit = combinedResult.unit;
        existingNewItem.source_recipes = [
          ...new Set(
            [
              ...(existingNewItem.source_recipes || []),
              ...(newItem.source_recipes || []),
            ].filter(Boolean)
          ),
        ];
        continue;
      }
    }

    // Cannot combine - add as new item
    finalItemsToInsert.push({
      user_id: user.id,
      name: preferredLanguageName,
      quantity: parseFloat(newItem.quantity) || 0,
      unit: newItem.unit || "",
      source_recipes: newItem.source_recipes || [],
    });
  }

  // Add combined updates to itemsToUpdate
  for (const combinedUpdate of combinedUpdates.values()) {
    // Remove any existing update for this item and replace with combined
    const existingUpdateIndex = itemsToUpdate.findIndex(
      (item) => item.id === combinedUpdate.id
    );
    if (existingUpdateIndex >= 0) {
      itemsToUpdate[existingUpdateIndex] = {
        ...itemsToUpdate[existingUpdateIndex],
        quantity: combinedUpdate.quantity,
        unit: combinedUpdate.unit,
        source_recipes: [
          ...new Set(
            [
              ...(itemsToUpdate[existingUpdateIndex].source_recipes || []),
              ...combinedUpdate.source_recipes,
            ].filter(Boolean)
          ),
        ],
      };
    } else {
      itemsToUpdate.push(combinedUpdate);
    }
  }

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
    // Translate item name to user's preferred language if it's not a combined update
    const updateData = {
      quantity: parseFloat(item.quantity) || 0,
      unit: item.unit,
      source_recipes: item.source_recipes || [],
    };

    if (item.name) {
      const preferredLanguageName = await getIngredientNameInPreferredLanguage(
        item.name,
        item.quantity,
        userPreferredLang
      );
      updateData.name = preferredLanguageName;
    }

    const { error: updateError } = await supabase
      .from("grocery_items")
      .update(updateData)
      .eq("id", item.id);

    if (updateError) throw updateError;
  }

  // Insert new items
  if (finalItemsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("grocery_items")
      .insert(finalItemsToInsert);

    if (insertError) throw insertError;
  }

  // Return refreshed list
  return await fetchGroceryList();
};

// Add selected ingredients to grocery list
export const addIngredientsToGroceryList = async (
  recipeIngredients,
  checkedIngredients,
  recipeTitle = "",
  recipeId = null
) => {
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

  // Get user's preferred language
  const userPreferredLang = await getUserPreferredLanguage();

  // Get current grocery list from database
  const currentList = await fetchGroceryList();

  const itemsToInsert = [];
  const itemsToUpdate = [];

  // Get recipe title in user's preferred language
  const translatedRecipeTitle = recipeTitle
    ? await getRecipeTitleInPreferredLanguage(
        recipeTitle,
        userPreferredLang,
        recipeId
      )
    : "";

  for (const ingredient of selectedIngredients) {
    // Get ingredient name in user's preferred language
    const preferredLanguageName = await getIngredientNameInPreferredLanguage(
      ingredient.name,
      ingredient.quantity,
      userPreferredLang
    );

    // Check if ingredient already exists in the list (including translations)
    const existingItem = await findEquivalentGroceryItem(
      preferredLanguageName,
      ingredient.unit,
      currentList
    );

    if (existingItem) {
      // Try to combine quantities with unit conversion
      if (existingItem.quantity && ingredient.quantity) {
        const combinedResult = combineQuantities(
          existingItem.quantity,
          existingItem.unit,
          ingredient.quantity,
          ingredient.unit
        );

        if (combinedResult) {
          // Units are convertible - combine them
          const updatedRecipes = [
            ...new Set(
              [
                ...(existingItem.source_recipes || []),
                translatedRecipeTitle,
              ].filter(Boolean)
            ),
          ];
          itemsToUpdate.push({
            id: existingItem.id,
            quantity: combinedResult.quantity,
            unit: combinedResult.unit,
            source_recipes: updatedRecipes,
          });
        } else {
          // Units not convertible - add as separate item
          itemsToInsert.push({
            user_id: user.id,
            name: preferredLanguageName,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            source_recipes: translatedRecipeTitle
              ? [translatedRecipeTitle]
              : [],
          });
        }
      }
    } else {
      // Add new ingredient
      itemsToInsert.push({
        user_id: user.id,
        name: preferredLanguageName,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        source_recipes: translatedRecipeTitle ? [translatedRecipeTitle] : [],
      });
    }
  }

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
