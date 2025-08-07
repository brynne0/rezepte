import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import Recipe from "./Recipe";

// Mock dependencies
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "test-recipe-id" }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock("../../hooks/data/useRecipe", () => ({
  useRecipe: () => mockRecipeHook,
}));

vi.mock("../../hooks/data/useAuth", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("../../hooks/data/useGroceryList", () => ({
  useGroceryList: () => mockGroceryListHook,
}));

vi.mock("../LoadingAcorn/LoadingAcorn", () => ({
  default: () => <div data-testid="loading-acorn">Loading...</div>,
}));

vi.mock("./Recipe.css", () => ({}));

// Mock variables
let mockNavigate;
let mockRecipeHook;
let mockAuth;
let mockGroceryListHook;

describe("Recipe Component", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default mock values
    mockNavigate = vi.fn();
    mockAuth = {
      isLoggedIn: false,
      isGuest: false,
    };
    mockGroceryListHook = {
      checkedIngredients: {},
      addingToGroceryList: false,
      showSuccess: false,
      handleCheckboxChange: vi.fn(),
      addToGroceryList: vi.fn(),
    };
    mockRecipeHook = {
      recipe: null,
      loading: false,
      error: null,
    };
  });

  const renderRecipe = () => {
    return render(
      <BrowserRouter>
        <Recipe />
      </BrowserRouter>
    );
  };

  const mockRecipeData = {
    id: "recipe-1",
    slug: "test-recipe",
    title: "Test Recipe",
    servings: 4,
    instructions: ["Step 1", "Step 2", "Step 3"],
    source: "https://example.com/recipe",
    notes: "Some extra notes",
    ungroupedIngredients: [
      {
        id: "ing-1",
        recipe_ingredient_id: "ri-1",
        quantity: "2",
        unit: "cups",
        singular_name: "flour",
        plural_name: "flours",
        notes: "sifted",
      },
      {
        id: "ing-2",
        recipe_ingredient_id: "ri-2",
        quantity: "1",
        unit: "tsp",
        singular_name: "salt",
        plural_name: "salts",
      },
    ],
  };

  describe("Loading States", () => {
    test("shows loading component when loading", () => {
      mockRecipeHook.loading = true;
      renderRecipe();

      expect(screen.getByTestId("loading-acorn")).toBeInTheDocument();
    });

    test("shows error message when error occurs", () => {
      mockRecipeHook.error = "Failed to load recipe";
      renderRecipe();

      expect(screen.getByText("Failed to load recipe")).toBeInTheDocument();
    });

    test("shows not found message when recipe is null", () => {
      mockRecipeHook.recipe = null;
      renderRecipe();

      expect(screen.getByText("recipe_not_found")).toBeInTheDocument();
    });
  });

  describe("Basic Recipe Rendering", () => {
    beforeEach(() => {
      mockRecipeHook.recipe = mockRecipeData;
    });

    test("renders recipe title", () => {
      renderRecipe();
      expect(screen.getByText("Test Recipe")).toBeInTheDocument();
    });

    test("renders servings information", () => {
      renderRecipe();
      expect(screen.getByText("servings:")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    test("renders instructions", () => {
      renderRecipe();
      expect(screen.getByText("instructions:")).toBeInTheDocument();
      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 2")).toBeInTheDocument();
      expect(screen.getByText("Step 3")).toBeInTheDocument();
    });

    test("renders source as link when it's a URL", () => {
      renderRecipe();
      expect(screen.getByText("source:")).toBeInTheDocument();

      const sourceLink = screen.getByRole("link");
      expect(sourceLink).toHaveAttribute("href", "https://example.com/recipe");
      expect(sourceLink).toHaveAttribute("target", "_blank");
      expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    test("renders source as text when it's not a URL", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        source: "My sister's recipe",
      };
      renderRecipe();

      expect(screen.getByText("source:")).toBeInTheDocument();
      expect(screen.getByText("My sister's recipe")).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    test("renders notes", () => {
      renderRecipe();
      expect(screen.getByText("notes:")).toBeInTheDocument();
      expect(screen.getByText("Some extra notes")).toBeInTheDocument();
    });

    test("doesn't render optional sections when they're missing", () => {
      mockRecipeHook.recipe = {
        id: "recipe-1",
        title: "Minimal Recipe",
      };
      renderRecipe();

      expect(screen.getByText("Minimal Recipe")).toBeInTheDocument();
      expect(screen.queryByText("servings:")).not.toBeInTheDocument();
      expect(screen.queryByText("instructions:")).not.toBeInTheDocument();
      expect(screen.queryByText("source:")).not.toBeInTheDocument();
      expect(screen.queryByText("notes:")).not.toBeInTheDocument();
    });
  });

  describe("Authentication and Edit Button", () => {
    beforeEach(() => {
      mockRecipeHook.recipe = mockRecipeData;
    });

    test("shows edit button for logged in non-guest users", () => {
      mockAuth.isLoggedIn = true;
      mockAuth.isGuest = false;
      renderRecipe();

      expect(screen.getByTestId("lucide-pencil")).toBeInTheDocument();
    });

    test("doesn't show edit button for guests", () => {
      mockAuth.isLoggedIn = true;
      mockAuth.isGuest = true;
      renderRecipe();

      expect(screen.queryByTestId("lucide-pencil")).not.toBeInTheDocument();
    });

    test("doesn't show edit button for non-logged in users", () => {
      mockAuth.isLoggedIn = false;
      renderRecipe();

      expect(screen.queryByTestId("lucide-pencil")).not.toBeInTheDocument();
    });

    test("navigates to edit page when edit button clicked", () => {
      mockAuth.isLoggedIn = true;
      mockAuth.isGuest = false;
      renderRecipe();

      fireEvent.click(screen.getByTestId("lucide-pencil"));
      expect(mockNavigate).toHaveBeenCalledWith(
        "/edit-recipe/recipe-1/test-recipe"
      );
    });
  });

  describe("Ungrouped Ingredients", () => {
    beforeEach(() => {
      mockRecipeHook.recipe = mockRecipeData;
    });

    test("renders ungrouped ingredients", () => {
      renderRecipe();

      expect(screen.getByText("ingredients:")).toBeInTheDocument();
      expect(screen.getByText(/2 cups flours sifted/)).toBeInTheDocument();
      expect(screen.getByText(/1 tsp salt/)).toBeInTheDocument();
    });

    test("uses singular name for quantity of 1", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            unit: "cup",
            singular_name: "flour",
            plural_name: "flours",
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/1 cup flour/)).toBeInTheDocument();
    });

    test("uses plural name for quantity > 1", () => {
      renderRecipe();
      expect(screen.getByText(/2 cups flours/)).toBeInTheDocument();
    });

    test("handles ingredients without quantity", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            singular_name: "salt",
            notes: "to taste",
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/salt to taste/)).toBeInTheDocument();
    });

    test("renders ingredient checkboxes", () => {
      renderRecipe();

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(2);
    });

    test("handles checkbox changes", () => {
      renderRecipe();

      const firstCheckbox = screen.getAllByRole("checkbox")[0];
      fireEvent.click(firstCheckbox);

      expect(mockGroceryListHook.handleCheckboxChange).toHaveBeenCalledWith(
        "ri-1"
      );
    });

    test("shows checked state from grocery list hook", () => {
      mockGroceryListHook.checkedIngredients = { "ri-1": true };
      renderRecipe();

      const firstCheckbox = screen.getAllByRole("checkbox")[0];
      expect(firstCheckbox).toBeChecked();
    });
  });

  describe("Ingredient Sections", () => {
    beforeEach(() => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [],
        ingredientSections: [
          {
            subheading: "For the base",
            ingredients: [
              {
                id: "ing-3",
                recipe_ingredient_id: "ri-3",
                quantity: "1.5",
                unit: "cup",
                singular_name: "almond",
                plural_name: "almonds",
              },
            ],
          },
          {
            subheading: "For the filling",
            ingredients: [
              {
                id: "ing-4",
                recipe_ingredient_id: "ri-4",
                quantity: "1",
                unit: "",
                singular_name: "lime",
                plural_name: "limes",
              },
            ],
          },
        ],
      };
    });

    test("renders ingredient sections with subheadings", () => {
      renderRecipe();

      expect(screen.getByText("For the base")).toBeInTheDocument();
      expect(screen.getByText("For the filling")).toBeInTheDocument();
      expect(screen.getByText(/1.5 cup almonds/)).toBeInTheDocument();
      expect(screen.getByText(/1 lime/)).toBeInTheDocument();
    });

    test("renders checkboxes for sectioned ingredients", () => {
      renderRecipe();

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(2);
    });
  });

  describe("Fallback Ingredient Structure", () => {
    beforeEach(() => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: undefined,
        ingredientSections: undefined,
        ingredients: [
          {
            id: "ing-5",
            recipe_ingredient_id: "ri-5",
            quantity: "1",
            unit: "cup",
            singular_name: "sugar",
            plural_name: "sugars",
          },
        ],
      };
    });

    test("renders flat ingredient structure as fallback", () => {
      renderRecipe();

      expect(screen.getByText(/1 cup sugar/)).toBeInTheDocument();
    });
  });

  describe("Grocery List Integration", () => {
    beforeEach(() => {
      mockRecipeHook.recipe = mockRecipeData;
      mockAuth.isLoggedIn = true;
    });

    test("shows grocery cart button for logged in users", () => {
      renderRecipe();
      expect(screen.getByTestId("lucide-shopping-basket")).toBeInTheDocument();
    });

    test("doesn't show grocery cart button for non-logged in users", () => {
      mockAuth.isLoggedIn = false;
      renderRecipe();

      expect(
        screen.queryByTestId("lucide-shopping-basket")
      ).not.toBeInTheDocument();
    });

    test("shows loading spinner when adding to grocery list", () => {
      mockGroceryListHook.addingToGroceryList = true;
      renderRecipe();

      expect(screen.getByTestId("cart-loader")).toBeInTheDocument();
    });

    test("shows counter when ingredients are selected", () => {
      mockGroceryListHook.checkedIngredients = { "ri-1": true, "ri-2": true };
      renderRecipe();

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    test("shows success message after adding to grocery list", () => {
      mockGroceryListHook.showSuccess = true;
      renderRecipe();

      expect(screen.getByText("added_to_groceries")).toBeInTheDocument();
    });

    test("calls addToGroceryList when cart button clicked", () => {
      renderRecipe();

      fireEvent.click(screen.getByTestId("lucide-shopping-basket"));

      expect(mockGroceryListHook.addToGroceryList).toHaveBeenCalledWith(
        mockRecipeData.ungroupedIngredients,
        "Test Recipe",
        "recipe-1"
      );
    });

    test("disables cart button when adding to grocery list", () => {
      mockGroceryListHook.addingToGroceryList = true;
      renderRecipe();

      const cartButton = screen
        .getByTestId("lucide-shopping-basket")
        .closest("button");
      expect(cartButton).toBeDisabled();
    });
  });

  describe("Ingredient Display Name Logic", () => {
    test("uses singular name for quantity 1", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            singular_name: "apple",
            plural_name: "apples",
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/1 apple/)).toBeInTheDocument();
    });

    test("uses plural name for quantity > 1", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "3",
            singular_name: "apple",
            plural_name: "apples",
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/3 apples/)).toBeInTheDocument();
    });

    test("falls back to singular_name when plural_name is missing", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "3",
            singular_name: "rice",
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/3 rice/)).toBeInTheDocument();
    });

    test("prioritises translated name over database fields", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "2",
            singular_name: "flour",
            plural_name: "flours",
            name: "Mehl", // Translated name should be used
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/2 Mehl/)).toBeInTheDocument();
      expect(screen.queryByText(/flours/)).not.toBeInTheDocument();
    });

    test("uses translated name for sectioned ingredients", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [],
        ingredientSections: [
          {
            subheading: "For the sauce",
            ingredients: [
              {
                id: "ing-3",
                recipe_ingredient_id: "ri-3",
                quantity: "2",
                unit: "tbsp",
                singular_name: "banana",
                plural_name: "bananas",
                name: "banana", // Translated name
              },
            ],
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/2 tbsp banana/)).toBeInTheDocument();
      expect(screen.queryByText(/bananas/)).not.toBeInTheDocument();
    });

    test("shows fallback message for missing ingredient names", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            // Missing all name fields
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/1 \?/)).toBeInTheDocument();
    });

    test("handles countable units with singular/plural logic", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            unit: "piece/s",
            singular_name: "bread",
            plural_name: "breads",
          },
          {
            id: "ing-2",
            recipe_ingredient_id: "ri-2",
            quantity: "3",
            unit: "piece/s",
            singular_name: "bread",
            plural_name: "breads",
          },
        ],
      };
      renderRecipe();

      // Countable units should follow quantity logic
      expect(screen.getByText(/1 piece bread/)).toBeInTheDocument();
      expect(screen.getByText(/3 pieces breads/)).toBeInTheDocument();
    });

    test("measurement units always use plural ingredients", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            unit: "cup",
            singular_name: "almond",
            plural_name: "almonds",
          },
          {
            id: "ing-2",
            recipe_ingredient_id: "ri-2",
            quantity: "1",
            unit: "can/s",
            singular_name: "tomato",
            plural_name: "tomatoes",
          },
        ],
      };
      renderRecipe();

      // Measurement/container units should always use plural ingredients
      expect(screen.getByText(/1 cup almonds/)).toBeInTheDocument();
      expect(screen.getByText(/1 can tomatoes/)).toBeInTheDocument();
    });
  });

  describe("Translation Scenarios", () => {
    test("displays German ingredient names when recipe is translated", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        isTranslated: true,
        translatedFrom: "en",
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "2",
            unit: "cups",
            singular_name: "flour", // Original English
            plural_name: "flours",
            name: "Mehl", // German translation
          },
          {
            id: "ing-2",
            recipe_ingredient_id: "ri-2",
            quantity: "1",
            unit: "tsp",
            singular_name: "salt",
            plural_name: "salts",
            name: "Salz", // German translation
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/2 cups Mehl/)).toBeInTheDocument();
      expect(screen.getByText(/1 tsp Salz/)).toBeInTheDocument();
      expect(screen.queryByText(/flour/)).not.toBeInTheDocument();
      expect(screen.queryByText(/salt/)).not.toBeInTheDocument();
    });

    test("displays mixed translated and untranslated ingredients", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            singular_name: "banana",
            plural_name: "bananas",
            name: "Banane", // Translated
          },
          {
            id: "ing-2",
            recipe_ingredient_id: "ri-2",
            quantity: "2",
            singular_name: "apple",
            plural_name: "apples",
            // No translated name - should fall back
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/1 Banane/)).toBeInTheDocument();
      expect(screen.getByText(/2 apples/)).toBeInTheDocument();
    });

    test("handles translated ingredient sections correctly", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [],
        ingredientSections: [
          {
            subheading: "Für den Teig", // German section heading
            ingredients: [
              {
                id: "ing-3",
                recipe_ingredient_id: "ri-3",
                quantity: "400",
                unit: "ml",
                singular_name: "water",
                name: "Wasser",
              },
              {
                id: "ing-4",
                recipe_ingredient_id: "ri-4",
                quantity: "500",
                unit: "g",
                singular_name: "flour",
                name: "Mehl",
              },
            ],
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText("Für den Teig")).toBeInTheDocument();
      expect(screen.getByText(/400 ml Wasser/)).toBeInTheDocument();
      expect(screen.getByText(/500 g Mehl/)).toBeInTheDocument();
    });

    test("handles ingredients with translated notes", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "2",
            singular_name: "flour",
            name: "Mehl",
            notes: "gesiebt", // German notes
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText(/2 Mehl gesiebt/)).toBeInTheDocument();
    });
  });

  describe("getAllIngredients Helper Function", () => {
    test("combines ungrouped ingredients and sectioned ingredients for grocery list", () => {
      mockAuth.isLoggedIn = true;

      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ingredientSections: [
          {
            subheading: "Section 1",
            ingredients: [
              {
                id: "ing-3",
                recipe_ingredient_id: "ri-3",
                singular_name: "sectioned ingredient",
              },
            ],
          },
        ],
      };

      renderRecipe();

      // Click add to grocery list
      fireEvent.click(screen.getByTestId("lucide-shopping-basket"));

      // Should be called with combined ingredients
      expect(mockGroceryListHook.addToGroceryList).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: "ing-1" }),
          expect.objectContaining({ id: "ing-2" }),
          expect.objectContaining({ id: "ing-3" }),
        ]),
        "Test Recipe",
        "recipe-1"
      );
    });
  });
});
