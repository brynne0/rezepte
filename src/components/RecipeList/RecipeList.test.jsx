import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import RecipeList from "./RecipeList";
import { useOnlineStatus } from "../../hooks/ui/useOnlineStatus";

// Mock dependencies
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../RecipeCard/RecipeCard", () => ({
  default: ({ recipe, onClick }) => (
    <div
      data-testid={`recipe-card-${recipe.id}`}
      onClick={() => onClick(recipe)}
    >
      {recipe.title}
    </div>
  ),
}));

vi.mock("./RecipeList.css", () => ({}));

vi.mock("../../hooks/ui/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn(),
}));

const mockNavigate = vi.fn();

describe("RecipeList", () => {
  const mockRecipes = [
    {
      id: 1,
      title: "Chocolate Cookies",
      category: "desserts",
      slug: "chocolate-cookies",
    },
    {
      id: 2,
      title: "Lasagne",
      category: "dinner",
      slug: "lasagne",
    },
    {
      id: 3,
      title: "Beetroot Salad",
      category: "salads",
      slug: "beetroot-salad",
    },
  ];

  beforeEach(() => {
    mockNavigate.mockClear();
    // Default to online unless specifically testing offline
    useOnlineStatus.mockReturnValue(true);
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      selectedCategory: "all",
      recipes: mockRecipes,
      searchTerm: "",
    };

    return render(
      <MemoryRouter>
        <RecipeList {...defaultProps} {...props} />
      </MemoryRouter>
    );
  };

  it('renders all recipes when category is "all"', () => {
    renderComponent({ selectedCategory: "all" });

    expect(screen.getByTestId("recipe-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("recipe-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("recipe-card-3")).toBeInTheDocument();
  });

  it("filters recipes by category", () => {
    renderComponent({ selectedCategory: "desserts" });

    expect(screen.getByTestId("recipe-card-1")).toBeInTheDocument();
    expect(screen.queryByTestId("recipe-card-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("recipe-card-3")).not.toBeInTheDocument();
  });

  it("filters recipes by search term", () => {
    renderComponent({ searchTerm: "chocolate" });

    expect(screen.getByTestId("recipe-card-1")).toBeInTheDocument();
    expect(screen.queryByTestId("recipe-card-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("recipe-card-3")).not.toBeInTheDocument();
  });

  it("prioritizes search over category filtering", () => {
    renderComponent({
      selectedCategory: "salads",
      searchTerm: "chocolate",
    });

    expect(screen.getByTestId("recipe-card-1")).toBeInTheDocument();
    expect(screen.queryByTestId("recipe-card-3")).not.toBeInTheDocument();
  });

  it("shows no results message when search finds nothing", () => {
    renderComponent({ searchTerm: "pizza" });

    expect(screen.getByText("no_recipes_found")).toBeInTheDocument();
  });

  it("navigates to correct recipe URL when clicked", () => {
    renderComponent();

    const recipeCard = screen.getByTestId("recipe-card-1");
    fireEvent.click(recipeCard);

    expect(mockNavigate).toHaveBeenCalledWith("/1/chocolate-cookies");
  });

  describe("Offline functionality", () => {
    it("shows welcome message when online and no recipes", () => {
      useOnlineStatus.mockReturnValue(true);

      renderComponent({
        recipes: [],
        totalRecipeCount: 0,
        searchTerm: "",
      });

      expect(screen.getByText("welcome_add_recipe")).toBeInTheDocument();
      expect(screen.getByText("logged_in_note")).toBeInTheDocument();
      expect(
        screen.queryByText("no_internet_connection")
      ).not.toBeInTheDocument();
    });

    it("shows no internet connection message when offline and no recipes", () => {
      useOnlineStatus.mockReturnValue(false);

      renderComponent({
        recipes: [],
        totalRecipeCount: 0,
        searchTerm: "",
      });

      expect(screen.getByText("no_internet_connection")).toBeInTheDocument();
      expect(screen.queryByText("welcome_add_recipe")).not.toBeInTheDocument();
      expect(screen.queryByText("logged_in_note")).not.toBeInTheDocument();
    });

    it("does not show offline message when there are recipes", () => {
      useOnlineStatus.mockReturnValue(false);

      renderComponent({
        recipes: mockRecipes,
        totalRecipeCount: 3,
        searchTerm: "",
      });

      expect(
        screen.queryByText("no_internet_connection")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("welcome_add_recipe")).not.toBeInTheDocument();
      // Should still show recipes
      expect(screen.getByTestId("recipe-card-1")).toBeInTheDocument();
    });

    it("does not show offline message when searching", () => {
      useOnlineStatus.mockReturnValue(false);

      renderComponent({
        recipes: [],
        totalRecipeCount: 0,
        searchTerm: "test",
      });

      expect(
        screen.queryByText("no_internet_connection")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("welcome_add_recipe")).not.toBeInTheDocument();
      // Should show search no results message instead
      expect(screen.getByText("no_recipes_found")).toBeInTheDocument();
    });

    it("shows appropriate message when going from online to offline", () => {
      useOnlineStatus.mockReturnValue(true);

      const { rerender } = renderComponent({
        recipes: [],
        totalRecipeCount: 0,
        searchTerm: "",
      });

      expect(screen.getByText("welcome_add_recipe")).toBeInTheDocument();

      // Switch to offline
      useOnlineStatus.mockReturnValue(false);

      rerender(
        <MemoryRouter>
          <RecipeList
            selectedCategory="all"
            recipes={[]}
            searchTerm=""
            totalRecipeCount={0}
          />
        </MemoryRouter>
      );

      expect(screen.getByText("no_internet_connection")).toBeInTheDocument();
      expect(screen.queryByText("welcome_add_recipe")).not.toBeInTheDocument();
    });
  });
});
