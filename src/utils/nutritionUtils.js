const NUTRITION_FIELDS = [
  "nutrition_calories",
  "nutrition_protein",
  "nutrition_fat",
  "nutrition_carbs",
  "nutrition_fiber",
  "nutrition_sugar",
  "nutrition_sodium",
];

const NUTRITION_KEYS = [
  "calories",
  "protein",
  "fat",
  "carbs",
  "fiber",
  "sugar",
  "sodium",
];

export const buildNutritionJson = (recipeData) => {
  const obj = {};
  NUTRITION_FIELDS.forEach((field, i) => {
    if (recipeData[field] != null) obj[NUTRITION_KEYS[i]] = recipeData[field];
  });
  return Object.keys(obj).length > 0 ? obj : null;
};
