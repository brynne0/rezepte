import { shouldUsePlural } from "./fractionUtils";

/**
 * Comprehensive ingredient formatting utility
 * Handles quantity formatting, unit translation/pluralization, and ingredient name logic
 */

// Format quantity - now simply returns input as-is for maximum user flexibility
export const formatQuantityForUnit = (quantity) => {
  // Accept any input: 1/2, 1.5, 2 1/4, 2-3 cups, etc.
  // Users can enter whatever format they prefer
  return quantity || "";
};

// Get translated and pluralized unit display
export const formatUnitDisplay = (unit, quantity, units) => {
  if (!unit) return "";

  // Find the unit object - exact match only
  const unitObj = units?.find((u) => u.value === unit);

  const translated = unitObj?.label || unit;

  // Handle pluralization for units that support it
  if (translated.includes("/")) {
    const [singular, pluralSuffix] = translated.split("/");
    return shouldUsePlural(quantity) ? singular + pluralSuffix : singular;
  }
  return translated;
};

// Get the correct ingredient name (singular vs plural) based on stored is_plural flag
export const getIngredientDisplayName = (
  ingredient,
  currentLanguage = "en"
) => {
  // FIRST: Check if translation service has already processed this ingredient
  // The translation service sets ingredient.name with the final result (including overrides)
  if (ingredient.name) {
    return ingredient.name;
  }

  // Handle nested ingredient structure from API
  const ingredientData = ingredient.ingredients || ingredient;

  // All ingredients should now have is_plural flag
  const shouldUseIngredientPlural = ingredient.is_plural || false;

  // For English: use database fields
  if (currentLanguage === "en") {
    return shouldUseIngredientPlural && ingredientData.plural_name
      ? ingredientData.plural_name
      : ingredientData.singular_name || "?";
  }

  // For other languages: check for translated names in the ingredients data structure
  const translation = ingredientData.translated_names?.[currentLanguage];
  if (translation && typeof translation === "object") {
    return shouldUseIngredientPlural && translation.plural_name
      ? translation.plural_name
      : translation.singular_name;
  }

  // Final fallback to English names
  return shouldUseIngredientPlural && ingredientData.plural_name
    ? ingredientData.plural_name
    : ingredientData.singular_name || "?";
};

// Format complete ingredient measurement (quantity + unit)
export const formatIngredientMeasurement = (quantity, unit, units) => {
  if (!quantity && !unit) return "";

  const displayQuantity = formatQuantityForUnit(quantity);
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
