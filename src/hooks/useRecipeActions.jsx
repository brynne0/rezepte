import { useState } from "react";
import supabase from "../supabaseClient";

export const useRecipeActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const createRecipe = async (recipeData) => {
    setLoading(true);
    setError(null);

    try {
      // Create the main recipe record
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert([
          {
            title: recipeData.title,
            category: recipeData.category,
            servings: recipeData.servings,
            instructions: recipeData.instructions,
            image_url: recipeData.image_url,
          },
        ])
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
    } catch (err) {
      const errorMessage = err.message || "Failed to create recipe";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRecipe = async (id, recipeData) => {
    setLoading(true);
    setError(null);

    try {
      // Update the main recipe record
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .update({
          title: recipeData.title,
          category: recipeData.category,
          servings: recipeData.servings,
          instructions: recipeData.instructions,
          image_url: recipeData.image_url,
        })
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
    } catch (err) {
      const errorMessage = err.message || "Failed to update recipe";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRecipe = async (id) => {
    setLoading(true);
    setError(null);

    try {
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
    } catch (err) {
      const errorMessage = err.message || "Failed to delete recipe";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createRecipe,
    updateRecipe,
    deleteRecipe,
    loading,
    error,
  };
};
