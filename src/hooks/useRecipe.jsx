import { useEffect, useState } from "react";
import supabase from "../supabaseClient";

export const useRecipe = (slug) => {
  const [recipeData, setRecipeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getRecipeWithIngredients = async () => {
      if (!slug) {
        setRecipeData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from("recipes")
          .select("*,recipe_ingredients(quantity,unit,ingredients(id,name))")
          .eq("slug", slug)
          .single();

        if (supabaseError) {
          throw supabaseError;
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
            })) || [],
        };

        // Remove the nested recipe_ingredients since it's flattened
        delete transformedData.recipe_ingredients;

        setRecipeData(transformedData);
      } catch (err) {
        console.error("Error fetching recipe with ingredients:", err);
        setError(err.message);
        setRecipeData(null);
      } finally {
        setLoading(false);
      }
    };

    getRecipeWithIngredients();
  }, [slug]);

  return { recipe: recipeData, loading, error };
};
