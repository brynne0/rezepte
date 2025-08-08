import { formatQuantity, parseFraction } from "./fractionUtils";

/**
 * Comprehensive ingredient formatting utility
 * Handles quantity formatting, unit translation/pluralization, and ingredient name logic
 */

// Format quantity based on unit type (fractions vs decimals)
export const formatQuantityForUnit = (quantity, unit, units) => {
  if (!quantity) return "";

  // Parse the quantity if it's a string (handles fractions like "1/2")
  const parsedQuantity =
    typeof quantity === "string" ? parseFraction(quantity) : quantity;

  // Find the unit object to check if it uses fractions
  const unitObj = units?.find((u) => u.value === unit);

  // Default to fractions if no unit (cooking context) or if unit uses fractions
  if (!unit || unitObj?.useFractions) {
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

  // Find the unit object - try exact match first, then with common suffixes
  let unitObj = units?.find((u) => u.value === unit);
  if (!unitObj && unit) {
    unitObj =
      units?.find((u) => u.value === unit + "/s") ||
      units?.find((u) => u.value === unit + "/es");
  }

  const translated = unitObj?.label || unit;

  // Handle pluralization for units that support it
  if (unitObj?.pluralize && translated.includes("/")) {
    const [singular, pluralSuffix] = translated.split("/");
    return parseFloat(quantity) > 1 ? singular + pluralSuffix : singular;
  }

  return translated;
};

// Get the correct ingredient name (singular vs plural)
export const getIngredientDisplayName = (ingredient) => {
  // If we have a translated name from the translation service, use that
  if (ingredient.name) {
    return ingredient.name;
  }

  // Fallback to database fields for untranslated recipes
  const countableUnits = ["piece/s"];
  const isCountableUnit = countableUnits.includes(ingredient.unit);

  const shouldUsePlural = isCountableUnit
    ? ingredient.quantity && parseFloat(ingredient.quantity) !== 1 // Countable units: match quantity
    : ingredient.unit ||
      (ingredient.quantity && parseFloat(ingredient.quantity) !== 1); // Measurement units: always plural, no unit: quantity logic

  if (shouldUsePlural && ingredient.plural_name) {
    return ingredient.plural_name;
  }

  return ingredient.singular_name || "?";
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
export const formatCompleteIngredient = (ingredient, units) => {
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
  const ingredientName = getIngredientDisplayName(ingredient);
  if (ingredientName) {
    parts.push(ingredientName);
  }

  // Add notes
  if (ingredient.notes) {
    parts.push(ingredient.notes);
  }

  return parts.join(" ");
};
