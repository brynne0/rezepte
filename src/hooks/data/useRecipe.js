import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchRecipe } from "../../services/recipes";
import { getTranslatedRecipe } from "../../services/translationService";
import { useAuth } from "./useAuth";

// Fetches a single recipe and all associated data with translation
export const useRecipe = (id) => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { i18n } = useTranslation();
  const { isLoggedIn, loading: authLoading } = useAuth();

  useEffect(() => {
    const loadRecipe = async () => {
      // Wait for auth check to complete
      if (authLoading) {
        return;
      }

      if (!id) {
        setRecipe(null);
        setLoading(false);
        return;
      }

      // Don't fetch if not logged in (ProtectedRoute will handle redirect)
      if (!isLoggedIn) {
        setRecipe(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch the original recipe
        const originalRecipe = await fetchRecipe(id);

        // Get translated recipe if needed
        const currentLanguage = i18n.language.split("-")[0]; // Normalize region codes
        const translatedRecipe = await getTranslatedRecipe(
          originalRecipe,
          currentLanguage
        );

        setRecipe(translatedRecipe);
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError(err.message || "Failed to fetch recipe");
        setRecipe(null);
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [id, i18n.language, isLoggedIn, authLoading]); // Re-fetch when language or auth changes

  return { recipe, loading, error };
};
