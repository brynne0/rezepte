import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import NutritionPanel from "./NutritionPanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        nutritional_info: "Nutritional info",
        nutrition_per_serving: "per serving",
        nutrition_calories: "Calories",
        nutrition_protein: "Protein",
        nutrition_fat: "Fat",
        nutrition_carbs: "Carbs",
        nutrition_fiber: "Fiber",
        nutrition_sugar: "Sugar",
        nutrition_sodium: "Sodium",
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock("./NutritionPanel.css", () => ({}));

describe("NutritionPanel", () => {
  test("renders nothing when recipe.nutrition is null", () => {
    const { container } = render(
      <NutritionPanel recipe={{ nutrition: null }} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders nothing when recipe.nutrition is undefined", () => {
    const { container } = render(<NutritionPanel recipe={{}} />);
    expect(container.firstChild).toBeNull();
  });

  test("renders only fields that are present in nutrition", () => {
    const recipe = { nutrition: { calories: 300, protein: 20 } };
    render(<NutritionPanel recipe={recipe} />);

    expect(screen.getByText("Calories")).toBeInTheDocument();
    expect(screen.getByText("Protein")).toBeInTheDocument();
    expect(screen.queryByText("Fat")).not.toBeInTheDocument();
    expect(screen.queryByText("Carbs")).not.toBeInTheDocument();
  });

  test("displays values with correct units", () => {
    const recipe = {
      nutrition: { calories: 350, protein: 25, sodium: 600 },
    };
    render(<NutritionPanel recipe={recipe} />);

    expect(screen.getByText("350 kcal")).toBeInTheDocument();
    expect(screen.getByText("25 g")).toBeInTheDocument();
    expect(screen.getByText("600 mg")).toBeInTheDocument();
  });

  test("always shows 'per serving' label regardless of recipe multiplier", () => {
    const recipe = { nutrition: { calories: 100 } };
    render(<NutritionPanel recipe={recipe} />);

    expect(screen.getByText("(per serving)")).toBeInTheDocument();
  });
});
