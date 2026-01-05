import { describe, it, expect } from "vitest";
import { toTitleCase } from "./stringUtils";

describe("stringUtils", () => {
  describe("toTitleCase", () => {
    it("should capitalize the first letter of each word", () => {
      expect(toTitleCase("hello world")).toBe("Hello World");
      expect(toTitleCase("trees are green")).toBe("Trees Are Green");
    });

    it("should handle single words", () => {
      expect(toTitleCase("hello")).toBe("Hello");
      expect(toTitleCase("HELLO")).toBe("HELLO");
    });

    it("should handle already capitalized text", () => {
      expect(toTitleCase("Hello World")).toBe("Hello World");
      expect(toTitleCase("Trees Are Brown")).toBe("Trees Are Brown");
    });

    it("should handle empty or null inputs", () => {
      expect(toTitleCase("")).toBe("");
      expect(toTitleCase(null)).toBe(null);
      expect(toTitleCase(undefined)).toBe(undefined);
    });

    it("should handle text with multiple spaces", () => {
      expect(toTitleCase("hello  world")).toBe("Hello  World");
    });

    it("should handle lowercase German to English translations", () => {
      expect(toTitleCase("chickpea curry")).toBe("Chickpea Curry");
      expect(toTitleCase("lentil soup")).toBe("Lentil Soup");
    });
  });
});
