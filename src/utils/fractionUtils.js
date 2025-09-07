// Utility functions for handling fractions in recipes

// Normalises Unicode fraction characters to regular fractions
export const normaliseUnicodeFractions = (input) => {
  if (!input) return input;

  const unicodeFractions = {
    "¼": "1/4",
    "½": "1/2",
    "¾": "3/4",
    "⅛": "1/8",
    "⅜": "3/8",
    "⅝": "5/8",
    "⅞": "7/8",
    "⅓": "1/3",
    "⅔": "2/3",
    "⅕": "1/5",
    "⅖": "2/5",
    "⅗": "3/5",
    "⅘": "4/5",
    "⅙": "1/6",
    "⅚": "5/6",
  };

  let normalised = input.toString();
  for (const [unicode, fraction] of Object.entries(unicodeFractions)) {
    normalised = normalised.replace(new RegExp(unicode, "g"), fraction);
  }

  return normalised;
};

// Converts regular fractions to Unicode for display
export const convertToUnicodeFractions = (input) => {
  if (!input) return input;

  const regularToUnicode = {
    "1/8": "⅛",
    "1/7": "1/7", // No Unicode equivalent
    "1/6": "⅙",
    "1/5": "⅕",
    "1/4": "¼",
    "1/3": "⅓",
    "3/8": "⅜",
    "2/5": "⅖",
    "1/2": "½",
    "3/5": "⅗",
    "5/8": "⅝",
    "2/3": "⅔",
    "3/4": "¾",
    "4/5": "⅘",
    "5/6": "⅚",
    "7/8": "⅞",
  };

  let display = input.toString();

  // Sort by length (longest first) to avoid partial matches
  const sortedFractions = Object.entries(regularToUnicode)
    .filter(([regular, unicode]) => unicode !== regular) // Skip fractions without Unicode
    .sort(([a], [b]) => b.length - a.length);

  for (const [regular, unicode] of sortedFractions) {
    display = display.replace(new RegExp(regular, "g"), unicode);
  }

  return display;
};

// Parses user input and converts fractions to decimal numbers
export const parseFraction = (input) => {
  if (!input && input !== 0) return "";

  const originalStr = input.toString();
  const normalised = normaliseUnicodeFractions(originalStr);
  const str = normalised.trim();

  // Preserve incomplete mixed fractions while typing (e.g., "1 ", "1 1", "1 1/")
  if (originalStr !== str && /^\d+\s+(\d+\/?)?$/.test(originalStr)) {
    return input;
  }

  // Handle ranges like "1/2 - 1", "1-2", "1/4-1/2"
  const rangeMatch = str.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (rangeMatch) {
    // For ranges, return the original string as-is for display
    // The backend/storage can handle this as needed
    return input;
  }

  // Handle mixed numbers like "1 1/4", "2 3/4"
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const [, whole, numerator, denominator] = mixedMatch;
    return parseFloat(whole) + parseFloat(numerator) / parseFloat(denominator);
  }

  // Already a decimal or whole number (no spaces)
  if (!isNaN(str) && !str.includes("/") && !str.includes(" ")) {
    return parseFloat(str);
  }

  // Handle simple fractions like "1/4", "3/4"
  const fractionMatch = str.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, numerator, denominator] = fractionMatch;
    return parseFloat(numerator) / parseFloat(denominator);
  }

  // Fallback to original input if can't parse
  return input;
};

// Formats decimal numbers as fractions for display
export const formatQuantity = (decimal) => {
  if (!decimal && decimal !== 0) return "";

  // If input is a string that looks like a range, return as-is
  if (typeof decimal === "string") {
    const rangeMatch = decimal.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (rangeMatch) {
      return decimal;
    }
  }

  const num = parseFloat(decimal);

  // Common fractions mapping
  const commonFractions = {
    0.125: "1/8",
    0.25: "1/4",
    0.33: "1/3",
    0.333: "1/3",
    0.5: "1/2",
    0.67: "2/3",
    0.667: "2/3",
    0.75: "3/4",
    0.875: "7/8",
    1.25: "1 1/4",
    1.33: "1 1/3",
    1.333: "1 1/3",
    1.5: "1 1/2",
    1.67: "1 2/3",
    1.667: "1 2/3",
    1.75: "1 3/4",
    2.25: "2 1/4",
    2.33: "2 1/3",
    2.333: "2 1/3",
    2.5: "2 1/2",
    2.67: "2 2/3",
    2.667: "2 2/3",
    2.75: "2 3/4",
    3.25: "3 1/4",
    3.33: "3 1/3",
    3.333: "3 1/3",
    3.5: "3 1/2",
    3.67: "3 2/3",
    3.667: "3 2/3",
    3.75: "3 3/4",
  };

  // Check for exact matches first
  if (commonFractions[num]) {
    return commonFractions[num];
  }

  // Check for close matches (within 0.001 to handle floating point precision)
  for (const [decimalKey, fractionValue] of Object.entries(commonFractions)) {
    if (Math.abs(parseFloat(decimalKey) - num) < 0.001) {
      return fractionValue;
    }
  }

  // For whole numbers, don't show decimal
  if (Number.isInteger(num)) {
    return num.toString();
  }

  // Return original decimal for uncommon fractions
  return decimal.toString();
};

// Helper function to determine if quantity should use plural form
// Handles ranges by using the end value for pluralization
export const shouldUsePlural = (quantity) => {
  if (!quantity) return false;

  // Handle ranges like "1-3", "1/2 - 2"
  const rangeMatch = quantity.toString().match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (rangeMatch) {
    const [, _, end] = rangeMatch;
    const endValue = parseFraction(end.trim());
    return !isNaN(endValue) && endValue > 1;
  }

  // Single value
  const num = parseFraction(quantity);
  return !isNaN(num) && num > 1;
};
