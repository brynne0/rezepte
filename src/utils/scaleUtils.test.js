import { describe, test, expect } from "vitest";
import {
  scaleIngredient,
  getNextMultiplierStep,
  formatMultiplierLabel,
} from "./scaleUtils";

describe("scaleUtils", () => {
  describe("scaleIngredient", () => {
    describe("returns unchanged when multiplier is 1 or quantity is empty", () => {
      test("multiplier 1 returns original", () => {
        expect(scaleIngredient("2", "cup/s", 1)).toEqual({
          quantity: "2",
          unit: "cup/s",
        });
        expect(scaleIngredient("1/2", "tsp", 1)).toEqual({
          quantity: "1/2",
          unit: "tsp",
        });
      });

      test("empty quantity returns unchanged", () => {
        expect(scaleIngredient("", "g", 2)).toEqual({
          quantity: "",
          unit: "g",
        });
        expect(scaleIngredient(null, "ml", 2)).toEqual({
          quantity: null,
          unit: "ml",
        });
      });
    });

    describe("basic scaling", () => {
      test("doubles whole numbers", () => {
        expect(scaleIngredient("2", "", 2)).toEqual({
          quantity: "4",
          unit: "",
        });
        expect(scaleIngredient("3", "", 2)).toEqual({
          quantity: "6",
          unit: "",
        });
      });

      test("halves quantities", () => {
        expect(scaleIngredient("2", "", 0.5)).toEqual({
          quantity: "1",
          unit: "",
        });
        expect(scaleIngredient("1", "", 0.5)).toEqual({
          quantity: "1/2",
          unit: "",
        });
      });

      test("scales fractions", () => {
        expect(scaleIngredient("1/4", "", 2)).toEqual({
          quantity: "1/2",
          unit: "",
        });
        expect(scaleIngredient("1/2", "", 4)).toEqual({
          quantity: "2",
          unit: "",
        });
      });

      test("scales mixed fractions", () => {
        expect(scaleIngredient("1 1/2", "", 2)).toEqual({
          quantity: "3",
          unit: "",
        });
        expect(scaleIngredient("2 1/4", "", 2)).toEqual({
          quantity: "4 1/2",
          unit: "",
        });
        // 1.25 x 4 = 5 — clean whole number
        expect(scaleIngredient("1 1/4", "", 4)).toEqual({
          quantity: "5",
          unit: "",
        });
      });

      test("scales unicode fractions", () => {
        expect(scaleIngredient("¼", "", 2)).toEqual({
          quantity: "1/2",
          unit: "",
        });
        expect(scaleIngredient("½", "", 2)).toEqual({
          quantity: "1",
          unit: "",
        });
      });
    });

    describe("~ prefix (approximate quantities)", () => {
      test("preserves ~ prefix after scaling", () => {
        // 400ml x 2 = 800ml — below the 1000ml threshold, stays as ml
        expect(scaleIngredient("~400", "ml", 2)).toEqual({
          quantity: "~800",
          unit: "ml",
        });
        // 400ml x 3 = 1200ml — over threshold, converts to l
        expect(scaleIngredient("~400", "ml", 3)).toEqual({
          quantity: "~1.2",
          unit: "l",
        });
        expect(scaleIngredient("~1", "cup/s", 2)).toEqual({
          quantity: "~2",
          unit: "cup/s",
        });
      });

      test("preserves ~ with unit conversion", () => {
        expect(scaleIngredient("~500", "g", 2)).toEqual({
          quantity: "~1",
          unit: "kg",
        });
      });
    });

    describe("ranges", () => {
      test("scales both ends of a range", () => {
        expect(scaleIngredient("1 - 2", "", 2)).toEqual({
          quantity: "2 - 4",
          unit: "",
        });
        expect(scaleIngredient("1/2 - 1", "", 2)).toEqual({
          quantity: "1 - 2",
          unit: "",
        });
      });

      test("keeps unit unchanged for ranges (no unit conversion)", () => {
        // Even if scaled values would trigger unit conversion for a single value,
        // ranges keep the original unit
        expect(scaleIngredient("400 - 600", "ml", 4)).toEqual({
          quantity: "1600 - 2400",
          unit: "ml",
        });
      });

      test("handles em-dash and en-dash separators", () => {
        const result1 = scaleIngredient("1–2", "", 2);
        expect(result1.quantity).toMatch(/^2\s*[–-]\s*4$/);
        const result2 = scaleIngredient("1—2", "", 2);
        expect(result2.quantity).toMatch(/^2\s*[—-]\s*4$/);
      });

      test("non-numeric range returns unchanged", () => {
        expect(scaleIngredient("a - b", "", 2)).toEqual({
          quantity: "a - b",
          unit: "",
        });
      });
    });

    describe("unit conversions — scale up", () => {
      test("tsp → tbsp at 3 tsp", () => {
        expect(scaleIngredient("1", "tsp", 3)).toEqual({
          quantity: "1",
          unit: "tbsp",
        });
        expect(scaleIngredient("2", "tsp", 3)).toEqual({
          quantity: "2",
          unit: "tbsp",
        });
      });

      test("tbsp → cup/s at 4 tbsp", () => {
        expect(scaleIngredient("2", "tbsp", 2)).toEqual({
          quantity: "1/4",
          unit: "cup/s",
        });
        expect(scaleIngredient("4", "tbsp", 2)).toEqual({
          quantity: "1/2",
          unit: "cup/s",
        });
      });

      test("ml → l at 1000 ml", () => {
        expect(scaleIngredient("500", "ml", 2)).toEqual({
          quantity: "1",
          unit: "l",
        });
        expect(scaleIngredient("250", "ml", 4)).toEqual({
          quantity: "1",
          unit: "l",
        });
      });

      test("g → kg at 1000 g", () => {
        expect(scaleIngredient("500", "g", 2)).toEqual({
          quantity: "1",
          unit: "kg",
        });
        expect(scaleIngredient("250", "g", 4)).toEqual({
          quantity: "1",
          unit: "kg",
        });
      });

      test("tsp chains through tbsp → cup/s", () => {
        // 1 tsp x 48 = 48 tsp = 16 tbsp = 1 cup
        expect(scaleIngredient("1", "tsp", 48)).toEqual({
          quantity: "1",
          unit: "cup/s",
        });
      });
    });

    describe("unit conversions — scale down", () => {
      test("cup/s → tbsp below 1/4 cup", () => {
        // 1 x 0.25 = 0.25 cups, exactly at threshold — strict < so stays as cups
        expect(scaleIngredient("1", "cup/s", 0.25)).toEqual({
          quantity: "1/4",
          unit: "cup/s",
        });
        // 0.5 x 0.25 = 0.125 cups — below threshold, converts to tbsp
        expect(scaleIngredient("1/2", "cup/s", 0.25)).toEqual({
          quantity: "2",
          unit: "tbsp",
        });
      });

      test("tbsp → tsp below 1/3 tbsp", () => {
        expect(scaleIngredient("1", "tbsp", 0.25)).toEqual({
          quantity: "3/4",
          unit: "tsp",
        });
      });

      test("l → ml below 0.1 l", () => {
        expect(scaleIngredient("1", "l", 0.05)).toEqual({
          quantity: "50",
          unit: "ml",
        });
      });

      test("kg → g below 0.1 kg", () => {
        expect(scaleIngredient("1", "kg", 0.05)).toEqual({
          quantity: "50",
          unit: "g",
        });
      });
    });

    describe("non-parseable quantities", () => {
      test("returns unchanged for text quantities", () => {
        expect(scaleIngredient("a handful", "", 2)).toEqual({
          quantity: "a handful",
          unit: "",
        });
        expect(scaleIngredient("to taste", "", 3)).toEqual({
          quantity: "to taste",
          unit: "",
        });
      });
    });
  });

  describe("getNextMultiplierStep", () => {
    test("steps up correctly", () => {
      expect(getNextMultiplierStep(1, 1)).toBe(1.5);
      expect(getNextMultiplierStep(1.5, 1)).toBe(2);
      expect(getNextMultiplierStep(2, 1)).toBe(2.5);
      expect(getNextMultiplierStep(0.25, 1)).toBe(0.5);
    });

    test("steps down correctly", () => {
      expect(getNextMultiplierStep(2, -1)).toBe(1.5);
      expect(getNextMultiplierStep(1.5, -1)).toBe(1);
      expect(getNextMultiplierStep(1, -1)).toBe(0.75);
      expect(getNextMultiplierStep(0.5, -1)).toBe(0.25);
    });

    test("clamps at min and max", () => {
      expect(getNextMultiplierStep(0.25, -1)).toBe(0.25);
      expect(getNextMultiplierStep(8, 1)).toBe(8);
    });

    test("handles values between steps", () => {
      // A value not on a step should find the next step in the right direction
      expect(getNextMultiplierStep(1.2, 1)).toBe(1.5);
      expect(getNextMultiplierStep(1.2, -1)).toBe(1);
    });
  });

  describe("formatMultiplierLabel", () => {
    test("formats known steps", () => {
      expect(formatMultiplierLabel(0.25)).toBe("1/4x");
      expect(formatMultiplierLabel(0.5)).toBe("1/2x");
      expect(formatMultiplierLabel(0.75)).toBe("3/4x");
      expect(formatMultiplierLabel(1)).toBe("1x");
      expect(formatMultiplierLabel(1.5)).toBe("1.5x");
      expect(formatMultiplierLabel(2)).toBe("2x");
      expect(formatMultiplierLabel(8)).toBe("8x");
    });

    test("falls back for unknown values", () => {
      expect(formatMultiplierLabel(5)).toBe("5x");
      expect(formatMultiplierLabel(1.25)).toBe("1.25x");
    });
  });
});
