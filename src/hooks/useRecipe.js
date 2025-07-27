import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";

// Fetches a single recipe and all associated data
export const useRecipe = (id) => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!id) {
        setRecipe(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from("recipes")
          .select(
            "*, recipe_ingredients(quantity, unit, ingredients(id, name), notes)"
          )
          .eq("id", id)
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
              notes: item.notes,
            })) || [],
        };

        // Remove the nested recipe_ingredients since it's flattened
        delete transformedData.recipe_ingredients;

        setRecipe(transformedData);
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError(err.message || "Failed to fetch recipe");
        setRecipe(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [id]);

  return { recipe, loading, error };
};
