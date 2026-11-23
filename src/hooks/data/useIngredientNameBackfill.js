import { useEffect, useMemo, useState } from "react";
import { translateIngredientNames } from "../../services/recipeTranslationService";
import { useOnlineStatus } from "../ui/useOnlineStatus";

const BATCH_SIZE = 5;

// Shared across lists so each ingredient is only translated once per session
const attempted = new Set();
const backfilled = new Map();
const keyFor = (language, id) => `${language}:${id}`;

// Ingredients in these recipes with no stored name in `language`
export const findIngredientsMissingNames = (recipes = [], language) => {
  // English names are canonical, so they always exist
  if (!language || language === "en") return [];
  const missing = new Map();
  for (const recipe of recipes) {
    for (const ri of recipe.recipe_ingredients || []) {
      const ingredient = ri.ingredients;
      if (ingredient?.id && !ingredient.translated_names?.[language]) {
        missing.set(ingredient.id, ingredient);
      }
    }
  }
  return [...missing.values()];
};

const needsPatch = (recipe, language) =>
  recipe.recipe_ingredients?.some(
    (ri) =>
      !ri.ingredients?.translated_names?.[language] &&
      backfilled.has(keyFor(language, ri.ingredients?.id))
  );

// Copies backfilled names onto the recipes' ingredient data
const withBackfilledNames = (recipes, language) => {
  if (!recipes.some((recipe) => needsPatch(recipe, language))) return recipes;
  return recipes.map((recipe) => {
    if (!needsPatch(recipe, language)) return recipe;
    const ingredients = recipe.recipe_ingredients;
    return {
      ...recipe,
      recipe_ingredients: ingredients.map((ri) => {
        const names = backfilled.get(keyFor(language, ri.ingredients?.id));
        if (!names || ri.ingredients.translated_names?.[language]) return ri;
        return {
          ...ri,
          ingredients: {
            ...ri.ingredients,
            translated_names: {
              ...ri.ingredients.translated_names,
              [language]: names,
            },
          },
        };
      }),
    };
  });
};

// Translates missing ingredient names in the background so search works
export const useIngredientNameBackfill = (recipes, language) => {
  const isOnline = useOnlineStatus();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!isOnline) return;
    const pending = findIngredientsMissingNames(recipes, language).filter(
      (ingredient) => !attempted.has(keyFor(language, ingredient.id))
    );
    if (pending.length === 0) return;
    pending.forEach((ingredient) =>
      attempted.add(keyFor(language, ingredient.id))
    );

    // Not cancelled on re-render: names are saved, so finishing is always useful
    (async () => {
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map((ingredient) =>
            translateIngredientNames(ingredient, language)
          )
        );
        results.forEach((names, index) => {
          if (names) backfilled.set(keyFor(language, batch[index].id), names);
        });
        if (results.some(Boolean)) setVersion((v) => v + 1);
      }
    })();
  }, [recipes, language, isOnline]);

  return useMemo(
    () => withBackfilledNames(recipes, language),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipes, language, version]
  );
};
