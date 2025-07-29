import supabase from "../lib/supabase";

// Helper function to get or create ingredient by name
const getOrCreateIngredient = async (ingredientName) => {
  const trimmedName = ingredientName.trim();

  try {
    // Try to find existing ingredient
    const { data: existingIngredients, error: findError } = await supabase
      .from("ingredients")
      .select("id")
      .eq("name", trimmedName);

    if (findError) {
      throw new Error(`Error looking up ingredient: ${findError.message}`);
    }

    // If ingredient exists, return its ID
    if (existingIngredients && existingIngredients.length > 0) {
      return existingIngredients[0].id;
    }

    // If no ingredient exists, create new ingredient
    const { data: newIngredient, error: createError } = await supabase
      .from("ingredients")
      .insert([{ name: trimmedName }])
      .select("id")
      .single();

    if (createError) {
      throw new Error(`Error creating ingredient: ${createError.message}`);
    }

    return newIngredient.id;
  } catch (error) {
    console.error(
      `Failed to get or create ingredient "${trimmedName}":`,
      error
    );
    throw error;
  }
};

// Fetch all recipes
export const fetchRecipes = async () => {
  const { data, error } = await supabase.from("recipes").select("*");
  if (error) {
    console.error("Error fetching recipes:", error);
    throw error;
  }
  return data || [];
};

// Fetch a single recipe with all associated data
export const fetchRecipe = async (id) => {
  if (!id) {
    throw new Error("Recipe ID is required");
  }

  const { data, error } = await supabase
    .from("recipes")
    .select(
      "*, recipe_ingredients(quantity, unit, ingredients(id, name), notes)"
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  // Transform ingredients to flatter structure
  const transformedData = {
    ...data,
    ingredients:
      data.recipe_ingredients?.map((item) => ({
        id: item.ingredients.id,
        name: item.ingredients.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
      })) || [],
  };

  // Remove the nested recipe_ingredients since it's flattened
  delete transformedData.recipe_ingredients;

  return transformedData;
};

// Create a new recipe
export const createRecipe = async (recipeData) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Create the main recipe record
  const cleanRecipeData = Object.fromEntries(
    Object.entries({
      title: recipeData.title,
      category: recipeData.category,
      servings: recipeData.servings,
      instructions: recipeData.instructions,
      source: recipeData.source,
      user_id: user.id,
      link_only: recipeData.link_only,
      notes: recipeData.notes,
      original_language: recipeData.original_language,
    }).filter(([, v]) => v !== undefined)
  );

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert([cleanRecipeData])
    .select()
    .single();

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  // If there are ingredients, process and insert them
  if (recipeData.ingredients && recipeData.ingredients.length > 0) {
    const recipeIngredientsToInsert = [];

    for (const ingredient of recipeData.ingredients) {
      let ingredientId;

      // Handle both cases: ingredient_id provided OR name provided
      if (ingredient.ingredient_id) {
        ingredientId = ingredient.ingredient_id;
      } else if (ingredient.name) {
        ingredientId = await getOrCreateIngredient(ingredient.name);
      } else {
        throw new Error(
          "Ingredient must have either ingredient_id or name"
        );
      }

      recipeIngredientsToInsert.push({
        recipe_id: recipe.id,
        ingredient_id: ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
      });
    }

    const { error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .insert(recipeIngredientsToInsert);

    if (ingredientsError) {
      console.error("Failed to insert ingredients:", ingredientsError);
      throw new Error(
        `Recipe created but failed to add ingredients: ${ingredientsError.message}`
      );
    }
  }

  return recipe;
};

// Update an existing recipe
export const updateRecipe = async (id, recipeData) => {
  const cleanRecipeData = Object.fromEntries(
    Object.entries({
      title: recipeData.title,
      category: recipeData.category,
      servings: recipeData.servings,
      instructions: recipeData.instructions,
      source: recipeData.source,
      link_only: recipeData.link_only,
      notes: recipeData.notes,
    }).filter(([, v]) => v !== undefined)
  );

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .update(cleanRecipeData)
    .eq("id", id)
    .select()
    .single();

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  // Delete existing ingredients for this recipe
  const { error: deleteError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", id);

  if (deleteError) {
    throw new Error(
      `Failed to delete existing ingredients: ${deleteError.message}`
    );
  }

  // Insert new ingredients
  if (recipeData.ingredients && recipeData.ingredients.length > 0) {
    const recipeIngredientsToInsert = [];

    for (const ingredient of recipeData.ingredients) {
      let ingredientId;

      // Handle both cases: ingredient_id provided OR name provided
      if (ingredient.ingredient_id) {
        ingredientId = ingredient.ingredient_id;
      } else if (ingredient.name) {
        ingredientId = await getOrCreateIngredient(ingredient.name);
      } else {
        throw new Error(
          "Ingredient must have either ingredient_id or name"
        );
      }

      recipeIngredientsToInsert.push({
        recipe_id: id,
        ingredient_id: ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes,
      });
    }

    const { error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .insert(recipeIngredientsToInsert);

    if (ingredientsError) {
      throw new Error(
        `Failed to add updated ingredients: ${ingredientsError.message}`
      );
    }
  }

  return recipe;
};

// Delete a recipe
export const deleteRecipe = async (id) => {
  // Note: Due to CASCADE DELETE constraint, recipe_ingredients will be
  // automatically deleted when the recipe is deleted, but we can still
  // delete them explicitly for clarity
  const { error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", id);

  if (ingredientsError) {
    throw new Error(
      `Failed to delete recipe ingredients: ${ingredientsError.message}`
    );
  }

  // Delete the recipe
  const { error: recipeError } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id);

  if (recipeError) {
    throw new Error(recipeError.message);
  }

  return true;
};