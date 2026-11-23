import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRecipe } from "../../hooks/data/useRecipe";
import { useOnlineStatus } from "../../hooks/ui/useOnlineStatus";
import { useTranslation } from "react-i18next";
import EditRecipePage from "./EditRecipe";

let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: vi.fn(() => ({ id: "123" })),
  useSearchParams: vi.fn(() => [mockSearchParams, mockSetSearchParams]),
}));

vi.mock("../../hooks/ui/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn(() => true),
}));

const mockChangeLanguage = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn(() => ({
    t: (key) => key,
    i18n: {
      language: "en",
      changeLanguage: mockChangeLanguage,
    },
  })),
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
  default: vi.fn(
    ({
      title,
      categories,
      isEditingTranslation,
      isEditingOriginal,
      onSwitchEditVersion,
    }) => (
      <div
        data-testid="recipe-form-mock"
        data-categories={categories ? JSON.stringify(categories) : undefined}
        data-is-editing-translation={isEditingTranslation}
        data-is-editing-original={isEditingOriginal}
      >
        {title}
        <button onClick={() => onSwitchEditVersion("original")}>
          switch-to-original
        </button>
        <button onClick={() => onSwitchEditVersion("translation")}>
          switch-to-translation
        </button>
        {isEditingTranslation && (
          <div data-testid="translation-editing-indicator">
            Translation editing mode
          </div>
        )}
      </div>
    )
  ),
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

  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

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

  it("renders a not-found message when recipe is null", () => {
    vi.mocked(useRecipe).mockReturnValueOnce({ recipe: null, loading: false });

    render(<EditRecipePage categories={mockCategories} />);

    const notFoundMessage = screen.getByText("recipe_not_found");
    expect(notFoundMessage).toBeInTheDocument();
  });

  it("renders an offline-aware message when recipe is null while offline", () => {
    vi.mocked(useOnlineStatus).mockReturnValueOnce(false);
    vi.mocked(useRecipe).mockReturnValueOnce({ recipe: null, loading: false });

    render(<EditRecipePage categories={mockCategories} />);

    expect(screen.getByText("recipe_unavailable_offline")).toBeInTheDocument();
    expect(screen.queryByText("recipe_not_found")).not.toBeInTheDocument();
  });

  describe("Editing the original", () => {
    const germanRecipe = {
      recipe: { id: "123", title: "Testrezept", original_language: "de" },
      loading: false,
    };

    beforeEach(() => {
      vi.mocked(useTranslation).mockReturnValue({
        t: (key) => key,
        i18n: { language: "en", changeLanguage: mockChangeLanguage },
      });
    });

    it("loads the untranslated recipe and edits it in full with ?original=1", () => {
      mockSearchParams = new URLSearchParams("original=1");
      vi.mocked(useRecipe).mockReturnValue(germanRecipe);

      render(<EditRecipePage categories={mockCategories} />);

      expect(useRecipe).toHaveBeenCalledWith("123", { original: true });
      const recipeForm = screen.getByTestId("recipe-form-mock");
      expect(recipeForm).toHaveAttribute(
        "data-is-editing-translation",
        "false"
      );
      expect(recipeForm).toHaveAttribute("data-is-editing-original", "true");
    });

    it("edits the translation by default for a recipe in another language", () => {
      vi.mocked(useRecipe).mockReturnValue(germanRecipe);

      render(<EditRecipePage categories={mockCategories} />);

      expect(useRecipe).toHaveBeenCalledWith("123", { original: false });
      const recipeForm = screen.getByTestId("recipe-form-mock");
      expect(recipeForm).toHaveAttribute("data-is-editing-translation", "true");
      expect(recipeForm).toHaveAttribute("data-is-editing-original", "false");
    });

    it("switches version via the URL so the right recipe loads", () => {
      vi.mocked(useRecipe).mockReturnValue(germanRecipe);
      render(<EditRecipePage categories={mockCategories} />);

      fireEvent.click(screen.getByText("switch-to-original"));
      expect(mockSetSearchParams).toHaveBeenLastCalledWith(
        { original: "1" },
        { replace: true }
      );

      fireEvent.click(screen.getByText("switch-to-translation"));
      expect(mockSetSearchParams).toHaveBeenLastCalledWith(
        {},
        { replace: true }
      );
    });

    it("shows loading instead of the old version while switching", () => {
      vi.mocked(useRecipe).mockReturnValue({
        ...germanRecipe,
        switching: true,
      });

      render(<EditRecipePage categories={mockCategories} />);

      expect(screen.getByTestId("loading-acorn-mock")).toBeInTheDocument();
      expect(screen.queryByTestId("recipe-form-mock")).not.toBeInTheDocument();
    });

    it("does not flag original editing when the recipe is already in your language", () => {
      mockSearchParams = new URLSearchParams("original=1");
      vi.mocked(useRecipe).mockReturnValue({
        recipe: { id: "123", title: "Test Recipe", original_language: "en" },
        loading: false,
      });

      render(<EditRecipePage categories={mockCategories} />);

      const recipeForm = screen.getByTestId("recipe-form-mock");
      expect(recipeForm).toHaveAttribute("data-is-editing-original", "false");
    });
  });

  describe("Translation Editing", () => {
    it("shows translation editing mode when current language differs from original", () => {
      // Clear and setup mocks
      vi.clearAllMocks();

      // Mock current language as German
      vi.mocked(useTranslation).mockReturnValue({
        t: (key) => key,
        i18n: {
          language: "de", // Current language is German
          changeLanguage: mockChangeLanguage,
        },
      });

      vi.mocked(useRecipe).mockReturnValue({
        recipe: {
          id: "123",
          title: "Test Recipe",
          original_language: "en", // Original language is English
        },
        loading: false,
      });

      render(<EditRecipePage categories={mockCategories} />);

      // Should pass isEditingTranslation=true to RecipeForm
      const recipeForm = screen.getByTestId("recipe-form-mock");
      expect(recipeForm).toHaveAttribute("data-is-editing-translation", "true");

      // Should show translation editing indicator
      expect(
        screen.getByTestId("translation-editing-indicator")
      ).toBeInTheDocument();
    });

    it("does not show translation editing mode when languages match", () => {
      // Clear and setup mocks
      vi.clearAllMocks();

      // Mock current language as English
      vi.mocked(useTranslation).mockReturnValue({
        t: (key) => key,
        i18n: {
          language: "en", // Current language is English
          changeLanguage: mockChangeLanguage,
        },
      });

      vi.mocked(useRecipe).mockReturnValue({
        recipe: {
          id: "123",
          title: "Test Recipe",
          original_language: "en", // Original language is also English
        },
        loading: false,
      });

      render(<EditRecipePage categories={mockCategories} />);

      // Should pass isEditingTranslation=false to RecipeForm
      const recipeForm = screen.getByTestId("recipe-form-mock");
      expect(recipeForm).toHaveAttribute(
        "data-is-editing-translation",
        "false"
      );

      // Should not show translation editing indicator
      expect(
        screen.queryByTestId("translation-editing-indicator")
      ).not.toBeInTheDocument();
    });
  });
});
