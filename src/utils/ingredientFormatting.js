import { formatQuantity, parseFraction, shouldUsePlural } from "./fractionUtils";

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
  if (unitObj?.pluralize && translated.includes("/")) {
    const [singular, pluralSuffix] = translated.split("/");
    return shouldUsePlural(quantity)
      ? singular + pluralSuffix
      : singular;
  }
  return translated;
};

// Get the correct ingredient name (singular vs plural)
export const getIngredientDisplayName = (ingredient, units, currentLanguage = "en") => {
  // Handle nested ingredient structure from API
  const ingredientData = ingredient.ingredients || ingredient;

  // Simple pluralization logic based on units
  const unitObj = units?.find((u) => u.value === ingredient.unit);
  
  let shouldUseIngredientPlural;
  
  // For ranges, always use quantity logic regardless of unit type
  const isRange = ingredient.quantity && typeof ingredient.quantity === 'string' && 
    ingredient.quantity.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  
  if (!ingredient.unit || ingredient.unit === "") {
    // No unit or empty unit: use standard quantity logic
    shouldUseIngredientPlural = shouldUsePlural(ingredient.quantity);
  } else if (unitObj?.pluralize === false) {
    // Units like ml, g, kg never pluralize ingredients
    shouldUseIngredientPlural = false;
  } else if (isRange) {
    // Ranges always follow quantity logic regardless of unit type
    shouldUseIngredientPlural = shouldUsePlural(ingredient.quantity);
  } else if (unitObj?.pluralize === true) {
    // Check if it's a countable unit vs measurement/container unit
    if (unitObj.value === 'piece/s') {
      // Countable units like "piece/s" follow standard quantity logic
      shouldUseIngredientPlural = shouldUsePlural(ingredient.quantity);
    } else {
      // Measurement/container units like "tbsp", "tsp", "cup/s", "can/s" always pluralize ingredients when quantity > 0
      shouldUseIngredientPlural = ingredient.quantity && parseFloat(ingredient.quantity) > 0;
    }
  } else {
    // Default: use standard quantity logic
    shouldUseIngredientPlural = shouldUsePlural(ingredient.quantity);
  }

  // For English: use database fields
  if (currentLanguage === "en") {
    return shouldUseIngredientPlural && ingredientData.plural_name
      ? ingredientData.plural_name
      : ingredientData.singular_name || "?";
  }

  // For other languages: return translated name if available, otherwise fallback to English
  if (ingredient.name) {
    return ingredient.name;
  }

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
export const formatCompleteIngredient = (ingredient, units, currentLanguage = "en") => {
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
  const ingredientName = getIngredientDisplayName(ingredient, units, currentLanguage);
  if (ingredientName) {
    parts.push(ingredientName);
  }

  // Add notes
  if (ingredient.notes) {
    parts.push(ingredient.notes);
  }

  return parts.join(" ");
};
