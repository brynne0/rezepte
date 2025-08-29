import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  describe("Source Link Functionality", () => {
    const mockWindowOpen = vi.fn();

    beforeEach(() => {
      // Mock window.open
      vi.stubGlobal("window", {
        ...window,
        open: mockWindowOpen,
      });
      mockWindowOpen.mockClear();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("shows link icon when recipe has http source", () => {
      const recipeWithHttpLink = {
        id: 1,
        title: "Test Recipe",
        source: "http://example.com",
      };

      render(<RecipeCard recipe={recipeWithHttpLink} onClick={mockOnClick} />);

      expect(
        screen.getByRole("link", { name: "open_recipe_source_link" })
      ).toBeInTheDocument();
    });

    it("shows link icon when recipe has https source", () => {
      const recipeWithHttpsLink = {
        id: 1,
        title: "Test Recipe",
        source: "https://example.com",
      };

      render(<RecipeCard recipe={recipeWithHttpsLink} onClick={mockOnClick} />);

      expect(
        screen.getByRole("link", { name: "open_recipe_source_link" })
      ).toBeInTheDocument();
    });

    it("shows link icon when recipe has www source", () => {
      const recipeWithWwwLink = {
        id: 1,
        title: "Test Recipe",
        source: "www.example.com",
      };

      render(<RecipeCard recipe={recipeWithWwwLink} onClick={mockOnClick} />);

      expect(
        screen.getByRole("link", { name: "open_recipe_source_link" })
      ).toBeInTheDocument();
    });

    it("does not show link icon when recipe has text source", () => {
      const recipeWithTextSource = {
        id: 1,
        title: "Test Recipe",
        source: "My grandmother's recipe",
      };

      render(
        <RecipeCard recipe={recipeWithTextSource} onClick={mockOnClick} />
      );

      expect(
        screen.queryByRole("link", { name: "open_recipe_source_link" })
      ).not.toBeInTheDocument();
    });

    it("does not show link icon when recipe has no source", () => {
      const recipeWithoutSource = {
        id: 1,
        title: "Test Recipe",
      };

      render(<RecipeCard recipe={recipeWithoutSource} onClick={mockOnClick} />);

      expect(
        screen.queryByRole("link", { name: "open_recipe_source_link" })
      ).not.toBeInTheDocument();
    });

    it("external link has correct href attribute", () => {
      const recipeWithLink = {
        id: 1,
        title: "Test Recipe",
        source: "https://example.com",
      };

      render(<RecipeCard recipe={recipeWithLink} onClick={mockOnClick} />);

      const linkElement = screen.getByRole("link", {
        name: "open_recipe_source_link",
      });
      expect(linkElement).toHaveAttribute("href", "https://example.com");
      expect(linkElement).toHaveAttribute("target", "_blank");
      expect(linkElement).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("prevents card click when link icon is clicked", () => {
      const recipeWithLink = {
        id: 1,
        title: "Test Recipe",
        source: "https://example.com",
      };

      render(<RecipeCard recipe={recipeWithLink} onClick={mockOnClick} />);

      const linkIcon = screen.getByRole("link", {
        name: "open_recipe_source_link",
      });
      fireEvent.click(linkIcon);

      // Card onClick should not be called
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("still calls card onClick when clicking elsewhere on card", () => {
      const recipeWithLink = {
        id: 1,
        title: "Test Recipe",
        source: "https://example.com",
      };

      render(<RecipeCard recipe={recipeWithLink} onClick={mockOnClick} />);

      // Click on the title instead of the link icon
      const title = screen.getByText("Test Recipe");
      fireEvent.click(title);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
      expect(mockOnClick).toHaveBeenCalledWith(recipeWithLink);
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });
  });

  describe("Conditional Link Display (Only Empty Recipes)", () => {
    it("shows link when recipe has source and no ingredients or instructions", () => {
      const emptyRecipeWithLink = {
        id: 1,
        title: "Empty Recipe",
        source: "https://example.com",
      };

      render(<RecipeCard recipe={emptyRecipeWithLink} onClick={mockOnClick} />);

      expect(
        screen.getByRole("link", { name: "open_recipe_source_link" })
      ).toBeInTheDocument();
    });

    it("does not show link when recipe has ingredients (legacy format)", () => {
      const recipeWithIngredients = {
        id: 1,
        title: "Recipe with Ingredients",
        source: "https://example.com",
        ingredients: [{ id: 1, name: "flour" }],
      };

      render(
        <RecipeCard recipe={recipeWithIngredients} onClick={mockOnClick} />
      );

      expect(
        screen.queryByRole("link", { name: "open_recipe_source_link" })
      ).not.toBeInTheDocument();
    });

    it("does not show link when recipe has ungrouped ingredients", () => {
      const recipeWithUngroupedIngredients = {
        id: 1,
        title: "Recipe with Ungrouped Ingredients",
        source: "https://example.com",
        ungroupedIngredients: [{ id: 1, name: "sugar" }],
      };

      render(
        <RecipeCard
          recipe={recipeWithUngroupedIngredients}
          onClick={mockOnClick}
        />
      );

      expect(
        screen.queryByRole("link", { name: "open_recipe_source_link" })
      ).not.toBeInTheDocument();
    });

    it("does not show link when recipe has ingredient sections", () => {
      const recipeWithIngredientSections = {
        id: 1,
        title: "Recipe with Ingredient Sections",
        source: "https://example.com",
        ingredientSections: [
          {
            subheading: "Dry ingredients",
            ingredients: [{ id: 1, name: "flour" }],
          },
        ],
      };

      render(
        <RecipeCard
          recipe={recipeWithIngredientSections}
          onClick={mockOnClick}
        />
      );

      expect(
        screen.queryByRole("link", { name: "open_recipe_source_link" })
      ).not.toBeInTheDocument();
    });

    it("does not show link when recipe has instructions", () => {
      const recipeWithInstructions = {
        id: 1,
        title: "Recipe with Instructions",
        source: "https://example.com",
        instructions: ["Mix ingredients", "Bake for 20 minutes"],
      };

      render(
        <RecipeCard recipe={recipeWithInstructions} onClick={mockOnClick} />
      );

      expect(
        screen.queryByRole("link", { name: "open_recipe_source_link" })
      ).not.toBeInTheDocument();
    });

    it("does not show link when recipe has both ingredients and instructions", () => {
      const completeRecipe = {
        id: 1,
        title: "Complete Recipe",
        source: "https://example.com",
        ingredients: [{ id: 1, name: "flour" }],
        instructions: ["Mix ingredients", "Bake for 20 minutes"],
      };

      render(<RecipeCard recipe={completeRecipe} onClick={mockOnClick} />);

      expect(
        screen.queryByRole("link", { name: "open_recipe_source_link" })
      ).not.toBeInTheDocument();
    });

    it("shows link when recipe has empty arrays for ingredients and instructions", () => {
      const emptyArraysRecipe = {
        id: 1,
        title: "Recipe with Empty Arrays",
        source: "https://example.com",
        ingredients: [],
        ungroupedIngredients: [],
        ingredientSections: [],
        instructions: [],
      };

      render(<RecipeCard recipe={emptyArraysRecipe} onClick={mockOnClick} />);

      expect(
        screen.getByRole("link", { name: "open_recipe_source_link" })
      ).toBeInTheDocument();
    });

    it("does not show link when recipe has no source even if empty", () => {
      const emptyRecipeWithoutSource = {
        id: 1,
        title: "Empty Recipe No Source",
      };

      render(
        <RecipeCard recipe={emptyRecipeWithoutSource} onClick={mockOnClick} />
      );

      expect(
        screen.queryByRole("link", { name: "open_recipe_source_link" })
      ).not.toBeInTheDocument();
    });
  });

  describe("Image Display Toggle", () => {
    const recipeWithImage = {
      id: 1,
      title: "Recipe with Image",
      images: [
        {
          id: "img1",
          url: "test-image.jpg",
          is_main: true,
        },
      ],
    };

    const recipeWithoutImage = {
      id: 2,
      title: "Recipe without Image",
    };

    it("shows image when showImages is true and recipe has image", () => {
      render(
        <RecipeCard
          recipe={recipeWithImage}
          showImages={true}
          onClick={mockOnClick}
        />
      );

      const image = screen.getByRole("img", { name: "Recipe with Image" });
      expect(image).toBeInTheDocument();
      expect(image).toHaveClass("recipe-image");
    });

    it("hides image when showImages is false even if recipe has image", () => {
      render(
        <RecipeCard
          recipe={recipeWithImage}
          showImages={false}
          onClick={mockOnClick}
        />
      );

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("does not show image when recipe has no images regardless of showImages", () => {
      render(
        <RecipeCard
          recipe={recipeWithoutImage}
          showImages={true}
          onClick={mockOnClick}
        />
      );

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("defaults showImages to true when prop not provided", () => {
      render(<RecipeCard recipe={recipeWithImage} onClick={mockOnClick} />);

      expect(
        screen.getByRole("img", { name: "Recipe with Image" })
      ).toBeInTheDocument();
    });
  });
});
