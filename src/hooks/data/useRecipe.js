import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchRecipe } from "../../services/recipes";
import {
  translateRecipe,
  shouldTranslateRecipe,
} from "../../services/translation";

// Fetches a single recipe and all associated data
export const useRecipe = (id) => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language; // Automatically updates when language changes

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

        const data = await fetchRecipe(id);

        // Check if translation is needed
        if (shouldTranslateRecipe(data, currentLanguage)) {
          const translatedData = await translateRecipe(
            data,
            currentLanguage,
            data.original_language || "auto"
          );
          setRecipe(translatedData);
        } else {
          setRecipe(data);
        }
      } catch (err) {
        console.error("Error fetching recipe:", err);
        setError(err.message || "Failed to fetch recipe");
        setRecipe(null);
      } finally {
        setLoading(false);
      }
    };

    // Only load if we have both id and currentLanguage
    if (id && currentLanguage) {
      loadRecipe();
    }
  }, [id, currentLanguage]); // Triggers when either id or language changes

  return { recipe, loading, error };
};
