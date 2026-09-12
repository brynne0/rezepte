import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  getUserByUsername,
  checkFriendship,
  getFriendProfile,
  fetchFriendRecipes,
} from "../../../services/friendsService";
import { getTranslatedRecipeTitle } from "../../../services/recipeTranslationService";
import { useOnlineStatus } from "../../../hooks/ui/useOnlineStatus";

const buildFriendCategories = (translatedRecipes, currentLanguage) => {
  const categoryTranslations = {};
  translatedRecipes.forEach((r) => {
    Object.entries(r.categoryTranslations || {}).forEach(
      ([name, translations]) => {
        if (!categoryTranslations[name]) {
          categoryTranslations[name] = translations;
        }
      }
    );
  });

  const usedNames = Array.from(
    new Set(translatedRecipes.flatMap((r) => r.categories ?? []))
  ).sort();

  return [
    {
      value: "all_recipes",
      label: currentLanguage === "de" ? "Alle Rezepte" : "All Recipes",
      isSystem: true,
    },
    ...usedNames.map((name) => {
      const translations = categoryTranslations[name];
      let label = name.charAt(0).toUpperCase() + name.slice(1);
      if (translations && translations[currentLanguage]) {
        label = translations[currentLanguage];
      }
      return { value: name, label };
    }),
  ];
};

// Translation is its own query, keyed on language separately from the raw
// recipe fetch, so switching language re-translates without refetching.
export const useFriendRecipes = (username) => {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language.split("-")[0];
  const isOnline = useOnlineStatus();

  const {
    data: friendUser,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    queryKey: ["friendUser", username],
    queryFn: () => getUserByUsername(username),
    enabled: !!username,
  });
  const friendUserId = friendUser?.id;

  const { data: isFriend, isLoading: friendshipLoading } = useQuery({
    queryKey: ["friendship", friendUserId],
    queryFn: () => checkFriendship(friendUserId),
    enabled: !!friendUserId,
  });

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["friendProfile", friendUserId],
    queryFn: () => getFriendProfile(friendUserId),
    enabled: !!friendUserId && isFriend === true,
  });

  const {
    data: rawRecipes,
    isLoading: recipesLoading,
    error: recipesError,
  } = useQuery({
    queryKey: ["friendRecipesRaw", friendUserId],
    queryFn: () => fetchFriendRecipes(friendUserId),
    enabled: !!friendUserId && isFriend === true,
  });

  const {
    data: translatedData,
    isLoading: translationLoading,
    error: translationError,
  } = useQuery({
    queryKey: ["friendRecipesTranslated", friendUserId, currentLanguage],
    queryFn: async () => {
      const translated = await Promise.all(
        rawRecipes.map((r) => getTranslatedRecipeTitle(r, currentLanguage))
      );
      return {
        recipes: translated,
        friendCategories: buildFriendCategories(translated, currentLanguage),
      };
    },
    enabled: !!rawRecipes,
  });

  const notFriends = !!friendUserId && isFriend === false;
  const loading =
    userLoading ||
    friendshipLoading ||
    (isFriend === true &&
      (profileLoading || recipesLoading || translationLoading));

  const hasError = !!(
    userError ||
    profileError ||
    recipesError ||
    translationError
  );

  const error = !hasError
    ? ""
    : !isOnline
      ? "offline"
      : userError?.message ||
        profileError?.message ||
        recipesError?.message ||
        translationError?.message ||
        t("recipe_not_found");

  return {
    friend: profile || friendUser || null,
    recipes: translatedData?.recipes ?? [],
    friendCategories: translatedData?.friendCategories ?? [],
    loading,
    notFriends,
    error,
  };
};
