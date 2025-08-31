import { describe, test, expect } from "vitest";
import {
  parseFraction,
  formatQuantity,
  shouldUsePlural,
} from "./fractionUtils";

describe("fractionUtils", () => {
  describe("parseFraction", () => {
    test("handles empty/null values", () => {
      expect(parseFraction("")).toBe("");
      expect(parseFraction(null)).toBe("");
      expect(parseFraction(undefined)).toBe("");
      expect(parseFraction(0)).toBe(0);
    });

    test("parses decimal numbers", () => {
      expect(parseFraction("0.25")).toBe(0.25);
      expect(parseFraction("1.5")).toBe(1.5);
      expect(parseFraction("2")).toBe(2);
      expect(parseFraction(3.14)).toBe(3.14);
    });

    test("handles ranges", () => {
      expect(parseFraction("1/2 - 1")).toBe("1/2 - 1");
      expect(parseFraction("1-2")).toBe("1-2");
      expect(parseFraction("1/4-1/2")).toBe("1/4-1/2");
      expect(parseFraction("0.5 – 1.5")).toBe("0.5 – 1.5");
      expect(parseFraction("2—3")).toBe("2—3");
    });

    test("parses simple fractions", () => {
      expect(parseFraction("1/4")).toBe(0.25);
      expect(parseFraction("1/2")).toBe(0.5);
      expect(parseFraction("3/4")).toBe(0.75);
      expect(parseFraction("1/3")).toBeCloseTo(0.333, 2);
      expect(parseFraction("2/3")).toBeCloseTo(0.667, 2);
    });

    test("parses mixed fractions", () => {
      expect(parseFraction("1 1/4")).toBe(1.25);
      expect(parseFraction("2 1/2")).toBe(2.5);
      expect(parseFraction("3 3/4")).toBe(3.75);
      expect(parseFraction("1 1/3")).toBeCloseTo(1.333, 2);
    });

    test("parses Unicode fraction characters", () => {
      expect(parseFraction("¼")).toBe(0.25);
      expect(parseFraction("½")).toBe(0.5);
      expect(parseFraction("¾")).toBe(0.75);
      expect(parseFraction("2 ¼")).toBe(2.25);
      expect(parseFraction("1 ½")).toBe(1.5);
      expect(parseFraction("3 ¾")).toBe(3.75);
    });

    test("preserves incomplete mixed fractions while user types", () => {
      expect(parseFraction("1 ")).toBe("1 ");
      expect(parseFraction("2 ")).toBe("2 ");
      expect(parseFraction("10 ")).toBe("10 ");
      expect(parseFraction("1 1")).toBe("1 1");
      expect(parseFraction("2 3")).toBe("2 3");
      expect(parseFraction("1 1/")).toBe("1 1/");
    });

    test("trims trailing spaces from complete fractions", () => {
      expect(parseFraction("1 1/2 ")).toBe(1.5); // Complete fraction, should be parsed
      expect(parseFraction("2 3/4  ")).toBe(2.75); // Complete fraction with multiple spaces
      expect(parseFraction("1/2 ")).toBe(0.5); // Simple fraction with trailing space
    });

    test("handles invalid input gracefully", () => {
      expect(parseFraction("invalid")).toBe("invalid");
      expect(parseFraction("1/")).toBe("1/");
      expect(parseFraction("/4")).toBe("/4");
      expect(parseFraction("a/b")).toBe("a/b");
    });

    test("handles whitespace", () => {
      expect(parseFraction("  1/4  ")).toBe(0.25);
      expect(parseFraction(" 1 1/2 ")).toBe(1.5);
      // Test multiple spaces between whole number and fraction
      expect(parseFraction("1  1/2")).toBe(1.5);
      expect(parseFraction("1   1/2")).toBe(1.5);
      expect(parseFraction("2    3/4")).toBe(2.75);
    });
  });

  describe("formatQuantity", () => {
    test("handles empty/null values", () => {
      expect(formatQuantity("")).toBe("");
      expect(formatQuantity(null)).toBe("");
      expect(formatQuantity(undefined)).toBe("");
      expect(formatQuantity(0)).toBe("0");
    });

    test("formats common fractions", () => {
      expect(formatQuantity(0.25)).toBe("1/4");
      expect(formatQuantity(0.5)).toBe("1/2");
      expect(formatQuantity(0.75)).toBe("3/4");
      expect(formatQuantity(0.33)).toBe("1/3");
      expect(formatQuantity(0.333)).toBe("1/3");
      expect(formatQuantity(0.67)).toBe("2/3");
      expect(formatQuantity(0.667)).toBe("2/3");
    });

    test("handles ranges", () => {
      expect(formatQuantity("1/2 - 1")).toBe("1/2 - 1");
      expect(formatQuantity("1-2")).toBe("1-2");
      expect(formatQuantity("0.5 – 1.5")).toBe("0.5 – 1.5");
    });

    test("formats mixed fractions", () => {
      expect(formatQuantity(1.25)).toBe("1 1/4");
      expect(formatQuantity(1.5)).toBe("1 1/2");
      expect(formatQuantity(2.75)).toBe("2 3/4");
      expect(formatQuantity(3.33)).toBe("3 1/3");
      expect(formatQuantity(3.333)).toBe("3 1/3");
    });

    test("handles whole numbers", () => {
      expect(formatQuantity(1)).toBe("1");
      expect(formatQuantity(2)).toBe("2");
      expect(formatQuantity(10)).toBe("10");
    });

    test("handles uncommon decimals", () => {
      expect(formatQuantity(0.1)).toBe("0.1");
      expect(formatQuantity(0.7)).toBe("0.7");
      expect(formatQuantity(1.23)).toBe("1.23");
      expect(formatQuantity(3.14159)).toBe("3.14159");
    });

    test("handles floating point precision", () => {
      // Test values that are close to common fractions due to floating point precision
      expect(formatQuantity(0.2499999)).toBe("1/4");
      expect(formatQuantity(0.5000001)).toBe("1/2");
      expect(formatQuantity(1.2499999)).toBe("1 1/4");
    });

    test("handles string input", () => {
      expect(formatQuantity("0.25")).toBe("1/4");
      expect(formatQuantity("1.5")).toBe("1 1/2");
      expect(formatQuantity("2")).toBe("2");
    });
  });

  describe("integration tests", () => {
    test("parse then format returns readable fractions", () => {
      // Test the full cycle: user types fraction → parsed to decimal → formatted back to fraction
      const testCases = [
        { input: "1/4", expected: "1/4" },
        { input: "1/2", expected: "1/2" },
        { input: "3/4", expected: "3/4" },
        { input: "1 1/4", expected: "1 1/4" },
        { input: "2 1/2", expected: "2 1/2" },
        { input: "0.25", expected: "1/4" },
        { input: "1.5", expected: "1 1/2" },
        { input: "2", expected: "2" },
      ];

      testCases.forEach(({ input, expected }) => {
        const parsed = parseFraction(input);
        const formatted = formatQuantity(parsed);
        expect(formatted).toBe(expected);
      });
    });

    test("handles uncommon fractions gracefully", () => {
      // Test fractions that don't have common equivalents
      const parsed = parseFraction("1/7"); // ≈ 0.143
      const formatted = formatQuantity(parsed);
      expect(formatted).toBe(parsed.toString()); // Should show the decimal
    });
  });

  describe("shouldUsePlural", () => {
    test("returns false for quantities <= 1", () => {
      expect(shouldUsePlural("0")).toBe(false);
      expect(shouldUsePlural("1")).toBe(false);
      expect(shouldUsePlural("1/4")).toBe(false);
      expect(shouldUsePlural("1/2")).toBe(false);
      expect(shouldUsePlural("3/4")).toBe(false);
    });

    test("returns true for quantities > 1", () => {
      expect(shouldUsePlural("2")).toBe(true);
      expect(shouldUsePlural("1.5")).toBe(true);
      expect(shouldUsePlural("2 1/4")).toBe(true);
      expect(shouldUsePlural("1 1/2")).toBe(true);
      expect(shouldUsePlural("3 3/4")).toBe(true);
    });

    test("handles Unicode fraction characters", () => {
      expect(shouldUsePlural("2 ¼")).toBe(true);
      expect(shouldUsePlural("1 ½")).toBe(true);
      expect(shouldUsePlural("3 ¾")).toBe(true);
      expect(shouldUsePlural("¼")).toBe(false);
      expect(shouldUsePlural("½")).toBe(false);
      expect(shouldUsePlural("¾")).toBe(false);
    });

    test("handles ranges using end value", () => {
      expect(shouldUsePlural("1/2 - 1")).toBe(false);
      expect(shouldUsePlural("1 - 2")).toBe(true);
      expect(shouldUsePlural("1/4 - 3/4")).toBe(false);
      expect(shouldUsePlural("1 - 1 1/2")).toBe(true);
    });
  });
});
