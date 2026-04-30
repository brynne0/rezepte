import { describe, test, expect } from "vitest";
import {
  buildNutritionColumns,
  parseNutritionColumns,
  emptyNutritionColumn,
} from "./nutritionUtils";

describe("buildNutritionColumns", () => {
  test("returns null when columns array is empty", () => {
    expect(buildNutritionColumns([])).toBeNull();
  });

  test("returns null when all column values are null", () => {
    expect(buildNutritionColumns([emptyNutritionColumn()])).toBeNull();
  });

  test("builds single column with present fields only", () => {
    const columns = [
      {
        label: "Per Serving",
        calories: 350,
        protein: 25,
        fat: null,
        carbs: null,
        fiber: null,
        sugar: null,
        sodium: null,
      },
    ];
    expect(buildNutritionColumns(columns)).toEqual({
      columns: [{ label: "Per Serving", calories: 350, protein: 25 }],
    });
  });

  test("builds two columns", () => {
    const columns = [
      {
        label: "Per Serving",
        calories: 350,
        protein: 25,
        fat: null,
        carbs: null,
        fiber: null,
        sugar: null,
        sodium: null,
      },
      {
        label: "Per 100g",
        calories: 280,
        protein: 20,
        fat: null,
        carbs: null,
        fiber: null,
        sugar: null,
        sodium: null,
      },
    ];
    expect(buildNutritionColumns(columns)).toEqual({
      columns: [
        { label: "Per Serving", calories: 350, protein: 25 },
        { label: "Per 100g", calories: 280, protein: 20 },
      ],
    });
  });

  test("returns null when no column has any data", () => {
    const columns = [emptyNutritionColumn(), emptyNutritionColumn()];
    expect(buildNutritionColumns(columns)).toBeNull();
  });

  test("preserves zero as a valid value", () => {
    const columns = [
      {
        label: "",
        calories: 0,
        protein: null,
        fat: null,
        carbs: null,
        fiber: null,
        sugar: null,
        sodium: null,
      },
    ];
    expect(buildNutritionColumns(columns)).toEqual({
      columns: [{ label: "", calories: 0 }],
    });
  });
});

describe("parseNutritionColumns", () => {
  test("returns single empty column when nutrition is null", () => {
    const result = parseNutritionColumns(null);
    expect(result).toHaveLength(1);
    expect(result[0].calories).toBeNull();
  });

  test("parses new columns format", () => {
    const nutrition = {
      columns: [
        { label: "Per Serving", calories: 350, protein: 25 },
        { label: "Per 100g", calories: 280, protein: 20 },
      ],
    };
    const result = parseNutritionColumns(nutrition);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("Per Serving");
    expect(result[0].calories).toBe(350);
    expect(result[1].label).toBe("Per 100g");
    expect(result[1].protein).toBe(20);
  });

  test("parses old flat format as single column with empty label", () => {
    const nutrition = { calories: 350, protein: 25, fat: 10 };
    const result = parseNutritionColumns(nutrition);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("");
    expect(result[0].calories).toBe(350);
    expect(result[0].protein).toBe(25);
    expect(result[0].fat).toBe(10);
  });

  test("fills missing keys with null when parsing old flat format", () => {
    const nutrition = { calories: 200 };
    const result = parseNutritionColumns(nutrition);
    expect(result[0].protein).toBeNull();
    expect(result[0].sodium).toBeNull();
  });
});
