import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategoriesForUI } from "../../services/categoriesService";
import { useAuth } from "./useAuth";

const CACHE_KEY_PREFIX = "categories-cache-";

const readCachedCategories = (language) => {
  try {
    const stored = localStorage.getItem(`${CACHE_KEY_PREFIX}${language}`);
    return stored ? JSON.parse(stored) : undefined;
  } catch {
    return undefined;
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: categories = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["categories", userId, currentLanguage],
    enabled: !!userId,
    queryFn: async () => {
      try {
        const categoriesData = await getCategoriesForUI(currentLanguage);
        writeCachedCategories(currentLanguage, categoriesData);
        return categoriesData;
      } catch (err) {
        console.error("Error fetching categories:", err);
        throw err;
      }
    },
    // Seed the cache with last session's categories for this language, so a
    // fresh mount shows them instantly instead of an empty list. Marked as
    // already-stale (initialDataUpdatedAt: 0) with its own staleTime so it
    // still triggers a background refetch on mount despite the app-wide
    // "don't refetch on mount" default — and because it's real cached data
    // (not just a placeholder), it's kept on screen if that refetch fails,
    // rather than being cleared — `error` is surfaced separately.
    initialData: () => readCachedCategories(currentLanguage),
    initialDataUpdatedAt: 0,
    staleTime: 0,
    refetchOnMount: true,
  });

  const refreshCategories = () =>
    queryClient.invalidateQueries({ queryKey: ["categories"] });

  return {
    categories,
    loading,
    error: error?.message ?? null,
    refreshCategories,
  };
};
