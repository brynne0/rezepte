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

  describe("Source Link Functionality", () => {
    const mockWindowOpen = vi.fn();
    
    beforeEach(() => {
      // Mock window.open
      vi.stubGlobal('window', {
        ...window,
        open: mockWindowOpen
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
        source: "http://example.com"
      };

      render(<RecipeCard recipe={recipeWithHttpLink} onClick={mockOnClick} />);

      expect(screen.getByRole("link", { name: "open_recipe_source_link" })).toBeInTheDocument();
    });

    it("shows link icon when recipe has https source", () => {
      const recipeWithHttpsLink = {
        id: 1,
        title: "Test Recipe", 
        source: "https://example.com"
      };

      render(<RecipeCard recipe={recipeWithHttpsLink} onClick={mockOnClick} />);
      
      expect(screen.getByRole("link", { name: "open_recipe_source_link" })).toBeInTheDocument();
    });

    it("shows link icon when recipe has www source", () => {
      const recipeWithWwwLink = {
        id: 1,
        title: "Test Recipe",
        source: "www.example.com"
      };

      render(<RecipeCard recipe={recipeWithWwwLink} onClick={mockOnClick} />);
      
      expect(screen.getByRole("link", { name: "open_recipe_source_link" })).toBeInTheDocument();
    });

    it("does not show link icon when recipe has text source", () => {
      const recipeWithTextSource = {
        id: 1,
        title: "Test Recipe",
        source: "My grandmother's recipe"
      };

      render(<RecipeCard recipe={recipeWithTextSource} onClick={mockOnClick} />);
      
      expect(screen.queryByRole("link", { name: "open_recipe_source_link" })).not.toBeInTheDocument();
    });

    it("does not show link icon when recipe has no source", () => {
      const recipeWithoutSource = {
        id: 1,
        title: "Test Recipe"
      };

      render(<RecipeCard recipe={recipeWithoutSource} onClick={mockOnClick} />);
      
      expect(screen.queryByRole("link", { name: "open_recipe_source_link" })).not.toBeInTheDocument();
    });

    it("external link has correct href attribute", () => {
      const recipeWithLink = {
        id: 1,
        title: "Test Recipe",
        source: "https://example.com"
      };

      render(<RecipeCard recipe={recipeWithLink} onClick={mockOnClick} />);
      
      const linkElement = screen.getByRole("link", { name: "open_recipe_source_link" });
      expect(linkElement).toHaveAttribute("href", "https://example.com");
      expect(linkElement).toHaveAttribute("target", "_blank");
      expect(linkElement).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("prevents card click when link icon is clicked", () => {
      const recipeWithLink = {
        id: 1,
        title: "Test Recipe",
        source: "https://example.com"
      };

      render(<RecipeCard recipe={recipeWithLink} onClick={mockOnClick} />);
      
      const linkIcon = screen.getByRole("link", { name: "open_recipe_source_link" });
      fireEvent.click(linkIcon);

      // Card onClick should not be called
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it("still calls card onClick when clicking elsewhere on card", () => {
      const recipeWithLink = {
        id: 1,
        title: "Test Recipe",
        source: "https://example.com"
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
});
