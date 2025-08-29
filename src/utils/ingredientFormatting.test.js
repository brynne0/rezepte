import { describe, test, expect } from "vitest";
import {
  formatQuantityForUnit,
  formatUnitDisplay,
  getIngredientDisplayName,
  formatIngredientMeasurement,
} from "./ingredientFormatting";
import { shouldUsePlural } from "./fractionUtils";

describe("ingredientFormatting", () => {
  describe("shouldUsePlural (from fractionUtils)", () => {
    test("extracts end value from ranges for pluralization", () => {
      expect(shouldUsePlural("1-3")).toBe(true); // end value is 3 > 1
      expect(shouldUsePlural("1 - 3")).toBe(true); // end value is 3 > 1
      expect(shouldUsePlural("1/2 - 2")).toBe(true); // end value is 2 > 1
      expect(shouldUsePlural("0.5 – 1.5")).toBe(true); // end value is 1.5 > 1
      expect(shouldUsePlural("1/2 - 1")).toBe(false); // end value is 1 = 1
    });

    test("handles single values", () => {
      expect(shouldUsePlural("1")).toBe(false);
      expect(shouldUsePlural("2")).toBe(true);
      expect(shouldUsePlural("1/2")).toBe(false);
    });

    test("handles empty values", () => {
      expect(shouldUsePlural("")).toBe(false);
      expect(shouldUsePlural(null)).toBe(false);
    });
  });

  // Mock units array similar to what's in translation.json
  const mockUnits = [
    { value: "", label: "-" },
    { value: "tsp", label: "tsp" },
    { value: "tbsp", label: "tbsp" },
    { value: "cup/s", label: "cup/s" },
    { value: "ml", label: "ml" },
    { value: "l", label: "l" },
    { value: "g", label: "g" },
    { value: "kg", label: "kg" },
    { value: "can/s", label: "can/s" },
    { value: "piece/s", label: "piece/s" },
    { value: "pinch/es", label: "pinch/es" },
  ];

  describe("formatQuantityForUnit", () => {
    test("handles ranges correctly", () => {
      expect(formatQuantityForUnit("1/2 - 1", "cup/s", mockUnits)).toBe(
        "1/2 - 1"
      );
      expect(formatQuantityForUnit("1-2", "tsp", mockUnits)).toBe("1-2");
      expect(formatQuantityForUnit("0.5 – 1.5", "ml", mockUnits)).toBe(
        "0.5 – 1.5"
      );
    });

    test("returns input as-is for any input type", () => {
      expect(formatQuantityForUnit("1/2")).toBe("1/2");
      expect(formatQuantityForUnit("0.5")).toBe("0.5");
      expect(formatQuantityForUnit(0.5)).toBe(0.5);
      expect(formatQuantityForUnit("2-3")).toBe("2-3");
      expect(formatQuantityForUnit("")).toBe("");
      expect(formatQuantityForUnit(null)).toBe("");
      expect(formatQuantityForUnit(undefined)).toBe("");
    });
  });

  describe("formatUnitDisplay - pluralization with ranges", () => {
    test("pluralizes based on range end value", () => {
      // Range ending in 1 -> singular
      expect(formatUnitDisplay("cup/s", "1/2 - 1", mockUnits)).toBe("cup");

      // Range ending in >1 -> plural
      expect(formatUnitDisplay("cup/s", "1/2 - 2", mockUnits)).toBe("cups");
      expect(formatUnitDisplay("cup/s", "1 - 3", mockUnits)).toBe("cups");

      // Units without "/" pattern don't pluralize (like tsp, tbsp)
      expect(formatUnitDisplay("tsp", "1/4 - 2", mockUnits)).toBe("tsp");
      expect(formatUnitDisplay("tbsp", "1/2 - 1 1/2", mockUnits)).toBe("tbsp");

      // Units with "/" pattern do pluralize
      expect(formatUnitDisplay("can/s", "1/2 - 2", mockUnits)).toBe("cans");
      expect(formatUnitDisplay("can/s", "1/2 - 1", mockUnits)).toBe("can");
    });

    test("pluralizes single quantities correctly", () => {
      expect(formatUnitDisplay("cup/s", "1", mockUnits)).toBe("cup");
      expect(formatUnitDisplay("cup/s", "2", mockUnits)).toBe("cups");
      expect(formatUnitDisplay("cup/s", "1/2", mockUnits)).toBe("cup");
      expect(formatUnitDisplay("cup/s", "1 1/2", mockUnits)).toBe("cups");
    });

    test("handles pinch/es pluralization", () => {
      expect(formatUnitDisplay("pinch/es", "1", mockUnits)).toBe("pinch");
      expect(formatUnitDisplay("pinch/es", "2", mockUnits)).toBe("pinches");
      expect(formatUnitDisplay("pinch/es", "1/2 - 2", mockUnits)).toBe(
        "pinches"
      );
    });

    test("metric units don't pluralize", () => {
      expect(formatUnitDisplay("ml", "100", mockUnits)).toBe("ml");
      expect(formatUnitDisplay("ml", "100 - 200", mockUnits)).toBe("ml");
      expect(formatUnitDisplay("g", "1 - 500", mockUnits)).toBe("g");
    });
  });

  describe("getIngredientDisplayName - with is_plural flag", () => {
    test("prioritizes processed name from translation service first", () => {
      const ingredient = {
        name: "Wasse", // Already processed by translation service with overrides
        quantity: "1",
        unit: "cup/s",
        singular_name: "water",
        plural_name: "waters",
        translated_names: {
          de: {
            singular_name: "wasser",
            plural_name: "wässer",
          },
        },
        name_overrides: {
          de: "Wasse",
        },
        is_plural: false,
      };

      // Should use the processed name field first (from translation service)
      expect(getIngredientDisplayName(ingredient, "de")).toBe("Wasse");
    });

    test("uses is_plural flag when available", () => {
      const ingredient1 = {
        quantity: "1/2 - 1",
        unit: "cup/s",
        singular_name: "apple",
        plural_name: "apples",
        is_plural: false, // Stored as singular
      };
      // Should use stored is_plural value (false) -> singular
      expect(getIngredientDisplayName(ingredient1)).toBe("apple");

      const ingredient2 = {
        quantity: "1 - 3",
        unit: "piece/s",
        singular_name: "apple",
        plural_name: "apples",
        is_plural: true, // Stored as plural
      };
      // Should use stored is_plural value (true) -> plural
      expect(getIngredientDisplayName(ingredient2)).toBe("apples");

      const ingredient3 = {
        quantity: "5",
        unit: "piece/s",
        singular_name: "apple",
        plural_name: "apples",
        is_plural: false, // User typed singular form despite quantity > 1
      };
      // Should respect stored is_plural value (false) -> singular
      expect(getIngredientDisplayName(ingredient3)).toBe("apple");
    });

    test("defaults to singular when is_plural is missing", () => {
      const ingredient1 = {
        quantity: "1/2 - 1",
        unit: "",
        singular_name: "apple",
        plural_name: "apples",
        // No is_plural property
      };
      // Should default to singular (is_plural || false = false)
      expect(getIngredientDisplayName(ingredient1)).toBe("apple");

      const ingredient2 = {
        quantity: "1 - 3",
        unit: "",
        singular_name: "apple",
        plural_name: "apples",
        // No is_plural property
      };
      // Should default to singular (is_plural || false = false)
      expect(getIngredientDisplayName(ingredient2)).toBe("apple");
    });

    test("uses translated names when language is not English", () => {
      const ingredient = {
        translated_names: {
          de: {
            singular_name: "Apfel",
            plural_name: "Äpfel",
          },
        },
        singular_name: "apple",
        plural_name: "apples",
        is_plural: true,
      };
      // For German, should use translated plural name when is_plural is true
      expect(getIngredientDisplayName(ingredient, "de")).toBe("Äpfel");

      // Test singular case
      const ingredientSingular = {
        translated_names: {
          de: {
            singular_name: "Apfel",
            plural_name: "Äpfel",
          },
        },
        singular_name: "apple",
        plural_name: "apples",
        is_plural: false,
      };
      expect(getIngredientDisplayName(ingredientSingular, "de")).toBe("Apfel");
    });

    test("falls back to name property when no structured translations exist", () => {
      const ingredient = {
        name: "translated apple name",
        singular_name: "apple",
        plural_name: "apples",
        is_plural: true,
      };
      // Should fall back to name property when no translated_names structure exists
      expect(getIngredientDisplayName(ingredient, "de")).toBe(
        "translated apple name"
      );
    });

    test("prioritizes processed name first", () => {
      const ingredient = {
        name: "processed apple name", // Already processed by translation service
        quantity: "1 - 5",
        unit: "piece/s",
        singular_name: "apple",
        plural_name: "apples",
        is_plural: true, // Stored as plural
      };

      // Should use processed name first, even for English
      expect(getIngredientDisplayName(ingredient, "en")).toBe(
        "processed apple name"
      );

      const ingredientSingular = {
        name: "processed apple singular", // Already processed name
        quantity: "5", // High quantity but stored as singular
        unit: "piece/s",
        singular_name: "apple",
        plural_name: "apples",
        is_plural: false, // User typed singular form
      };
      // Should use processed name first
      expect(getIngredientDisplayName(ingredientSingular, "en")).toBe(
        "processed apple singular"
      );
    });
  });

  describe("formatIngredientMeasurement - integration with ranges", () => {
    test("formats ranges with units correctly", () => {
      expect(formatIngredientMeasurement("1/2 - 1", "cup/s", mockUnits)).toBe(
        "1/2 - 1 cup"
      );
      expect(formatIngredientMeasurement("1 - 2", "cup/s", mockUnits)).toBe(
        "1 - 2 cups"
      );
      expect(formatIngredientMeasurement("100 - 200", "ml", mockUnits)).toBe(
        "100 - 200ml"
      );
    });
  });
});
