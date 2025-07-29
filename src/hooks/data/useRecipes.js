import { useEffect, useState, useCallback } from "react";
import { fetchRecipes } from "../../services/recipes";
import supabase from "../../lib/supabase";

// Fetch all recipes
export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRecipes = useCallback(async () => {
    try {
      const data = await fetchRecipes();
      setRecipes(data);
    } catch (err) {
      console.log("Error: ", err);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRecipes = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchRecipes();
      setRecipes(data);
    } catch (err) {
      console.log("Error refreshing: ", err);
      setRecipes([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setRecipes([]);
        setLoading(false);
      } else if (event === "SIGNED_IN") {
        loadRecipes();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadRecipes]);

  return { recipes, loading, refreshRecipes };
};