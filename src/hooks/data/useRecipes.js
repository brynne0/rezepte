import { useEffect, useState, useCallback } from "react";
import { fetchRecipes } from "../../services/recipes";
import { getTranslatedRecipeTitle } from "../../services/translationService";
import { useTranslation } from "react-i18next";
import supabase from "../../lib/supabase";

// Fetch all recipes with translation
export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  const loadRecipes = useCallback(async () => {
    try {
      const data = await fetchRecipes();
      
      // Translate only recipe titles for the current language
      const currentLanguage = i18n.language;
      const translatedRecipes = await Promise.all(
        data.map(recipe => getTranslatedRecipeTitle(recipe, currentLanguage))
      );
      
      setRecipes(translatedRecipes);
    } catch (err) {
      console.log("Error: ", err);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  const refreshRecipes = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchRecipes();
      
      // Translate only recipe titles for the current language
      const currentLanguage = i18n.language;
      const translatedRecipes = await Promise.all(
        data.map(recipe => getTranslatedRecipeTitle(recipe, currentLanguage))
      );
      
      setRecipes(translatedRecipes);
    } catch (err) {
      console.log("Error refreshing: ", err);
      setRecipes([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [i18n.language]);

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