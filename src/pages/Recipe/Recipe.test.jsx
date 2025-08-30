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

const mockUnits = [
  { value: "", label: "Unit" },
  { value: "tsp", label: "tsp" },
  { value: "tbsp", label: "tbsp" },
  { value: "cup/s", label: "cup/s" },
  { value: "ml", label: "ml" },
  { value: "g", label: "g" },
  { value: "can/s", label: "can/s" },
  { value: "piece/s", label: "piece/s" },
];

let mockLanguage = "en";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === "units" && options?.returnObjects) {
        return mockUnits;
      }
      return key;
    },
    i18n: {
      language: mockLanguage,
    },
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

vi.mock("../../components/ImageGallery/ImageGallery", () => ({
  default: ({ images, onAllImagesLoaded }) => {
    // Call onAllImagesLoaded to simulate images finishing loading
    if (onAllImagesLoaded) onAllImagesLoaded();
    return <div data-testid="image-gallery">Images: {images.length}</div>;
  },
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
        // quantity > 1 and not plural
        id: "ing-1",
        recipe_ingredient_id: "ri-1",
        quantity: "2",
        unit: "cup/s",
        singular_name: "flour",
        plural_name: "flours",
        notes: "sifted",
        is_plural: false,
      },
      {
        // quantity < 1 and not plural
        id: "ing-2",
        recipe_ingredient_id: "ri-2",
        quantity: "1",
        unit: "tsp",
        singular_name: "salt",
        plural_name: "salts",
        is_plural: false,
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

    test("shows edit button for logged in users only", () => {
      mockAuth.isLoggedIn = true;
      renderRecipe();

      expect(screen.getByTestId("edit-recipe-btn")).toBeInTheDocument();
    });

    test("doesn't show edit button for non-logged in users", () => {
      mockAuth.isLoggedIn = false;
      renderRecipe();

      expect(screen.queryByTestId("edit-recipe-btn")).not.toBeInTheDocument();
    });

    test("navigates to edit page when edit button clicked", () => {
      mockAuth.isLoggedIn = true;
      renderRecipe();

      fireEvent.click(screen.getByTestId("edit-recipe-btn"));
      expect(mockNavigate).toHaveBeenCalledWith(
        "/edit-recipe/recipe-1/test-recipe"
      );
    });
  });

  describe("Recipe Images", () => {
    beforeEach(() => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        images: [
          { id: 1, url: "image1.jpg" },
          { id: 2, url: "image2.jpg" }
        ]
      };
    });

    test("shows images when user is logged in", () => {
      mockAuth.isLoggedIn = true;
      renderRecipe();

      expect(screen.getByTestId("image-gallery")).toBeInTheDocument();
      expect(screen.getByText("Images: 2")).toBeInTheDocument();
    });

    test("hides images when user is not logged in", () => {
      mockAuth.isLoggedIn = false;
      renderRecipe();

      expect(screen.queryByTestId("image-gallery")).not.toBeInTheDocument();
    });

    test("doesn't render image section when no images exist", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        images: []
      };
      mockAuth.isLoggedIn = true;
      renderRecipe();

      expect(screen.queryByTestId("image-gallery")).not.toBeInTheDocument();
    });
  });

  describe("Ungrouped Ingredients", () => {
    beforeEach(() => {
      mockRecipeHook.recipe = mockRecipeData;
    });

    test("renders ungrouped ingredients", () => {
      renderRecipe();

      expect(screen.getByText("ingredients:")).toBeInTheDocument();
      expect(screen.getByText("2 cups")).toBeInTheDocument();
      expect(screen.getByText("flour")).toBeInTheDocument();
      expect(screen.getByText(/sifted/)).toBeInTheDocument();
      expect(screen.getByText("1 tsp")).toBeInTheDocument();
      expect(screen.getByText("salt")).toBeInTheDocument();
    });

    test("handles ingredients without quantity or is_plural", () => {
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

      expect(screen.getByText(/salt/)).toBeInTheDocument();
      expect(screen.getByText(/to taste/)).toBeInTheDocument();
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
                unit: "cup/s",
                singular_name: "almond",
                plural_name: "almonds",
                is_plural: true,
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
                is_plural: false,
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
      expect(screen.getByText("1.5 cups")).toBeInTheDocument();
      expect(screen.getByText("almonds")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("lime")).toBeInTheDocument();
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
            unit: "cup/s",
            singular_name: "sugar",
            plural_name: "sugars",
          },
        ],
      };
    });

    test("renders flat ingredient structure as fallback", () => {
      renderRecipe();

      expect(screen.getByText("1 cup")).toBeInTheDocument();
      expect(screen.getByText("sugar")).toBeInTheDocument();
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
    test("uses singular name for is_plural false", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            singular_name: "apple",
            plural_name: "apples",
            is_plural: false,
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("apple")).toBeInTheDocument();
    });

    test("uses plural name for is_plural true", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "3",
            singular_name: "apple",
            plural_name: "apples",
            is_plural: true,
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("apples")).toBeInTheDocument();
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

      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("rice")).toBeInTheDocument();
    });

    test("uses processed name field first", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "2",
            singular_name: "flour",
            plural_name: "flours",
            name: "Mehl", // Processed name from translation service takes priority
            is_plural: false,
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("Mehl")).toBeInTheDocument();
      expect(screen.queryByText("flour")).not.toBeInTheDocument();
    });

    test("uses is_plural for sectioned ingredients in English", () => {
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
                name: "banana", // Has translated name but English uses database
                is_plural: false,
              },
            ],
          },
        ],
      };
      renderRecipe();

      // With unit "tbsp" (measurement unit), plural form is used
      expect(screen.getByText("2 tbsp")).toBeInTheDocument();
      expect(screen.getByText("banana")).toBeInTheDocument();
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

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("?")).toBeInTheDocument();
    });
  });

  describe("Translation Scenarios", () => {
    test("displays German ingredient names when recipe is translated", () => {
      // Set language to German for this test
      mockLanguage = "de";

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
            is_plural: false,
          },
          {
            id: "ing-2",
            recipe_ingredient_id: "ri-2",
            quantity: "1",
            unit: "tsp",
            singular_name: "salt",
            plural_name: "salts",
            name: "Salz", // German translation
            is_plural: false,
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText("2 cups")).toBeInTheDocument();
      expect(screen.getByText("Mehl")).toBeInTheDocument();
      expect(screen.getByText("1 tsp")).toBeInTheDocument();
      expect(screen.getByText("Salz")).toBeInTheDocument();
      expect(screen.queryByText(/flour/)).not.toBeInTheDocument();
      expect(screen.queryByText(/salt/)).not.toBeInTheDocument();

      // Reset language to English
      mockLanguage = "en";
    });

    test("displays mixed translated and untranslated ingredients", () => {
      // Set language to German for this test
      mockLanguage = "de";

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
            is_plural: false,
          },
          {
            id: "ing-2",
            recipe_ingredient_id: "ri-2",
            quantity: "2",
            singular_name: "apple",
            plural_name: "apples",
            is_plural: true,
            // No translated name - should fall back to English plural
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("Banane")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("apples")).toBeInTheDocument();

      // Reset language to English
      mockLanguage = "en";
    });

    test("handles ingredient sections with processed names", () => {
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
                plural_name: "water",
                name: "Wasser", // Processed name from translation service takes priority
                is_plural: false,
              },
              {
                id: "ing-4",
                recipe_ingredient_id: "ri-4",
                quantity: "500",
                unit: "g",
                singular_name: "flour",
                plural_name: "flour",
                name: "Mehl", // Processed name from translation service takes priority
                is_plural: false,
              },
            ],
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText("Für den Teig")).toBeInTheDocument();
      // Uses processed names from translation service (including overrides)
      expect(screen.getByText("400ml")).toBeInTheDocument();
      expect(screen.getByText("Wasser")).toBeInTheDocument();
      expect(screen.getByText("500g")).toBeInTheDocument();
      expect(screen.getByText("Mehl")).toBeInTheDocument();
    });

    test("handles ingredients with translated notes", () => {
      // Set language to German for this test
      mockLanguage = "de";

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
            is_plural: false,
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("Mehl")).toBeInTheDocument();
      expect(screen.getByText(/gesiebt/)).toBeInTheDocument();

      // Reset language to English
      mockLanguage = "en";
    });
  });

  describe("Fraction Display", () => {
    test("displays quantities as originally entered", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "0.25",
            unit: "cup/s",
            singular_name: "flour",
            plural_name: "flours",
            is_plural: false,
          },
          {
            id: "ing-2",
            recipe_ingredient_id: "ri-2",
            quantity: "1.5",
            unit: "tsp",
            singular_name: "salt",
            plural_name: "salts",
            is_plural: false,
          },
          {
            id: "ing-3",
            recipe_ingredient_id: "ri-3",
            quantity: "0.75",
            unit: "cup/s",
            singular_name: "sugar",
            plural_name: "sugars",
            is_plural: false,
          },
        ],
      };
      renderRecipe();

      // Should display quantities as originally entered (raw format)
      expect(screen.getByText("0.25 cup")).toBeInTheDocument();
      expect(screen.getByText("flour")).toBeInTheDocument();
      expect(screen.getByText("1.5 tsp")).toBeInTheDocument();
      expect(screen.getByText("salt")).toBeInTheDocument();
      expect(screen.getByText("0.75 cup")).toBeInTheDocument();
      expect(screen.getByText("sugar")).toBeInTheDocument();

      // The raw decimal format is now preserved and displayed
    });

    test("displays whole numbers without fractions", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "2",
            unit: "cups",
            singular_name: "flour",
            plural_name: "flours",
            is_plural: false,
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText("2 cups")).toBeInTheDocument();
      expect(screen.getByText("flour")).toBeInTheDocument();
    });

    test("displays uncommon decimals as decimals", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1.23",
            unit: "cup/s",
            singular_name: "flour",
            plural_name: "flours",
            is_plural: false,
          },
        ],
      };
      renderRecipe();

      expect(screen.getByText("1.23 cups")).toBeInTheDocument();
      expect(screen.getByText("flour")).toBeInTheDocument();
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
