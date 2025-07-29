import { useEffect, useState, useCallback } from "react";
import { fetchRecipes } from "../../services/recipes";
import { translateRecipe, shouldTranslateRecipe, getCurrentLanguage } from "../../services/translation";
import supabase from "../../lib/supabase";

// Fetch all recipes
export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentLanguage = getCurrentLanguage(); // Extract to fix ESLint warning

  const loadRecipes = useCallback(async () => {
    try {
      const data = await fetchRecipes();
      
      // Translate recipe titles if needed
      const currentLanguage = getCurrentLanguage();
      const translatedRecipes = await Promise.all(
        data.map(async (recipe) => {
          if (shouldTranslateRecipe(recipe, currentLanguage)) {
            // For recipe list, we only translate the title to keep it fast
            const translatedTitle = await translateRecipe(
              { title: recipe.title }, 
              currentLanguage, 
              recipe.original_language || 'auto'
            );
            return { ...recipe, title: translatedTitle.title };
          }
          return recipe;
        })
      );
      
      setRecipes(translatedRecipes);
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
      
      // Translate recipe titles if needed
      const currentLanguage = getCurrentLanguage();
      const translatedRecipes = await Promise.all(
        data.map(async (recipe) => {
          if (shouldTranslateRecipe(recipe, currentLanguage)) {
            // For recipe list, we only translate the title to keep it fast
            const translatedTitle = await translateRecipe(
              { title: recipe.title }, 
              currentLanguage, 
              recipe.original_language || 'auto'
            );
            return { ...recipe, title: translatedTitle.title };
          }
          return recipe;
        })
      );
      
      setRecipes(translatedRecipes);
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
  }, [loadRecipes, currentLanguage]); // Now depends on current language

  return { recipes, loading, refreshRecipes };
};