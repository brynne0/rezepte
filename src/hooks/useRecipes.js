import { useEffect, useState, useCallback } from "react";
import supabase from "../utils/supabaseClient";

// Fetch all recipes
export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecipes = useCallback(async () => {
    try {
      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRecipes([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from("recipes").select("*");
      if (error) {
        console.error("Error fetching recipes:", error);
        setRecipes([]);
      } else {
        setRecipes(data || []);
      }
    } catch (err) {
      console.log("Error: ", err);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRecipes = useCallback(async () => {
    // Check if user is still authenticated before refreshing
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from("recipes").select("*");
      if (error) {
        console.error("Error refreshing recipes:", error);
        setRecipes([]);
      } else {
        setRecipes(data || []);
      }
    } catch (err) {
      console.log("Error refreshing: ", err);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipes();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setRecipes([]);
        setLoading(false);
      } else if (event === "SIGNED_IN") {
        fetchRecipes();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRecipes]);

  return { recipes, loading, refreshRecipes };
};
