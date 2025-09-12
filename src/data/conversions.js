// Hard-coded conversion data for cooking measurements
// All conversions are organized by category and provide bidirectional conversion ratios

export const conversions = {
  volume: [
    // Teaspoons and Tablespoons
    { from: "tsp", to: "tbsp", ratio: 1 / 3, description: "1 tsp = 0.33 tbsp" },
    { from: "tbsp", to: "tsp", ratio: 3, description: "1 tbsp = 3 tsp" },

    // Cups and Milliliters
    {
      from: "cup",
      to: "ml",
      ratio: 236.588,
      description: "1 cup = 236.588 ml",
    },
    {
      from: "ml",
      to: "cup",
      ratio: 1 / 236.588,
      description: "1 ml = 0.004 cups",
    },

    // Cups and Fluid Ounces
    { from: "cup", to: "fl oz", ratio: 8, description: "1 cup = 8 fl oz" },
    {
      from: "fl oz",
      to: "cup",
      ratio: 1 / 8,
      description: "1 fl oz = 0.125 cups",
    },

    // Cups and Liters
    {
      from: "cup",
      to: "l",
      ratio: 0.236588,
      description: "1 cup = 0.237 liters",
    },
    { from: "l", to: "cup", ratio: 4.227, description: "1 liter = 4.227 cups" },

    // Tablespoons and Milliliters
    {
      from: "tbsp",
      to: "ml",
      ratio: 14.787,
      description: "1 tbsp = 14.787 ml",
    },
    {
      from: "ml",
      to: "tbsp",
      ratio: 1 / 14.787,
      description: "1 ml = 0.068 tbsp",
    },

    // Teaspoons and Milliliters
    { from: "tsp", to: "ml", ratio: 4.929, description: "1 tsp = 4.929 ml" },
    {
      from: "ml",
      to: "tsp",
      ratio: 1 / 4.929,
      description: "1 ml = 0.203 tsp",
    },

    // Pints and Cups
    { from: "pint", to: "cup", ratio: 2, description: "1 pint = 2 cups" },
    { from: "cup", to: "pint", ratio: 0.5, description: "1 cup = 0.5 pints" },

    // Quarts and Cups
    { from: "quart", to: "cup", ratio: 4, description: "1 quart = 4 cups" },
    {
      from: "cup",
      to: "quart",
      ratio: 0.25,
      description: "1 cup = 0.25 quarts",
    },

    // Gallons and Cups
    { from: "gallon", to: "cup", ratio: 16, description: "1 gallon = 16 cups" },
    {
      from: "cup",
      to: "gallon",
      ratio: 1 / 16,
      description: "1 cup = 0.0625 gallons",
    },
  ],

  weight: [
    // Ounces and Grams
    { from: "oz", to: "g", ratio: 28.35, description: "1 oz = 28.35 g" },
    { from: "g", to: "oz", ratio: 1 / 28.35, description: "1 g = 0.035 oz" },

    // Pounds and Grams
    { from: "lb", to: "g", ratio: 453.592, description: "1 lb = 453.592 g" },
    { from: "g", to: "lb", ratio: 1 / 453.592, description: "1 g = 0.002 lbs" },

    // Pounds and Kilograms
    { from: "lb", to: "kg", ratio: 0.453592, description: "1 lb = 0.454 kg" },
    { from: "kg", to: "lb", ratio: 2.205, description: "1 kg = 2.205 lbs" },

    // Pounds and Ounces
    { from: "lb", to: "oz", ratio: 16, description: "1 lb = 16 oz" },
    { from: "oz", to: "lb", ratio: 1 / 16, description: "1 oz = 0.0625 lbs" },

    // Kilograms and Grams
    { from: "kg", to: "g", ratio: 1000, description: "1 kg = 1000 g" },
    { from: "g", to: "kg", ratio: 0.001, description: "1 g = 0.001 kg" },
  ],

  temperature: [
    // Fahrenheit and Celsius
    {
      from: "°F",
      to: "°C",
      ratio: null, // Special conversion formula
      description: "°C = (°F - 32) × 5/9",
      formula: (f) => ((f - 32) * 5) / 9,
    },
    {
      from: "°C",
      to: "°F",
      ratio: null, // Special conversion formula
      description: "°F = (°C × 9/5) + 32",
      formula: (c) => (c * 9) / 5 + 32,
    },
  ],

  common: [
    // Common ingredient approximations
    {
      from: "cup flour",
      to: "g",
      ratio: 120,
      description: "1 cup flour ≈ 120 g",
    },
    {
      from: "cup sugar",
      to: "g",
      ratio: 200,
      description: "1 cup sugar ≈ 200 g",
    },
    {
      from: "cup rice",
      to: "g",
      ratio: 185,
      description: "1 cup rice ≈ 185 g",
    },
    { from: "cup oats", to: "g", ratio: 80, description: "1 cup oats ≈ 80 g" },
    {
      from: "cup milk",
      to: "g",
      ratio: 240,
      description: "1 cup milk ≈ 240 g",
    },
  ],
};

// Helper function to get all conversions for a category
export const getConversionsForCategory = (category) => {
  return conversions[category] || [];
};

// Helper function to get all categories
export const getConversionCategories = () => {
  return Object.keys(conversions);
};

// Helper function to search conversions
export const searchConversions = (query) => {
  const results = [];
  const searchTerm = query.toLowerCase();

  Object.entries(conversions).forEach(([category, items]) => {
    items.forEach((item) => {
      if (
        item.from.toLowerCase().includes(searchTerm) ||
        item.to.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm)
      ) {
        results.push({ ...item, category });
      }
    });
  });

  return results;
};

// Helper function to convert a value using the conversion data
export const convertValue = (value, fromUnit, toUnit) => {
  // Find the conversion
  let conversion = null;

  for (const category of Object.values(conversions)) {
    conversion = category.find(
      (c) =>
        c.from.toLowerCase() === fromUnit.toLowerCase() &&
        c.to.toLowerCase() === toUnit.toLowerCase()
    );
    if (conversion) break;
  }

  if (!conversion) return null;

  // Handle temperature conversions with formulas
  if (conversion.formula) {
    return conversion.formula(value);
  }

  // Handle regular ratio conversions
  if (conversion.ratio) {
    return value * conversion.ratio;
  }

  return null;
};
