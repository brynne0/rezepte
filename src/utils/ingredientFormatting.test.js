import { describe, test, expect } from "vitest";
import {
  formatQuantityForUnit,
  formatUnitDisplay,
  getIngredientDisplayName,
  formatIngredientMeasurement,
  formatCompleteIngredient,
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
    { value: "", label: "-", useFractions: true },
    { value: "tsp", label: "tsp", useFractions: true },
    { value: "tbsp", label: "tbsp", useFractions: true },
    { value: "cup/s", label: "cup/s", useFractions: true },
    { value: "ml", label: "ml", useFractions: false },
    { value: "l", label: "l", useFractions: false },
    { value: "g", label: "g", useFractions: false },
    { value: "kg", label: "kg", useFractions: false },
    { value: "can/s", label: "can/s", useFractions: true },
    { value: "piece/s", label: "piece/s", useFractions: true },
    {
      value: "pinch/es",
      label: "pinch/es",
      useFractions: true,
    },
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

    test("uses fractions for imperial units", () => {
      expect(formatQuantityForUnit(0.5, "cup/s", mockUnits)).toBe("1/2");
      expect(formatQuantityForUnit(0.25, "tsp", mockUnits)).toBe("1/4");
    });

    test("uses decimals for metric units", () => {
      expect(formatQuantityForUnit(0.5, "ml", mockUnits)).toBe("0.5");
      expect(formatQuantityForUnit(2.5, "g", mockUnits)).toBe("2.5");
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

    test("uses database fields for English even when name property exists", () => {
      const ingredient = {
        name: "translated apple name",
        quantity: "1 - 5",
        unit: "piece/s",
        singular_name: "apple",
        plural_name: "apples",
        is_plural: true, // Stored as plural
      };

      // For English, should use database fields based on is_plural flag
      expect(getIngredientDisplayName(ingredient, "en")).toBe("apples");

      const ingredientSingular = {
        name: "translated apple name",
        quantity: "5", // High quantity but stored as singular
        unit: "piece/s",
        singular_name: "apple",
        plural_name: "apples",
        is_plural: false, // User typed singular form
      };
      // Should respect stored is_plural flag over quantity
      expect(getIngredientDisplayName(ingredientSingular, "en")).toBe("apple");
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
        "100 - 200 ml"
      );
    });
  });

  describe("formatCompleteIngredient - full integration", () => {
    test("formats complete ingredient with range and is_plural flag", () => {
      const ingredient = {
        quantity: "1/2 - 2",
        unit: "cup/s",
        singular_name: "flour",
        plural_name: "flours",
        notes: "sifted",
        is_plural: false, // User typed singular despite range > 1
      };

      expect(formatCompleteIngredient(ingredient, mockUnits)).toBe(
        "1/2 - 2 cups flour sifted"
      );
    });

    test("formats ingredient respecting is_plural flag over quantity", () => {
      const ingredient = {
        quantity: "1",
        unit: "cup/s",
        singular_name: "flour",
        plural_name: "flours",
        notes: "sifted",
        is_plural: true, // User typed plural despite quantity = 1
      };

      expect(formatCompleteIngredient(ingredient, mockUnits)).toBe(
        "1 cup flours sifted"
      );
    });

    test("formats ingredient with translated name for non-English", () => {
      const ingredient = {
        translated_names: {
          de: {
            singular_name: "Mehl",
            plural_name: "Mehle",
          },
        },
        quantity: "1 - 3",
        unit: "cup/s",
        singular_name: "flour",
        plural_name: "flours",
        notes: "sifted",
        is_plural: true, // Use plural form
      };

      expect(formatCompleteIngredient(ingredient, mockUnits, "de")).toBe(
        "1 - 3 cups Mehle sifted"
      );
    });

    test("falls back to name property when no structured translations", () => {
      const ingredient = {
        name: "all-purpose flour",
        quantity: "1 - 3",
        unit: "cup/s",
        singular_name: "flour",
        plural_name: "flours",
        notes: "sifted",
        is_plural: true, // This will be ignored since using fallback name
      };

      expect(formatCompleteIngredient(ingredient, mockUnits, "de")).toBe(
        "1 - 3 cups all-purpose flour sifted"
      );
    });
  });
});
