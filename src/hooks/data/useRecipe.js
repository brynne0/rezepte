import { useEffect, useState } from "react";
import { fetchRecipe } from "../../services/recipes";
import { translateRecipe, shouldTranslateRecipe, getCurrentLanguage } from "../../services/translation";

// Fetches a single recipe and all associated data
export const useRecipe = (id) => {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        const currentLanguage = getCurrentLanguage();
        
        if (shouldTranslateRecipe(data, currentLanguage)) {
          console.log(`Translating recipe to ${currentLanguage}`);
          const translatedData = await translateRecipe(
            data, 
            currentLanguage, 
            data.original_language || 'auto'
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

    loadRecipe();
  }, [id]);

  return { recipe, loading, error };
};