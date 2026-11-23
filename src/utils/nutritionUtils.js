const NUTRITION_KEYS = [
  "calories",
  "protein",
  "fat",
  "carbs",
  "fiber",
  "sugar",
  "sodium",
];

// Keeps digits and the first decimal separator (. or ,), so "12.5 g" -> "12.5"
export const sanitizeNutritionInput = (value) => {
  const cleaned = String(value ?? "").replace(/[^\d.,]/g, "");
  const separatorIndex = cleaned.search(/[.,]/);
  if (separatorIndex === -1) return cleaned;
  return (
    cleaned.slice(0, separatorIndex + 1) +
    cleaned.slice(separatorIndex + 1).replace(/[.,]/g, "")
  );
};

// Form value to number for saving; accepts a decimal comma, null if not a number
export const toNutritionValue = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = parseFloat(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
};

export const emptyNutritionColumn = () => ({
  label: "",
  calories: null,
  protein: null,
  fat: null,
  carbs: null,
  fiber: null,
  sugar: null,
  sodium: null,
});

// Parse nutrition JSONB from DB into form-state columns array
export const parseNutritionColumns = (nutrition) => {
  if (!nutrition) return [emptyNutritionColumn()];

  // New format: { columns: [...] }
  if (nutrition.columns) {
    return nutrition.columns.map((col) => ({
      label: col.label || "",
      calories: col.calories ?? null,
      protein: col.protein ?? null,
      fat: col.fat ?? null,
      carbs: col.carbs ?? null,
      fiber: col.fiber ?? null,
      sugar: col.sugar ?? null,
      sodium: col.sodium ?? null,
    }));
  }

  // Old flat format: { calories: 350, ... }
  return [
    {
      label: "",
      calories: nutrition.calories ?? null,
      protein: nutrition.protein ?? null,
      fat: nutrition.fat ?? null,
      carbs: nutrition.carbs ?? null,
      fiber: nutrition.fiber ?? null,
      sugar: nutrition.sugar ?? null,
      sodium: nutrition.sodium ?? null,
    },
  ];
};

// Build nutrition JSONB to store, or null if all columns are empty.
// Columns with no data are dropped so blank second columns don't persist.
export const buildNutritionColumns = (columns) => {
  if (!columns || columns.length === 0) return null;

  const built = columns
    .filter((col) => NUTRITION_KEYS.some((key) => col[key] != null))
    .map(({ label, ...fields }) => {
      const obj = { label: label || "" };
      NUTRITION_KEYS.forEach((key) => {
        if (fields[key] != null) obj[key] = fields[key];
      });
      return obj;
    });

  return built.length > 0 ? { columns: built } : null;
};
