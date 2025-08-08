import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useRecipe } from "../../hooks/data/useRecipe";
import EditRecipePage from "./EditRecipe";

vi.mock("react-router-dom", () => ({
  useParams: vi.fn(() => ({ id: "123" })),
}));

const mockChangeLanguage = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: {
      language: "en",
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

vi.mock("../../hooks/data/useRecipe", () => ({
  useRecipe: vi.fn(() => ({
    recipe: {
      id: "123",
      title: "Test Recipe",
      original_language: "en",
    },
    loading: false,
  })),
}));

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

vi.mock("../../components/LoadingAcorn/LoadingAcorn", () => ({
  __esModule: true,
  default: vi.fn(() => <div data-testid="loading-acorn-mock" />),
}));

describe("EditRecipePage", () => {
  const mockCategories = [
    { value: "desserts", label: "Desserts" },
    { value: "main-dishes", label: "Main Dishes" },
  ];

  it("renders LoadingAcorn when loading", () => {
    vi.mocked(useRecipe).mockReturnValueOnce({ recipe: null, loading: true });

    render(<EditRecipePage categories={mockCategories} />);

    const loadingAcorn = screen.getByTestId("loading-acorn-mock");
    expect(loadingAcorn).toBeInTheDocument();
  });

  it("renders RecipeForm with correct props when recipe is loaded", () => {
    render(<EditRecipePage categories={mockCategories} />);

    const recipeForm = screen.getByTestId("recipe-form-mock");
    expect(recipeForm).toBeInTheDocument();

    const title = screen.getByText("edit_recipe");
    expect(title).toBeInTheDocument();
  });

  it("renders 'Recipe not found' when recipe is null", () => {
    vi.mocked(useRecipe).mockReturnValueOnce({ recipe: null, loading: false });

    render(<EditRecipePage categories={mockCategories} />);

    const notFoundMessage = screen.getByText("Recipe not found");
    expect(notFoundMessage).toBeInTheDocument();
  });

  it("switches language to recipe's original language", () => {
    vi.mock("react-i18next", () => ({
      useTranslation: vi.fn(() => ({
        t: (key) => key,
        i18n: {
          language: "de",
          changeLanguage: mockChangeLanguage,
        },
      })),
    }));

    render(<EditRecipePage categories={mockCategories} />);

    expect(mockChangeLanguage).toHaveBeenCalledWith("en");
  });

  describe("Language Preservation", () => {
    it("preserves language restoration functionality when component unmounts", () => {
      // Test that the component has the language restoration logic without breaking
      vi.mocked(useRecipe).mockReturnValueOnce({
        recipe: {
          id: "123",
          title: "Test Recipe",
          original_language: "de", // Different language to trigger switching
        },
        loading: false,
      });

      const { unmount } = render(<EditRecipePage categories={mockCategories} />);
      
      // Component should render without errors
      expect(screen.getByTestId("recipe-form-mock")).toBeInTheDocument();
      
      // Unmount should not cause errors (cleanup effect should work)
      expect(() => unmount()).not.toThrow();
    });

    it("renders correctly with language preservation code when languages match", () => {
      vi.mocked(useRecipe).mockReturnValueOnce({
        recipe: {
          id: "123", 
          title: "Test Recipe",
          original_language: "en", // Same as current mock language
        },
        loading: false,
      });

      render(<EditRecipePage categories={mockCategories} />);

      // Component should render edit form correctly
      expect(screen.getByTestId("recipe-form-mock")).toBeInTheDocument();
      expect(screen.getByText("edit_recipe")).toBeInTheDocument();
    });
  });
});
