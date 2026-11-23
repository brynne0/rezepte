import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRecipe } from "../../services/recipes";
import { getTranslatedRecipe } from "../../services/recipeTranslationService";
import { useAuth } from "./useAuth";
import supabase from "../../lib/supabase";
import { useOnlineStatus } from "../ui/useOnlineStatus";

// Fetches a recipe translated to the app language, or untranslated with `original`
export const useRecipe = (id, { original = false } = {}) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language.split("-")[0]; // Normalize region codes
  const { isLoggedIn, loading: authLoading, user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const {
    data: recipe = null,
    isLoading: queryLoading,
    isPlaceholderData: switching,
    error,
  } = useQuery({
    queryKey: ["recipe", id, original ? "original" : currentLanguage],
    queryFn: async () => {
      try {
        const originalRecipe = await fetchRecipe(id);
        const targetLanguage = original
          ? originalRecipe.original_language || "en"
          : currentLanguage;
        return await getTranslatedRecipe(originalRecipe, targetLanguage);
      } catch (err) {
        console.error("Error fetching recipe:", err);
        throw err;
      }
    },
    enabled: !authLoading && isLoggedIn && !!id,
    // Keep showing this recipe while flipping between original and translated
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === id ? previous : undefined,
  });

  // Wait for the auth check before deciding there's nothing to load
  const loading = authLoading || queryLoading;

  // Track when an owned recipe was last viewed (fire and forget)
  const lastTrackedRef = useRef(null);
  useEffect(() => {
    if (!recipe || recipe.user_id !== userId || !isOnline) return;
    const trackKey = `${recipe.id}-${userId}`;
    if (lastTrackedRef.current === trackKey) return;
    lastTrackedRef.current = trackKey;

    const lastViewedAt = new Date().toISOString();

    supabase
      .from("recipes")
      .update({ last_viewed_at: lastViewedAt })
      .eq("id", recipe.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error("Failed to update last_viewed_at:", updateError);
        }
      })
      .catch((err) => {
        console.error("Failed to update last_viewed_at:", err);
      });

    // Patch the cached recipe list in place so it re-sorts by recency
    // without triggering a refetch (list queries are keyed per language).
    queryClient.setQueriesData({ queryKey: ["recipes", userId] }, (old) =>
      old?.map((r) =>
        r.id === recipe.id ? { ...r, last_viewed_at: lastViewedAt } : r
      )
    );
  }, [recipe, userId, queryClient, isOnline]);

  return {
    recipe: isLoggedIn && id ? recipe : null,
    loading,
    switching,
    error: error ? error.message || "Failed to fetch recipe" : null,
  };
};
