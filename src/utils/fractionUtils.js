// Utility functions for handling fractions in recipes

// Parses user input and converts fractions to decimal numbers
export const parseFraction = (input) => {
  if (!input && input !== 0) return "";

  const str = input.toString().trim();

  // Already a decimal or whole number
  if (!isNaN(str) && !str.includes("/")) {
    return parseFloat(str);
  }

  // Handle mixed numbers like "1 1/4", "2 3/4"
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const [, whole, numerator, denominator] = mixedMatch;
    return parseFloat(whole) + parseFloat(numerator) / parseFloat(denominator);
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
