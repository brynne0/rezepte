import { shouldUsePlural, convertToUnicodeFractions } from "./fractionUtils";

// Ingredient formatting: quantities, units, and names

// Return quantity as typed, for editing
export const formatQuantityForUnit = (quantity) => {
  // Accepts any format: 1/2, 1.5, 2 1/4, 2-3 cups, etc.
  return quantity || "";
};

// Format quantity for display - converts regular fractions to Unicode
export const formatQuantityForDisplay = (quantity) => {
  if (!quantity) return "";

  // Use Unicode fractions for display
  return convertToUnicodeFractions(quantity);
};

// Get the translated, pluralised unit label
export const formatUnitDisplay = (unit, quantity, units) => {
  if (!unit) return "";

  // Exact match only - `units` may be a non-array if the translation
  // hasn't loaded yet (e.g. offline and /locales/*.json wasn't cached)
  const unitObj = Array.isArray(units)
    ? units.find((u) => u.value === unit)
    : undefined;

  const translated = unitObj?.label || unit;

  // Pluralise units that support it
  if (translated.includes("/")) {
    const [singular, pluralSuffix] = translated.split("/");
    return shouldUsePlural(quantity) ? singular + pluralSuffix : singular;
  }
  return translated;
};

// Pick singular or plural form from a { singular_name, plural_name } pair
const pickForm = (names, usePlural) => {
  if (!names) return undefined;
  return usePlural && names.plural_name
    ? names.plural_name
    : names.singular_name;
};

// Get a language's { singular_name, plural_name } pair from stored data only
// (no live translation). Falls back to English if nothing is cached yet.
export const getIngredientNamesForLanguage = (ingredient, language) => {
  const ingredientData = ingredient.ingredients || ingredient;
  const englishNames = {
    singular_name: ingredientData.singular_name,
    plural_name: ingredientData.plural_name,
  };

  if (language === "en") return englishNames;

  const translation = ingredientData.translated_names?.[language];
  if (translation && typeof translation === "object") return translation;

  return englishNames;
};

// Resolve a name from stored data only (no live translation). Checks
// overrides, then the source language, then a cached translation. Returns
// null if nothing is cached and a live translation would be needed.
export const resolveIngredientName = (
  ingredient,
  targetLanguage,
  sourceLanguage = "en"
) => {
  const usePlural = ingredient.is_plural || false;

  // Per-recipe override wins first
  const override = ingredient.name_overrides?.[targetLanguage];
  if (override) return override;

  // English is canonical - read it from the columns, never translated_names
  if (targetLanguage === "en") {
    return (
      pickForm(getIngredientNamesForLanguage(ingredient, "en"), usePlural) ||
      "?"
    );
  }

  if (targetLanguage === sourceLanguage) {
    return (
      pickForm(
        getIngredientNamesForLanguage(ingredient, sourceLanguage),
        usePlural
      ) || "?"
    );
  }

  const ingredientData = ingredient.ingredients || ingredient;
  const targetTranslation = ingredientData.translated_names?.[targetLanguage];
  if (targetTranslation && typeof targetTranslation === "object") {
    return pickForm(targetTranslation, usePlural);
  }

  return null;
};

// Pick singular or plural using the stored is_plural flag
export const getIngredientDisplayName = (
  ingredient,
  currentLanguage = "en"
) => {
  // Already resolved by the translation service? Use that.
  if (ingredient.name) {
    return ingredient.name;
  }

  const resolved = resolveIngredientName(ingredient, currentLanguage, "en");
  if (resolved !== null) return resolved;

  // No cached translation - fall back to English
  return resolveIngredientName(ingredient, "en", "en");
};

// Format complete ingredient measurement (quantity + unit) for display
export const formatIngredientMeasurement = (quantity, unit, units) => {
  if (!quantity && !unit) return "";

  const displayQuantity = formatQuantityForDisplay(quantity);
  const displayUnit = formatUnitDisplay(unit, quantity, units);

  // Combine quantity and unit with proper spacing
  if (displayQuantity && displayUnit) {
    // No space for metric units
    const metricUnits = ["g", "kg", "l", "ml"];
    const isMetricUnit = metricUnits.includes(unit);
    return isMetricUnit
      ? `${displayQuantity}${displayUnit}`
      : `${displayQuantity} ${displayUnit}`;
  } else if (displayQuantity) {
    return displayQuantity;
  } else if (displayUnit) {
    return displayUnit;
  }

  return "";
};
