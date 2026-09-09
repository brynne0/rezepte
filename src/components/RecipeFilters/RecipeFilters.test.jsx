import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import RecipeFilters from "./RecipeFilters";
import "@testing-library/jest-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

describe("RecipeFilters Component", () => {
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
  const mockSetSortBy = vi.fn();
  const mockSetShowImages = vi.fn();

  const defaultProps = {
    categories: mockCategories,
    selectedCategory: "all_recipes",
    setSelectedCategory: mockSetSelectedCategory,
    searchTerm: "",
    setSearchTerm: mockSetSearchTerm,
    sortBy: "title_asc",
    setSortBy: mockSetSortBy,
    showImages: false,
    setShowImages: mockSetShowImages,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("category buttons", () => {
    test("renders all category buttons", () => {
      render(<RecipeFilters {...defaultProps} />);

      mockCategories.forEach((category) => {
        expect(screen.getByText(category.label)).toBeInTheDocument();
      });
    });

    test("applies aria-pressed to currently selected category", () => {
      render(<RecipeFilters {...defaultProps} selectedCategory="brunch" />);

      const brunchButton = screen.getByText("Brunch").closest("button");
      const breadButton = screen.getByText("Bread").closest("button");

      expect(brunchButton).toHaveAttribute("aria-pressed", "true");
      expect(breadButton).toHaveAttribute("aria-pressed", "false");
    });

    test("calls setSelectedCategory and clears search when category is clicked", () => {
      render(<RecipeFilters {...defaultProps} />);

      fireEvent.click(screen.getByText("Bread"));

      expect(mockSetSelectedCategory).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedCategory).toHaveBeenCalledWith("bread");
      expect(mockSetSearchTerm).toHaveBeenCalledWith("");
    });
  });

  describe("search input", () => {
    test("calls setSearchTerm as the user types", () => {
      render(<RecipeFilters {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText("search"), {
        target: { value: "soup" },
      });

      expect(mockSetSearchTerm).toHaveBeenCalledWith("soup");
    });

    test("resets category to all_recipes when typing, by default", () => {
      render(<RecipeFilters {...defaultProps} selectedCategory="brunch" />);

      fireEvent.change(screen.getByPlaceholderText("search"), {
        target: { value: "soup" },
      });

      expect(mockSetSelectedCategory).toHaveBeenCalledWith("all_recipes");
    });

    test("does not reset category when resetCategoryOnSearch is false", () => {
      render(
        <RecipeFilters
          {...defaultProps}
          selectedCategory="brunch"
          resetCategoryOnSearch={false}
        />
      );

      fireEvent.change(screen.getByPlaceholderText("search"), {
        target: { value: "soup" },
      });

      expect(mockSetSelectedCategory).not.toHaveBeenCalled();
    });

    test("clears the search input via the clear button", () => {
      render(<RecipeFilters {...defaultProps} searchTerm="soup" />);

      fireEvent.click(screen.getByLabelText("clear_search"));

      expect(mockSetSearchTerm).toHaveBeenCalledWith("");
    });
  });
});
