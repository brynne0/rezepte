import {
  formatQuantity,
  parseFraction,
  shouldUsePlural,
} from "./fractionUtils";

/**
 * Comprehensive ingredient formatting utility
 * Handles quantity formatting, unit translation/pluralization, and ingredient name logic
 */

// Format quantity based on unit type (fractions vs decimals)
export const formatQuantityForUnit = (quantity, unit, units) => {
  if (!quantity) return "";

  // Check if it's a range first (before parsing)

  if (typeof quantity === "string") {
    const rangeMatch = quantity.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (rangeMatch) {
      return quantity; // Return ranges as-is
    }
  }

  // Parse the quantity if it's a string (handles fractions like "1/2")
  const parsedQuantity =
    typeof quantity === "string" ? parseFraction(quantity) : quantity;

  // If parseFraction returned the original input (couldn't parse), use as-is
  if (parsedQuantity === quantity && typeof quantity === "string") {
    return quantity;
  }

  // Find the unit object to check if it uses fractions
  // Handle null/undefined unit as empty string
  const normalizedUnit = unit || "";
  const unitObj = units?.find((u) => u.value === normalizedUnit);

  // Default to fractions if no unit (cooking context) or if unit uses fractions
  if (!normalizedUnit || unitObj?.useFractions) {
    return formatQuantity(parsedQuantity);
  } else {
    // For metric units, keep as decimal
    const num = parseFloat(parsedQuantity);
    return Number.isInteger(num) ? num.toString() : parsedQuantity.toString();
  }
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

  // Fallback to translated name if available (without plural/singular consideration)
  if (ingredient.name) {
    return ingredient.name;
  }

  // Final fallback to English names
  return shouldUseIngredientPlural && ingredientData.plural_name
    ? ingredientData.plural_name
    : ingredientData.singular_name || "?";
};

/**
 * Format complete ingredient measurement (quantity + unit)
 * This is the main function that combines quantity and unit formatting
 */
export const formatIngredientMeasurement = (quantity, unit, units) => {
  if (!quantity && !unit) return "";

  const displayQuantity = formatQuantityForUnit(quantity, unit, units);
  const displayUnit = formatUnitDisplay(unit, quantity, units);

  // Combine quantity and unit with proper spacing
  if (displayQuantity && displayUnit) {
    return `${displayQuantity} ${displayUnit}`;
  } else if (displayQuantity) {
    return displayQuantity;
  } else if (displayUnit) {
    return displayUnit;
  }

  return "";
};

/**
 * Format complete ingredient display (quantity + unit + name + notes)
 * For recipe display components
 */
export const formatCompleteIngredient = (
  ingredient,
  units,
  currentLanguage = "en"
) => {
  const parts = [];

  // Add measurement (quantity + unit)
  const measurement = formatIngredientMeasurement(
    ingredient.quantity,
    ingredient.unit,
    units
  );
  if (measurement) {
    parts.push(measurement);
  }

  // Add ingredient name
  const ingredientName = getIngredientDisplayName(ingredient, currentLanguage);
  if (ingredientName) {
    parts.push(ingredientName);
  }

  // Add notes
  if (ingredient.notes) {
    parts.push(ingredient.notes);
  }

  return parts.join(" ");
};
