import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import CategoryFilter from "./CategoryFilter";
import "@testing-library/jest-dom";

describe("CategoryFilter Component", () => {
  const mockCategories = [
    { value: "all_recipes", label: "All Recipes" },
    { value: "brunch", label: "Brunch" },
    { value: "dinner", label: "Dinner" },
    { value: "sides", label: "Sides" },
    { value: "sauces", label: "Sauces" },
    { value: "snacks", label: "Snacks" },
    { value: "baking", label: "Baking" },
    { value: "bread", label: "Bread" },
    { value: "staples", label: "Staples" },
  ];

  const mockSetSelectedCategory = vi.fn();
  const mockSetSearchTerm = vi.fn();

  const defaultProps = {
    categories: mockCategories,
    selectedCategory: "all_recipes",
    setSelectedCategory: mockSetSelectedCategory,
    setSearchTerm: mockSetSearchTerm,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders all category buttons", () => {
    render(<CategoryFilter {...defaultProps} />);

    // Check that all categories are rendered
    expect(screen.getByText("All Recipes")).toBeInTheDocument();
    expect(screen.getByText("Brunch")).toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Sides")).toBeInTheDocument();
    expect(screen.getByText("Sauces")).toBeInTheDocument();
    expect(screen.getByText("Snacks")).toBeInTheDocument();
    expect(screen.getByText("Baking")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(screen.getByText("Staples")).toBeInTheDocument();
  });

  test("applies selected class to currently selected category", () => {
    render(<CategoryFilter {...defaultProps} selectedCategory="brunch" />);

    const brunchButton = screen.getByText("Brunch").closest("button");
    const breadButton = screen.getByText("Bread").closest("button");

    expect(brunchButton).toHaveClass("subheading-wrapper selected");
    expect(breadButton).toHaveClass("subheading-wrapper");
    expect(breadButton).not.toHaveClass("selected");
  });

  test("calls setSelectedCategory and setSearchTerm when category is clicked", () => {
    render(<CategoryFilter {...defaultProps} />);

    const breadButton = screen.getByText("Bread");
    fireEvent.click(breadButton);

    expect(mockSetSelectedCategory).toHaveBeenCalledTimes(1);
    expect(mockSetSelectedCategory).toHaveBeenCalledWith("bread");
    expect(mockSetSearchTerm).toHaveBeenCalledTimes(1);
    expect(mockSetSearchTerm).toHaveBeenCalledWith("");
  });

  test("clears search term when any category is selected", () => {
    render(<CategoryFilter {...defaultProps} />);

    const breadButton = screen.getByText("Bread");
    fireEvent.click(breadButton);

    expect(mockSetSearchTerm).toHaveBeenCalledWith("");
  });

  test("renders correct number of category buttons", () => {
    render(<CategoryFilter {...defaultProps} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(mockCategories.length);
  });

  test("each button has correct structure with h2 element", () => {
    render(<CategoryFilter {...defaultProps} />);

    mockCategories.forEach((category) => {
      const h2Element = screen.getByText(category.label);
      expect(h2Element.tagName).toBe("H2");
      expect(h2Element).toHaveClass("forta");
      expect(h2Element.closest("button")).toBeInTheDocument();
    });
  });

  test("wrapper div has correct CSS class", () => {
    const { container } = render(<CategoryFilter {...defaultProps} />);

    const wrapper = container.querySelector(".categories-wrapper");
    expect(wrapper).toBeInTheDocument();
  });
});
