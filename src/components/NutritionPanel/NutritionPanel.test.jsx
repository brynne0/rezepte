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

  // Single-column (old flat format)
  test("renders old flat format as single column", () => {
    const recipe = { nutrition: { calories: 300, protein: 20 } };
    render(<NutritionPanel recipe={recipe} />);

    expect(screen.getByText("Calories")).toBeInTheDocument();
    expect(screen.getByText("Protein")).toBeInTheDocument();
    expect(screen.queryByText("Fat")).not.toBeInTheDocument();
  });

  test("displays single-column values with correct units", () => {
    const recipe = {
      nutrition: { calories: 350, protein: 25, sodium: 600 },
    };
    render(<NutritionPanel recipe={recipe} />);

    expect(screen.getByText("350 kcal")).toBeInTheDocument();
    expect(screen.getByText("25 g")).toBeInTheDocument();
    expect(screen.getByText("600 mg")).toBeInTheDocument();
  });

  test("shows no header when single column has no label", () => {
    const recipe = { nutrition: { calories: 100 } };
    render(<NutritionPanel recipe={recipe} />);

    expect(screen.queryByText("per serving")).not.toBeInTheDocument();
  });

  test("shows custom label as table header for labeled single column", () => {
    const recipe = {
      nutrition: { columns: [{ label: "Per Bowl", calories: 400 }] },
    };
    render(<NutritionPanel recipe={recipe} />);

    expect(screen.getByText("Per Bowl")).toBeInTheDocument();
  });

  // Two-column (new format)
  test("renders two columns side by side", () => {
    const recipe = {
      nutrition: {
        columns: [
          { label: "Per Serving", calories: 350, protein: 25 },
          { label: "Per 100g", calories: 280, protein: 20 },
        ],
      },
    };
    render(<NutritionPanel recipe={recipe} />);

    expect(screen.getByText("Per Serving")).toBeInTheDocument();
    expect(screen.getByText("Per 100g")).toBeInTheDocument();
    expect(screen.getByText("350 kcal")).toBeInTheDocument();
    expect(screen.getByText("280 kcal")).toBeInTheDocument();
    expect(screen.getByText("25 g")).toBeInTheDocument();
    expect(screen.getByText("20 g")).toBeInTheDocument();
  });

  test("skips fields absent from all columns", () => {
    const recipe = {
      nutrition: {
        columns: [
          { label: "A", calories: 100 },
          { label: "B", calories: 80 },
        ],
      },
    };
    render(<NutritionPanel recipe={recipe} />);

    expect(screen.queryByText("Protein")).not.toBeInTheDocument();
    expect(screen.queryByText("Fat")).not.toBeInTheDocument();
  });

  test("shows dash for missing value in one column", () => {
    const recipe = {
      nutrition: {
        columns: [
          { label: "A", calories: 100, protein: 10 },
          { label: "B", calories: 80 },
        ],
      },
    };
    render(<NutritionPanel recipe={recipe} />);

    expect(screen.getByText("10 g")).toBeInTheDocument();
    expect(screen.getByText("–")).toBeInTheDocument();
  });
});
