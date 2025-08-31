import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getCategoriesForUI } from "../../services/categoriesService";
import { getCategoriesWithPreferences } from "../../services/categoryPreferencesService";

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { i18n } = useTranslation();

  // Stabilize the language to prevent loops
  const currentLanguage = useMemo(() => i18n.language, [i18n.language]);

  const refreshCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Try to get categories with user preferences first
      let categoriesData;
      try {
        categoriesData = await getCategoriesWithPreferences(currentLanguage);
      } catch (prefsError) {
        // Fall back to regular categories if preferences fail
        console.warn(
          "Failed to load category preferences, using defaults:",
          prefsError
        );
        categoriesData = await getCategoriesForUI(currentLanguage);
      }
      setCategories(categoriesData);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  }, [currentLanguage]);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  // Memoize categories to prevent unnecessary re-renders
  const memoizedCategories = useMemo(() => categories, [categories]);

  return {
    categories: memoizedCategories,
    loading,
    error,
    refreshCategories,
  };
};
