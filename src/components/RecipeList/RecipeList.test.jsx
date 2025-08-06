import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import RecipeList from "./RecipeList";

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

    expect(
      screen.getByText('No recipes for "pizza" found')
    ).toBeInTheDocument();
  });

  it("navigates to correct recipe URL when clicked", () => {
    renderComponent();

    const recipeCard = screen.getByTestId("recipe-card-1");
    fireEvent.click(recipeCard);

    expect(mockNavigate).toHaveBeenCalledWith("/1/chocolate-cookies");
  });
});
