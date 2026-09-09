import {
  formatIngredientMeasurement,
  getIngredientDisplayName,
} from "./ingredientFormatting";

const formatIngredientLine = (ingredient, units, language) => {
  const measurement = formatIngredientMeasurement(
    ingredient.quantity,
    ingredient.unit,
    units
  );
  const name = getIngredientDisplayName(ingredient, language);
  const line = measurement ? `${measurement} ${name}` : name;
  return ingredient.notes ? `${line} (${ingredient.notes})` : line;
};

// Build a plain-text version of a recipe suitable for pasting elsewhere
export const recipeToText = (recipe, { t, units, language }) => {
  const lines = [recipe.title, ""];

  if (recipe.servings) {
    lines.push(`${t("servings")}: ${recipe.servings}`, "");
  }

  const hasIngredients =
    recipe.ungroupedIngredients?.length || recipe.ingredientSections?.length;

  if (hasIngredients) {
    lines.push(`${t("ingredients")}:`);

    recipe.ungroupedIngredients?.forEach((ingredient) => {
      lines.push(`- ${formatIngredientLine(ingredient, units, language)}`);
    });

    recipe.ingredientSections?.forEach((section) => {
      lines.push("", section.subheading);
      section.ingredients.forEach((ingredient) => {
        lines.push(`- ${formatIngredientLine(ingredient, units, language)}`);
      });
    });

    lines.push("");
  }

  if (recipe.instructions?.length) {
    lines.push(`${t("instructions")}:`);
    recipe.instructions.forEach((instruction, i) => {
      lines.push(`${i + 1}. ${instruction}`);
    });
    lines.push("");
  }

  if (recipe.source) {
    lines.push(`${t("source")}: ${recipe.source}`, "");
  }

  if (recipe.notes) {
    lines.push(`${t("notes")}: ${recipe.notes}`, "");
  }

  return lines.join("\n").trim();
};
