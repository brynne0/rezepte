import { useEffect, useState } from "react";
import supabase from "../supabaseClient";

export const useRecipe = (id) => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("rezepte")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        setRecipe(error ? null : data);
        setLoading(false);
      });
  }, [id]);

  return { recipe, loading };
};
