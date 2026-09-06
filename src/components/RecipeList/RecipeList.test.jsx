import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import RecipeList from "./RecipeList";
import { useAuth } from "../../hooks/data/useAuth";

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

vi.mock("../../hooks/data/useAuth", () => ({
  useAuth: vi.fn(),
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
    // Default to logged in unless specifically testing logged out
    useAuth.mockReturnValue({ isLoggedIn: true });
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      selectedCategory: "all_recipes",
      recipes: mockRecipes,
      searchTerm: "",
    };

    return render(
      <MemoryRouter>
        <RecipeList {...defaultProps} {...props} />
      </MemoryRouter>
    );
  };

  it('renders all recipes when category is "all_recipes"', () => {
    renderComponent({ selectedCategory: "all_recipes" });

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

  describe("Empty states", () => {
    it("shows welcome message and add-recipe button when logged in with no recipes", () => {
      useAuth.mockReturnValue({ isLoggedIn: true });

      renderComponent({
        recipes: [],
        totalRecipeCount: 0,
        searchTerm: "",
      });

      expect(screen.getByText("welcome_add_recipe")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "add_new_recipe" })
      ).toBeInTheDocument();
    });

    it("shows login prompt and login button when logged out with no recipes", () => {
      useAuth.mockReturnValue({ isLoggedIn: false });

      renderComponent({
        recipes: [],
        totalRecipeCount: 0,
        searchTerm: "",
      });

      expect(screen.queryByText("welcome_add_recipe")).not.toBeInTheDocument();
      expect(
        screen.getByText("logged_in_note_linklogged_in_note_suffix")
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "login" })).toBeInTheDocument();
    });

    it("navigates to add-recipe when the welcome button is clicked", () => {
      useAuth.mockReturnValue({ isLoggedIn: true });

      renderComponent({
        recipes: [],
        totalRecipeCount: 0,
        searchTerm: "",
      });

      fireEvent.click(screen.getByRole("button", { name: "add_new_recipe" }));

      expect(mockNavigate).toHaveBeenCalledWith("/add-recipe");
    });

    it("navigates to the auth page when the login button is clicked", () => {
      useAuth.mockReturnValue({ isLoggedIn: false });

      renderComponent({
        recipes: [],
        totalRecipeCount: 0,
        searchTerm: "",
      });

      fireEvent.click(screen.getByRole("button", { name: "login" }));

      expect(mockNavigate).toHaveBeenCalledWith("/auth-page");
    });

    it("does not show the empty state when there are recipes", () => {
      renderComponent({
        recipes: mockRecipes,
        totalRecipeCount: 3,
        searchTerm: "",
      });

      expect(screen.queryByText("welcome_add_recipe")).not.toBeInTheDocument();
      // Should still show recipes
      expect(screen.getByTestId("recipe-card-1")).toBeInTheDocument();
    });

    it("does not show the welcome empty state when searching", () => {
      renderComponent({
        recipes: [],
        totalRecipeCount: 0,
        searchTerm: "test",
      });

      expect(screen.queryByText("welcome_add_recipe")).not.toBeInTheDocument();
      // Should show search no results message instead
      expect(screen.getByText("no_recipes_found")).toBeInTheDocument();
    });

    it("shows an offline message instead of the welcome state while offline", () => {
      renderComponent({
        recipes: [],
        totalRecipeCount: 0,
        searchTerm: "",
        isOnline: false,
      });

      expect(screen.queryByText("welcome_add_recipe")).not.toBeInTheDocument();
      expect(screen.getByText("no_internet_connection")).toBeInTheDocument();
    });
  });
});
