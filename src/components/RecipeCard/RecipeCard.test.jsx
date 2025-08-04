import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RecipeCard from "./RecipeCard";

// Mock the CSS import
vi.mock("./RecipeCard.css", () => ({}));

describe("RecipeCard", () => {
  const mockRecipe = {
    id: 1,
    title: "Chocolate Chip Cookies",
  };

  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it("renders recipe title correctly", () => {
    render(<RecipeCard recipe={mockRecipe} onClick={mockOnClick} />);

    expect(screen.getByText("Chocolate Chip Cookies")).toBeInTheDocument();
  });

  it("applies correct CSS class to container", () => {
    render(<RecipeCard recipe={mockRecipe} onClick={mockOnClick} />);

    const cardElement = screen
      .getByText("Chocolate Chip Cookies")
      .closest("div");
    expect(cardElement).toHaveClass("recipe-card");
  });

  it("calls onClick handler with recipe when clicked", () => {
    render(<RecipeCard recipe={mockRecipe} onClick={mockOnClick} />);

    const cardElement = screen
      .getByText("Chocolate Chip Cookies")
      .closest("div");
    fireEvent.click(cardElement);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(mockOnClick).toHaveBeenCalledWith(mockRecipe);
  });

  it("handles missing recipe title gracefully", () => {
    const recipeWithoutTitle = { id: 2, image: "test.jpg" };
    render(<RecipeCard recipe={recipeWithoutTitle} onClick={mockOnClick} />);

    // Should render without crashing
    const cardElement = screen.getByRole("heading", { level: 4 });
    expect(cardElement).toBeInTheDocument();
  });

  it("renders with different recipe data", () => {
    const differentRecipe = {
      id: 3,
      title: "Pasta",
      image: "pasta.jpg",
    };

    render(<RecipeCard recipe={differentRecipe} onClick={mockOnClick} />);

    expect(screen.getByText("Pasta")).toBeInTheDocument();
  });
});
