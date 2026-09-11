import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AddRecipePage from "./AddRecipe";

vi.mock("../../components/RecipeForm/RecipeForm", () => ({
  __esModule: true,
  default: vi.fn(({ title, categories }) => (
    <div
      data-testid="recipe-form-mock"
      data-categories={categories ? JSON.stringify(categories) : undefined}
    >
      {title}
    </div>
  )),
}));

describe("AddRecipePage", () => {
  const mockCategories = [
    { value: "desserts", label: "Desserts" },
    { value: "main-dishes", label: "Main Dishes" },
  ];

  it("renders the RecipeForm mock with correct props", () => {
    render(<AddRecipePage categories={mockCategories} />);

    const recipeForm = screen.getByTestId("recipe-form-mock");
    expect(recipeForm).toBeInTheDocument();
  });

  it("renders without categories prop", () => {
    render(<AddRecipePage />);

    const recipeForm = screen.getByTestId("recipe-form-mock");
    expect(recipeForm).toBeInTheDocument();
  });

  it("renders RecipeForm in add mode with correct title and categories", () => {
    render(<AddRecipePage categories={mockCategories} />);

    const recipeForm = screen.getByTestId("recipe-form-mock");
    expect(recipeForm).toBeInTheDocument();

    // Check that the title is passed correctly
    const addTitle = screen.getByText("add_new_recipe");
    expect(addTitle).toBeInTheDocument();

    // Verify categories are passed as props (mock behavior)
    expect(recipeForm).toHaveAttribute(
      "data-categories",
      JSON.stringify(mockCategories)
    );
  });
});
