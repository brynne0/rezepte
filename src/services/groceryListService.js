import supabase from "../lib/supabase";
import pluralize from "pluralize";
import { getUserPreferredLanguage } from "./userService";
import { parseFraction } from "../utils/fractionUtils";

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
  if (!name || typeof name !== "string") {
    return "";
  }
  return pluralize.singular(name.toLowerCase().trim());
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
  targetLanguage
) => {
  try {
    // Get all ingredients and search through them (including translations)
    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("singular_name, plural_name, translated_names");

    if (!ingredients || ingredients.length === 0) return ingredientName;

    const normalizedInput = normaliseIngredientName(ingredientName);
    // For grocery list, determine plural from the user's input name since we don't have recipe context
    const shouldUseIngredientPlural = pluralize.isPlural(
      ingredientName.trim().toLowerCase()
    );

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

    if (!ingredient) {
      // Ingredient not found in database - use translation API for pluralization
      if (!shouldUseIngredientPlural) {
        return ingredientName;
      }

      try {
        // Get the plural form using pluralize library, then translate it
        const pluralForm = pluralize.plural(ingredientName);

        // If target language is English, return the pluralized form
        if (targetLanguage === "en") {
          return pluralForm;
        }

        // For other languages, translate the plural form
        const translatedPlural = await translateText(
          pluralForm,
          targetLanguage,
          "en"
        );
        return translatedPlural || pluralForm;
      } catch (error) {
        console.error("Error translating plural form:", error);
        return ingredientName; // Return original on error
      }
    }

    // Return name in target language with correct singular/plural
    if (targetLanguage === "en") {
      return shouldUseIngredientPlural && ingredient.plural_name
        ? ingredient.plural_name
        : ingredient.singular_name;
    }

    // Check if translation exists for target language
    const translation = ingredient.translated_names?.[targetLanguage];
    if (translation && typeof translation === "object") {
      return shouldUseIngredientPlural && translation.plural_name
        ? translation.plural_name
        : translation.singular_name;
    }

    // No translation found, return English name
    return shouldUseIngredientPlural && ingredient.plural_name
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

  // Process new items for insertion
  const finalItemsToInsert = [];

  for (const newItem of itemsToInsert) {
    const preferredLanguageName = await getIngredientNameInPreferredLanguage(
      newItem.name.trim(),
      userPreferredLang
    );

    // Skip quantity combination - add items separately instead
    // First check if this item can be combined with existing items
    // const existingItem = await findEquivalentGroceryItem(
    //   preferredLanguageName,
    //   newItem.unit,
    //   currentItems
    // );

    // if (existingItem && newItem.quantity && existingItem.quantity) {
    //   const combinedResult = combineQuantities(
    //     existingItem.quantity,
    //     existingItem.unit,
    //     parseFraction(newItem.quantity),
    //     newItem.unit
    //   );

    //   if (combinedResult) {
    //     // Can combine with existing - update existing item
    //     const updatedRecipes = [
    //       ...new Set(
    //         [
    //           ...(existingItem.source_recipes || []),
    //           ...(newItem.source_recipes || []),
    //         ].filter(Boolean)
    //       ),
    //     ];

    //     // Get the correct ingredient name for the combined quantity
    //     const updatedIngredientName =
    //       await getIngredientNameInPreferredLanguage(
    //         existingItem.name,
    //         combinedResult.quantity,
    //         userPreferredLang
    //       );

    //     combinedUpdates.set(existingItem.id, {
    //       id: existingItem.id,
    //       name: updatedIngredientName,
    //       quantity: combinedResult.quantity,
    //       unit: combinedResult.unit,
    //       source_recipes: updatedRecipes,
    //     });
    //     continue;
    //   }
    // }

    // // Check if this item can be combined with other new items already processed
    // const existingNewItem = finalItemsToInsert.find((item) => {
    //   const itemNormalized = normaliseIngredientName(item.name);
    //   const newItemNormalized = normaliseIngredientName(preferredLanguageName);
    //   const namesMatch = itemNormalized === newItemNormalized;

    //   // Check if units can be combined (exact match OR convertible units)
    //   const exactUnitMatch = item.unit === newItem.unit;
    //   const convertibleUnits = canUnitsBeConverted(item.unit, newItem.unit);
    //   const unitsCanCombine = exactUnitMatch || convertibleUnits;

    //   return namesMatch && unitsCanCombine;
    // });

    // if (existingNewItem && newItem.quantity && existingNewItem.quantity) {
    //   const combinedResult = combineQuantities(
    //     existingNewItem.quantity,
    //     existingNewItem.unit,
    //     parseFraction(newItem.quantity),
    //     newItem.unit
    //   );

    //   if (combinedResult) {
    //     // Can combine with existing new item
    //     existingNewItem.quantity = combinedResult.quantity;
    //     existingNewItem.unit = combinedResult.unit;
    //     existingNewItem.source_recipes = [
    //       ...new Set(
    //         [
    //           ...(existingNewItem.source_recipes || []),
    //           ...(newItem.source_recipes || []),
    //         ].filter(Boolean)
    //       ),
    //     ];

    //     // Update ingredient name to correct singular/plural form based on new quantity
    //     existingNewItem.name = await getIngredientNameInPreferredLanguage(
    //       existingNewItem.name,
    //       combinedResult.quantity,
    //       userPreferredLang
    //     );

    //     continue;
    //   }
    // }

    // Cannot combine - add as new item
    finalItemsToInsert.push({
      user_id: user.id,
      name: preferredLanguageName,
      quantity: parseFraction(newItem.quantity) || 0,
      unit: newItem.unit || "",
      source_recipes: newItem.source_recipes || [],
    });
  }

  // Add combined updates to itemsToUpdate
  // for (const combinedUpdate of combinedUpdates.values()) {
  //   // Remove any existing update for this item and replace with combined
  //   const existingUpdateIndex = itemsToUpdate.findIndex(
  //     (item) => item.id === combinedUpdate.id
  //   );
  //   if (existingUpdateIndex >= 0) {
  //     itemsToUpdate[existingUpdateIndex] = {
  //       ...itemsToUpdate[existingUpdateIndex],
  //       name: combinedUpdate.name, // Include the updated name
  //       quantity: combinedUpdate.quantity,
  //       unit: combinedUpdate.unit,
  //       source_recipes: [
  //         ...new Set(
  //           [
  //             ...(itemsToUpdate[existingUpdateIndex].source_recipes || []),
  //             ...combinedUpdate.source_recipes,
  //           ].filter(Boolean)
  //         ),
  //       ],
  //     };
  //   } else {
  //     itemsToUpdate.push(combinedUpdate);
  //   }
  // }

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
      quantity: parseFraction(item.quantity) || 0,
      unit: item.unit,
      source_recipes: item.source_recipes || [],
    };

    if (item.name) {
      const preferredLanguageName = await getIngredientNameInPreferredLanguage(
        item.name,
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
    (ingredient) => checkedIngredients[ingredient.recipe_ingredient_id]
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
    // Get ingredient name - handle different property names
    const ingredientName =
      ingredient.name ||
      ingredient.singular_name ||
      ingredient.plural_name ||
      "Unknown ingredient";

    // Get ingredient name in user's preferred language
    const preferredLanguageName = await getIngredientNameInPreferredLanguage(
      ingredientName,
      userPreferredLang
    );

    // Add new ingredient
    itemsToInsert.push({
      user_id: user.id,
      name: preferredLanguageName,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      source_recipes: translatedRecipeTitle ? [translatedRecipeTitle] : [],
    });

    // Below is the previous quantity combination logic
    // Check if ingredient already exists in the list (including translations)
    // const existingItem = await findEquivalentGroceryItem(
    //   preferredLanguageName,
    //   ingredient.unit,
    //   currentList
    // );

    // if (existingItem) {
    // Try to combine quantities with unit conversion
    // Handle null quantities by treating them as 0
    // const existingQty = parseFraction(existingItem.quantity) || 0;
    // const newQty = parseFraction(ingredient.quantity) || 0;

    // const combinedResult = combineQuantities(
    //   existingQty,
    //   existingItem.unit,
    //   newQty,
    //   ingredient.unit
    // );

    //   if (combinedResult) {
    //     // Units are convertible - combine them
    //     const updatedRecipes = [
    //       ...new Set(
    //         [
    //           ...(existingItem.source_recipes || []),
    //           translatedRecipeTitle,
    //         ].filter(Boolean)
    //       ),
    //     ];
    //     itemsToUpdate.push({
    //       id: existingItem.id,
    //       quantity: combinedResult.quantity,
    //       unit: combinedResult.unit,
    //       source_recipes: updatedRecipes,
    //     });
    //   } else {
    //     // Units not convertible - add as separate item
    //     itemsToInsert.push({
    //       user_id: user.id,
    //       name: preferredLanguageName,
    //       quantity: newQty,
    //       unit: ingredient.unit,
    //       source_recipes: translatedRecipeTitle ? [translatedRecipeTitle] : [],
    //     });
    //   }
    // } else {
    //   // Add new ingredient
    //   itemsToInsert.push({
    //     user_id: user.id,
    //     name: preferredLanguageName,
    //     quantity: ingredient.quantity,
    //     unit: ingredient.unit,
    //     source_recipes: translatedRecipeTitle ? [translatedRecipeTitle] : [],
    //   });
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

// Helper function to check if two units can be converted/combined
// const canUnitsBeConverted = (unit1, unit2) => {
//   const normaliseUnit = (unit) => {
//     if (!unit) return "";
//     const normalized = unit.toLowerCase().trim();
//     // Handle singular/plural forms - convert "cup/s" to "cup" for matching
//     if (normalized.includes("/")) {
//       return normalized.split("/")[0];
//     }
//     return normalized;
//   };

//   const unit1Norm = normaliseUnit(unit1);
//   const unit2Norm = normaliseUnit(unit2);

//   // Same units can always be combined
//   if (unit1Norm === unit2Norm) return true;

//   // Check specific convertible pairs
//   const convertiblePairs = [
//     ["ml", "l"],
//     ["g", "kg"],
//   ];

//   return convertiblePairs.some(
//     ([a, b]) =>
//       (unit1Norm === a && unit2Norm === b) ||
//       (unit1Norm === b && unit2Norm === a)
//   );
// };

// Helper function to combine quantities - only handles g/kg and ml/l
// const combineQuantities = (
//   existingQuantity,
//   existingUnit,
//   newQuantity,
//   newUnit
// ) => {
//   const normaliseUnit = (unit) => {
//     if (!unit || unit === null || unit === undefined) return "";
//     const normalized = unit.toString().toLowerCase().trim();
//     // Handle singular/plural forms - convert "cup/s" to "cup" for matching
//     if (normalized.includes("/")) {
//       return normalized.split("/")[0];
//     }
//     return normalized;
//   };

//   const existingUnitNorm = normaliseUnit(existingUnit);
//   const newUnitNorm = normaliseUnit(newUnit);

//   // Direct unit match - simple addition
//   if (existingUnitNorm === newUnitNorm) {
//     const result = {
//       quantity: parseFraction(existingQuantity) + parseFraction(newQuantity),
//       unit: existingUnit || newUnit || null,
//     };
//     return result;
//   }

//   // Only combine g/kg and ml/l - nothing else
//   let canCombine = false;
//   let existingInBase = existingQuantity;
//   let newInBase = newQuantity;

//   // Handle ml/l conversion
//   if (
//     (existingUnitNorm === "ml" && newUnitNorm === "l") ||
//     (existingUnitNorm === "l" && newUnitNorm === "ml")
//   ) {
//     canCombine = true;
//     if (existingUnitNorm === "ml") {
//       // Keep as ml: existing stays same, convert l to ml
//       newInBase = newQuantity * 1000;
//     } else {
//       // Keep as l: convert ml to l, existing stays same
//       existingInBase = existingQuantity / 1000;
//     }
//   }

//   // Handle g/kg conversion
//   else if (
//     (existingUnitNorm === "g" && newUnitNorm === "kg") ||
//     (existingUnitNorm === "kg" && newUnitNorm === "g")
//   ) {
//     canCombine = true;
//     if (existingUnitNorm === "g") {
//       // Keep as g: existing stays same, convert kg to g
//       newInBase = newQuantity * 1000;
//     } else {
//       // Keep as kg: convert g to kg, existing stays same
//       existingInBase = existingQuantity / 1000;
//     }
//   }

//   if (canCombine) {
//     return {
//       quantity: existingInBase + newInBase,
//       unit: existingUnit, // Keep original unit
//     };
//   }

//   // Units not convertible - return null
//   return null;
// };

// Helper function to find equivalent grocery item using database translations
// const findEquivalentGroceryItem = async (ingredientName, unit, currentList) => {
//   try {
//     // Get all ingredients and search through them (including translations)
//     const { data: ingredients } = await supabase
//       .from("ingredients")
//       .select("id, singular_name, plural_name, translated_names");

//     if (!ingredients || ingredients.length === 0) return null;

//     const normalizedInput = normaliseIngredientName(ingredientName);

//     // Find matching ingredient by English names or translations
//     const ingredient = ingredients.find((ing) => {
//       // Check English names
//       if (
//         normaliseIngredientName(ing.singular_name) === normalizedInput ||
//         normaliseIngredientName(ing.plural_name) === normalizedInput
//       ) {
//         return true;
//       }

//       // Check translations
//       if (ing.translated_names) {
//         for (const lang in ing.translated_names) {
//           const translation = ing.translated_names[lang];
//           if (translation && typeof translation === "object") {
//             if (
//               normaliseIngredientName(translation.singular_name) ===
//                 normalizedInput ||
//               normaliseIngredientName(translation.plural_name) ===
//                 normalizedInput
//             ) {
//               return true;
//             }
//           }
//         }
//       }
//       return false;
//     });

//     if (!ingredient) {
//       // Ingredient not in database - use simple name normalisation as fallback
//       return currentList.find((item) => {
//         // Check for exact unit match OR convertible units (g/kg, ml/l)
//         if (!canUnitsBeConverted(item.unit, unit)) return false;

//         // Simple name comparison using normalszation
//         const itemNormalized = normaliseIngredientName(item.name);
//         const inputNormalized = normaliseIngredientName(ingredientName);

//         return itemNormalized === inputNormalized;
//       });
//     }

//     // Check if any current list item matches this ingredient
//     return currentList.find((item) => {
//       // Check for exact unit match OR convertible units (g/kg, ml/l)
//       if (!canUnitsBeConverted(item.unit, unit)) return false;

//       const itemName = normaliseIngredientName(item.name);

//       // Check English forms
//       if (
//         itemName === normaliseIngredientName(ingredient.singular_name) ||
//         itemName === normaliseIngredientName(ingredient.plural_name)
//       ) {
//         return true;
//       }

//       // Check translations
//       if (ingredient.translated_names) {
//         for (const lang in ingredient.translated_names) {
//           const translation = ingredient.translated_names[lang];
//           if (translation && typeof translation === "object") {
//             if (
//               itemName === normaliseIngredientName(translation.singular_name) ||
//               itemName === normaliseIngredientName(translation.plural_name)
//             ) {
//               return true;
//             }
//           }
//         }
//       }

//       return false;
//     });
//   } catch (error) {
//     console.error("Error checking ingredient equivalence:", error);
//     return null;
//   }
// };
