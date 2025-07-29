import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { fetchRecipes } from "../../services/recipes";
import {
  translateRecipe,
  shouldTranslateRecipe,
} from "../../services/translation";
import supabase from "../../lib/supabase";

// Fetch all recipes
export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language; // This automatically updates when language changes

  const loadRecipes = useCallback(async () => {
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
                recipe.original_language || "auto"
              );
              return { ...recipe, title: translatedTitle.title };
            } catch (error) {
              console.error(
                `Failed to translate title for recipe ${recipe.id}:`,
                error
              );
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

  const refreshRecipes = useCallback(
    async (showLoading = false) => {
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
                  recipe.original_language || "auto"
                );
                return { ...recipe, title: translatedTitle.title };
              } catch (error) {
                console.error(
                  `Failed to translate title for recipe ${recipe.id}:`,
                  error
                );
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
    },
    [currentLanguage]
  ); // Depend on currentLanguage

  // Separate effect for language changes - this will definitely trigger
  useEffect(() => {
    if (currentLanguage) {
      loadRecipes();
    }
  }, [currentLanguage, loadRecipes]); // Only depends on currentLanguage

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
  }, [loadRecipes]); // Initial load and auth changes

  return { recipes, loading, refreshRecipes };
};
