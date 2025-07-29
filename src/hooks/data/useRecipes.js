import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { fetchRecipes } from "../../services/recipes";
import { translateRecipe, shouldTranslateRecipe } from "../../services/translation";
import supabase from "../../lib/supabase";

// Fetch all recipes
export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const { i18n } = useTranslation();
  
  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      console.log('Language changed in useRecipes to:', lng);
      setCurrentLanguage(lng);
    };

    setCurrentLanguage(i18n.language);
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const loadRecipes = useCallback(async () => {
    try {
      const data = await fetchRecipes();
      
      // Translate recipe titles if needed
      const translatedRecipes = await Promise.all(
        data.map(async (recipe) => {
          if (shouldTranslateRecipe(recipe, currentLanguage)) {
            console.log(`Translating recipe list title: "${recipe.title}" to ${currentLanguage}`);
            // For recipe list, we only translate the title to keep it fast
            try {
              const translatedTitle = await translateRecipe(
                { title: recipe.title }, 
                currentLanguage, 
                recipe.original_language || 'auto'
              );
              console.log(`Translated title: "${translatedTitle.title}"`);
              return { ...recipe, title: translatedTitle.title };
            } catch (error) {
              console.error(`Failed to translate title for recipe ${recipe.id}:`, error);
              return recipe; // Return original on error
            }
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
  }, [currentLanguage]); // Depend on currentLanguage

  const refreshRecipes = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchRecipes();
      
      // Translate recipe titles if needed
      const translatedRecipes = await Promise.all(
        data.map(async (recipe) => {
          if (shouldTranslateRecipe(recipe, currentLanguage)) {
            // For recipe list, we only translate the title to keep it fast
            try {
              const translatedTitle = await translateRecipe(
                { title: recipe.title }, 
                currentLanguage, 
                recipe.original_language || 'auto'
              );
              return { ...recipe, title: translatedTitle.title };
            } catch (error) {
              console.error(`Failed to translate title for recipe ${recipe.id}:`, error);
              return recipe; // Return original on error
            }
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
  }, [currentLanguage]); // Depend on currentLanguage

  useEffect(() => {
    // Only load if we have currentLanguage set
    if (currentLanguage) {
      console.log(`Loading recipes in language: ${currentLanguage}`);
      loadRecipes();
    }

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
  }, [loadRecipes, currentLanguage]); // Triggers when language changes

  return { recipes, loading, refreshRecipes };
};