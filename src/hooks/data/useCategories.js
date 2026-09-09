import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getCategoriesForUI } from "../../services/categoriesService";
import { getCategoriesWithPreferences } from "../../services/categoryPreferencesService";
import supabase from "../../lib/supabase";

const CACHE_KEY_PREFIX = "categories-cache-";

const readCachedCategories = (language) => {
  try {
    const stored = localStorage.getItem(`${CACHE_KEY_PREFIX}${language}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const writeCachedCategories = (language, categories) => {
  try {
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}${language}`,
      JSON.stringify(categories)
    );
  } catch {
    // Ignore storage errors (e.g. private browsing with storage disabled)
  }
};

export const useCategories = () => {
  const { i18n } = useTranslation();

  // Stabilize the language to prevent loops
  const currentLanguage = useMemo(() => i18n.language, [i18n.language]);

  const [categories, setCategories] = useState(
    () => readCachedCategories(currentLanguage) ?? []
  );
  const [loading, setLoading] = useState(
    () => readCachedCategories(currentLanguage) === null
  );
  const [error, setError] = useState(null);

  // Show any cached categories for this language immediately, so switching
  // language (or a fresh mount) doesn't flash an empty list while the
  // network request for the new language is still in flight.
  useEffect(() => {
    const cached = readCachedCategories(currentLanguage);
    if (cached) {
      setCategories(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [currentLanguage]);

  const refreshCategories = useCallback(async () => {
    try {
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
      writeCachedCategories(currentLanguage, categoriesData);
    } catch (err) {
      // Keep showing whatever we already have (cached or previous state)
      // rather than clearing the list on a failed refresh, e.g. offline.
      setError(err.message);
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  }, [currentLanguage]);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  // Listen to auth state changes and refresh categories
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        refreshCategories();
      }
    });

    return () => subscription.unsubscribe();
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
