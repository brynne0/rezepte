import { describe, test, expect } from "vitest";
import { buildNutritionJson } from "./nutritionUtils";

describe("buildNutritionJson", () => {
  test("returns null when all fields are null", () => {
    const data = {
      nutrition_calories: null,
      nutrition_protein: null,
      nutrition_fat: null,
      nutrition_carbs: null,
      nutrition_fiber: null,
      nutrition_sugar: null,
      nutrition_sodium: null,
    };
    expect(buildNutritionJson(data)).toBeNull();
  });

  test("returns null when nutrition fields are absent", () => {
    expect(buildNutritionJson({})).toBeNull();
  });

  test("maps all seven fields to correct keys", () => {
    const data = {
      nutrition_calories: 350,
      nutrition_protein: 25,
      nutrition_fat: 10,
      nutrition_carbs: 40,
      nutrition_fiber: 5,
      nutrition_sugar: 8,
      nutrition_sodium: 600,
    };
    expect(buildNutritionJson(data)).toEqual({
      calories: 350,
      protein: 25,
      fat: 10,
      carbs: 40,
      fiber: 5,
      sugar: 8,
      sodium: 600,
    });
  });

  test("includes only non-null fields", () => {
    const data = {
      nutrition_calories: 200,
      nutrition_protein: null,
      nutrition_fat: 8,
      nutrition_carbs: null,
      nutrition_fiber: null,
      nutrition_sugar: null,
      nutrition_sodium: null,
    };
    expect(buildNutritionJson(data)).toEqual({ calories: 200, fat: 8 });
  });

  test("preserves zero as a valid value", () => {
    const data = {
      nutrition_calories: 0,
      nutrition_protein: null,
      nutrition_fat: null,
      nutrition_carbs: null,
      nutrition_fiber: null,
      nutrition_sugar: null,
      nutrition_sodium: null,
    };
    expect(buildNutritionJson(data)).toEqual({ calories: 0 });
  });
});
