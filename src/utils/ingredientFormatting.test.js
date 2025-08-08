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
    { value: "", label: "-", pluralize: true, useFractions: true },
    { value: "tsp", label: "tsp", pluralize: true, useFractions: true },
    { value: "tbsp", label: "tbsp", pluralize: true, useFractions: true },
    { value: "cup/s", label: "cup/s", pluralize: true, useFractions: true },
    { value: "ml", label: "ml", pluralize: false, useFractions: false },
    { value: "l", label: "l", pluralize: false, useFractions: false },
    { value: "g", label: "g", pluralize: false, useFractions: false },
    { value: "kg", label: "kg", pluralize: false, useFractions: false },
    { value: "can/s", label: "can/s", pluralize: true, useFractions: true },
    { value: "piece/s", label: "piece/s", pluralize: true, useFractions: true },
    {
      value: "pinch/es",
      label: "pinch/es",
      pluralize: true,
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

  describe("getIngredientDisplayName - pluralization with ranges", () => {
    test("pluralizes ingredient names based on range end value", () => {
      const ingredient1 = {
        quantity: "1/2 - 1",
        unit: "cup/s",
        singular_name: "apple",
        plural_name: "apples",
      };
      // Range ends at 1 -> should be singular (based on end value of range)
      expect(getIngredientDisplayName(ingredient1, mockUnits)).toBe("apple");

      const ingredient2 = {
        quantity: "1 - 3",
        unit: "piece/s", // countable unit
        singular_name: "apple",
        plural_name: "apples",
      };
      // Range ends at 3 with countable unit -> should be plural
      expect(getIngredientDisplayName(ingredient2, mockUnits)).toBe("apples");

      const ingredient3 = {
        quantity: "1/4 - 1",
        unit: "piece/s", // countable unit
        singular_name: "apple",
        plural_name: "apples",
      };
      // Range ends at 1 with countable unit -> should be singular
      expect(getIngredientDisplayName(ingredient3, mockUnits)).toBe("apple");
    });

    test("handles no unit with ranges", () => {
      const ingredient1 = {
        quantity: "1/2 - 1",
        unit: "",
        singular_name: "apple",
        plural_name: "apples",
      };
      // Range ends at 1, no unit -> should be singular (quantity logic applies)
      expect(getIngredientDisplayName(ingredient1, mockUnits)).toBe("apple");

      const ingredient2 = {
        quantity: "1 - 3",
        unit: "",
        singular_name: "apple",
        plural_name: "apples",
      };
      // Range ends at 3, no unit -> should be plural
      expect(getIngredientDisplayName(ingredient2, mockUnits)).toBe("apples");
    });

    test("uses translated names when language is not English", () => {
      const ingredient = {
        name: "translated apple name",
        quantity: "1 - 5",
        unit: "piece/s",
        singular_name: "apple",
        plural_name: "apples",
      };
      // For non-English, should return the translated name
      expect(getIngredientDisplayName(ingredient, mockUnits, "de")).toBe(
        "translated apple name"
      );
    });

    test("uses database fields for English even when name property exists", () => {
      const ingredient = {
        name: "translated apple name",
        quantity: "1 - 5",
        unit: "piece/s", // countable unit with quantity > 1
        singular_name: "apple",
        plural_name: "apples",
      };
      // For English, should use database fields (plural because quantity ends > 1)
      expect(getIngredientDisplayName(ingredient, mockUnits, "en")).toBe("apples");
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
    test("formats complete ingredient with range", () => {
      const ingredient = {
        quantity: "1/2 - 2",
        unit: "cup/s",
        singular_name: "flour",
        plural_name: "flour",
        notes: "sifted",
      };

      expect(formatCompleteIngredient(ingredient, mockUnits)).toBe(
        "1/2 - 2 cups flour sifted"
      );
    });

    test("formats ingredient with range and database fields", () => {
      const ingredient = {
        quantity: "1 - 3",
        unit: "cup/s",
        singular_name: "flour",
        plural_name: "flour",
        notes: "sifted",
      };

      expect(formatCompleteIngredient(ingredient, mockUnits)).toBe(
        "1 - 3 cups flour sifted"
      );
    });

    test("formats ingredient with translated name for non-English", () => {
      const ingredient = {
        name: "all-purpose flour",
        quantity: "1 - 3",
        unit: "cup/s",
        singular_name: "flour", 
        plural_name: "flour",
        notes: "sifted",
      };

      expect(formatCompleteIngredient(ingredient, mockUnits, "de")).toBe(
        "1 - 3 cups all-purpose flour sifted"
      );
    });
  });
});
