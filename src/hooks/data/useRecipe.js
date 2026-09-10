import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchRecipe } from "../../services/recipes";
import { getTranslatedRecipe } from "../../services/translationService";
import { useAuth } from "./useAuth";
import supabase from "../../lib/supabase";

// Fetches a single recipe and all associated data with translation
export const useRecipe = (id) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language.split("-")[0]; // Normalize region codes
  const { isLoggedIn, loading: authLoading, user } = useAuth();
  const userId = user?.id;

  const {
    data: recipe = null,
    isLoading: queryLoading,
    error,
  } = useQuery({
    queryKey: ["recipe", id, currentLanguage],
    queryFn: async () => {
      try {
        const originalRecipe = await fetchRecipe(id);
        return await getTranslatedRecipe(originalRecipe, currentLanguage);
      } catch (err) {
        console.error("Error fetching recipe:", err);
        throw err;
      }
    },
    enabled: !authLoading && isLoggedIn && !!id,
  });

  // Wait for the auth check before deciding there's nothing to load
  const loading = authLoading || queryLoading;

  // Track when an owned recipe was last viewed (fire and forget)
  const lastTrackedRef = useRef(null);
  useEffect(() => {
    if (!recipe || recipe.user_id !== userId) return;
    const trackKey = `${recipe.id}-${userId}`;
    if (lastTrackedRef.current === trackKey) return;
    lastTrackedRef.current = trackKey;

    supabase
      .from("recipes")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", recipe.id)
      .then();
  }, [recipe, userId]);

  return {
    recipe: isLoggedIn && id ? recipe : null,
    loading,
    error: error ? error.message || "Failed to fetch recipe" : null,
  };
};
