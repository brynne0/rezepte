import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchRecipe } from "../../services/recipes";
import { getTranslatedRecipe } from "../../services/translationService";

// Fetches a single recipe and all associated data with translation
export const useRecipe = (id) => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { i18n } = useTranslation();

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id) {
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
  }, [id, i18n.language]); // Re-fetch when language changes

  return { recipe, loading, error };
};
