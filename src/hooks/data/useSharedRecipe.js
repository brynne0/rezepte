import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchSharedRecipe } from "../../services/recipes";
import { getTranslatedRecipe } from "../../services/recipeTranslationService";
import { useAuth } from "./useAuth";

// Fetches a link-shared recipe by token. Signed-out viewers get the original
// language so anonymous visits never trigger paid translation calls.
export const useSharedRecipe = (token, { original = false } = {}) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language.split("-")[0];
  const { isLoggedIn, loading: authLoading } = useAuth();
  const translate = isLoggedIn && !original;

  const {
    data: recipe = null,
    isLoading,
    isPlaceholderData: switching,
    error,
  } = useQuery({
    queryKey: ["sharedRecipe", token, translate ? currentLanguage : "original"],
    queryFn: async () => {
      const sharedRecipe = await fetchSharedRecipe(token);
      return getTranslatedRecipe(
        sharedRecipe,
        translate ? currentLanguage : sharedRecipe.original_language || "en"
      );
    },
    enabled: !authLoading && !!token,
    retry: (count, err) =>
      err?.message !== "SHARED_RECIPE_NOT_FOUND" && count < 2,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === token ? previous : undefined,
  });

  return {
    recipe,
    loading: authLoading || isLoading,
    switching,
    error: error ? error.message || "Failed to fetch recipe" : null,
  };
};
