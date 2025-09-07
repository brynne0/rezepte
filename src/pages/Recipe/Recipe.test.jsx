import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
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

vi.mock("../../services/userService", () => ({
  getUserPreferredLanguage: () => mockGetUserPreferredLanguage(),
}));

vi.mock("../LoadingAcorn/LoadingAcorn", () => ({
  default: () => <div data-testid="loading-acorn">Loading...</div>,
}));

vi.mock("../../components/ImageGallery/ImageGallery", () => {
  const MockImageGallery = ({ images, onAllImagesLoaded }) => {
    useEffect(() => {
      if (onAllImagesLoaded) onAllImagesLoaded();
    }, [onAllImagesLoaded]);
    return <div data-testid="image-gallery">Images: {images.length}</div>;
  };
  return {
    default: MockImageGallery,
  };
});

vi.mock("./Recipe.css", () => ({}));

// Mock variables
let mockNavigate;
let mockRecipeHook;
let mockAuth;
let mockGroceryListHook;
let mockGetUserPreferredLanguage;

describe("Recipe Component", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default mock values
    mockNavigate = vi.fn();
    mockLanguage = "en";
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
    mockGetUserPreferredLanguage = vi.fn(() => Promise.resolve("en"));
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
          { id: 2, url: "image2.jpg" },
        ],
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
        images: [],
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
      // Default: user's preferred language matches current UI language
      mockLanguage = "en";
      mockGetUserPreferredLanguage = vi.fn(() => Promise.resolve("en"));
    });

    test("shows grocery cart button for logged in users viewing in preferred language", async () => {
      renderRecipe();

      // Wait for language preference to be loaded
      await screen.findByTestId("lucide-shopping-basket");
      expect(screen.getByTestId("lucide-shopping-basket")).toBeInTheDocument();
    });

    test("doesn't show grocery cart button for non-logged in users", () => {
      mockAuth.isLoggedIn = false;
      renderRecipe();

      expect(
        screen.queryByTestId("lucide-shopping-basket")
      ).not.toBeInTheDocument();
    });

    test("doesn't show grocery cart button when user is not viewing in preferred language", async () => {
      // User prefers German but is viewing in English
      mockLanguage = "en";
      mockGetUserPreferredLanguage = vi.fn(() => Promise.resolve("de"));

      renderRecipe();

      // Wait for component to settle
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        screen.queryByTestId("lucide-shopping-basket")
      ).not.toBeInTheDocument();
    });

    test("shows loading spinner when adding to grocery list", async () => {
      mockGroceryListHook.addingToGroceryList = true;
      renderRecipe();

      await screen.findByTestId("cart-loader");
      expect(screen.getByTestId("cart-loader")).toBeInTheDocument();
    });

    test("shows counter when ingredients are selected", async () => {
      mockGroceryListHook.checkedIngredients = { "ri-1": true, "ri-2": true };
      renderRecipe();

      await screen.findByText("2");
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    test("shows success message after adding to grocery list", async () => {
      mockGroceryListHook.showSuccess = true;
      renderRecipe();

      await screen.findByText("added_to_groceries");
      expect(screen.getByText("added_to_groceries")).toBeInTheDocument();
    });

    test("calls addToGroceryList when cart button clicked", async () => {
      renderRecipe();

      const cartButton = await screen.findByTestId("lucide-shopping-basket");
      fireEvent.click(cartButton);

      expect(mockGroceryListHook.addToGroceryList).toHaveBeenCalledWith(
        mockRecipeData.ungroupedIngredients,
        "Test Recipe",
        "recipe-1"
      );
    });

    test("disables cart button when adding to grocery list", async () => {
      mockGroceryListHook.addingToGroceryList = true;
      renderRecipe();

      const cartButton = await screen.findByTestId("lucide-shopping-basket");
      expect(cartButton.closest("button")).toBeDisabled();
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

  describe("Ingredient Recipe Links", () => {
    test("renders linked ingredient names as clickable links", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "2",
            unit: "cup/s",
            singular_name: "oat flour",
            plural_name: "oat flours",
            is_plural: false,
            linked_recipe: {
              id: "recipe-123",
              slug: "homemade-oat-flour",
              title: "Homemade Oat Flour",
            },
          },
          {
            id: "ing-2",
            recipe_ingredient_id: "ri-2",
            quantity: "1",
            unit: "tsp",
            singular_name: "sea salt",
            plural_name: "sea salts",
            is_plural: false,
            // No linked_recipe - should render as regular text
          },
        ],
      };

      renderRecipe();

      // Linked ingredient should be a clickable link
      const linkedIngredient = screen.getByText("oat flour");
      expect(linkedIngredient.closest("a")).toHaveAttribute(
        "href",
        "/recipe-123/homemade-oat-flour"
      );
      expect(linkedIngredient.closest("a")).toHaveClass(
        "ingredient-name-linked"
      );

      // Unlinked ingredient should be plain text
      const unlinkedIngredient = screen.getByText("sea salt");
      expect(unlinkedIngredient.closest("a")).toBeNull();
    });

    test("linked ingredient links open in same tab with proper navigation", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            singular_name: "cashew cream",
            linked_recipe: {
              id: "recipe-456",
              slug: "cashew-cream-recipe",
              title: "Homemade Cashew Cream",
            },
          },
        ],
      };

      renderRecipe();

      const link = screen.getByText("cashew cream").closest("a");
      expect(link).toHaveAttribute("href", "/recipe-456/cashew-cream-recipe");
      // Should NOT have target="_blank" - opens in same tab for internal navigation
      expect(link).not.toHaveAttribute("target", "_blank");
    });

    test("linked ingredients work with sectioned ingredients", () => {
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
                quantity: "2",
                unit: "cup/s",
                singular_name: "coconut flour",
                plural_name: "coconut flours",
                is_plural: false,
                linked_recipe: {
                  id: "recipe-789",
                  slug: "coconut-flour-recipe",
                  title: "Homemade Coconut Flour",
                },
              },
              {
                id: "ing-4",
                recipe_ingredient_id: "ri-4",
                quantity: "1",
                singular_name: "vanilla extract",
                // No linked_recipe
              },
            ],
          },
        ],
      };

      renderRecipe();

      // Linked sectioned ingredient should be a clickable link
      const linkedIngredient = screen.getByText("coconut flour");
      expect(linkedIngredient.closest("a")).toHaveAttribute(
        "href",
        "/recipe-789/coconut-flour-recipe"
      );
      expect(linkedIngredient.closest("a")).toHaveClass(
        "ingredient-name-linked"
      );

      // Unlinked sectioned ingredient should be plain text
      const unlinkedIngredient = screen.getByText("vanilla extract");
      expect(unlinkedIngredient.closest("a")).toBeNull();
    });

    test("linked ingredients have proper click handling", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            singular_name: "coconut oil",
            linked_recipe: {
              id: "recipe-999",
              slug: "coconut-oil-guide",
              title: "Coconut Oil Guide",
            },
          },
        ],
      };

      renderRecipe();

      const link = screen.getByText("coconut oil").closest("a");

      // Simulate click and verify the link exists and is clickable
      fireEvent.click(link);
      expect(link).toBeInTheDocument();
    });

    test("handles linked ingredients with translated names", () => {
      // Set language to German
      mockLanguage = "de";

      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "2",
            unit: "cup/s",
            singular_name: "almond flour",
            plural_name: "almond flours",
            name: "Mandelmehl", // German translation
            is_plural: false,
            linked_recipe: {
              id: "recipe-101",
              slug: "selbstgemachtes-mandelmehl",
              title: "Selbstgemachtes Mandelmehl",
            },
          },
        ],
      };

      renderRecipe();

      // Should display translated name as link
      const linkedIngredient = screen.getByText("Mandelmehl");
      expect(linkedIngredient.closest("a")).toHaveAttribute(
        "href",
        "/recipe-101/selbstgemachtes-mandelmehl"
      );
      expect(linkedIngredient.closest("a")).toHaveClass(
        "ingredient-name-linked"
      );

      // Reset language to English
      mockLanguage = "en";
    });

    test("handles linked ingredients without linked_recipe gracefully", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            singular_name: "maple syrup",
            linked_recipe: null, // Explicitly null
          },
          {
            id: "ing-2",
            recipe_ingredient_id: "ri-2",
            quantity: "2",
            singular_name: "bananas",
            // linked_recipe property missing entirely
          },
        ],
      };

      renderRecipe();

      // Both should render as plain text, not links
      const syrup = screen.getByText("maple syrup");
      const bananas = screen.getByText("bananas");

      expect(syrup.closest("a")).toBeNull();
      expect(bananas.closest("a")).toBeNull();
    });

    test("linked ingredients work with plural forms", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "3",
            singular_name: "mushroom",
            plural_name: "mushrooms",
            is_plural: true,
            linked_recipe: {
              id: "recipe-202",
              slug: "fresh-mushrooms",
              title: "Fresh Mushrooms",
            },
          },
        ],
      };

      renderRecipe();

      // Should use plural form as link text
      const linkedIngredient = screen.getByText("mushrooms");
      expect(linkedIngredient.closest("a")).toHaveAttribute(
        "href",
        "/recipe-202/fresh-mushrooms"
      );
      expect(linkedIngredient.closest("a")).toHaveClass(
        "ingredient-name-linked"
      );
    });

    test("linked ingredients work with missing slug", () => {
      mockRecipeHook.recipe = {
        ...mockRecipeData,
        ungroupedIngredients: [
          {
            id: "ing-1",
            recipe_ingredient_id: "ri-1",
            quantity: "1",
            singular_name: "oat milk",
            linked_recipe: {
              id: "recipe-303",
              title: "Fresh Oat Milk",
              // slug missing
            },
          },
        ],
      };

      renderRecipe();

      // Should still create link with just ID
      const linkedIngredient = screen.getByText("oat milk");
      expect(linkedIngredient.closest("a")).toHaveAttribute(
        "href",
        "/recipe-303/undefined"
      );
      expect(linkedIngredient.closest("a")).toHaveClass(
        "ingredient-name-linked"
      );
    });
  });

  describe("getAllIngredients Helper Function", () => {
    test("combines ungrouped ingredients and sectioned ingredients for grocery list", async () => {
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

      // Wait for and click add to grocery list
      const cartButton = await screen.findByTestId("lucide-shopping-basket");
      fireEvent.click(cartButton);

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

  describe("Language Preference Integration", () => {
    beforeEach(() => {
      mockRecipeHook.recipe = mockRecipeData;
      mockAuth.isLoggedIn = true;
      // Default: user's preferred language matches current UI language
      mockLanguage = "en";
      mockGetUserPreferredLanguage = vi.fn(() => Promise.resolve("en"));
    });

    test("shows grocery list features when current language matches user preference", async () => {
      mockLanguage = "en";
      mockGetUserPreferredLanguage = vi.fn(() => Promise.resolve("en"));
      mockGroceryListHook.showSuccess = true;

      renderRecipe();

      // Should show grocery cart button
      await screen.findByTestId("lucide-shopping-basket");
      expect(screen.getByTestId("lucide-shopping-basket")).toBeInTheDocument();

      // Should show success message when present
      expect(screen.getByText("added_to_groceries")).toBeInTheDocument();
    });

    test("hides grocery list features when current language differs from user preference", async () => {
      mockLanguage = "de";
      mockGetUserPreferredLanguage = vi.fn(() => Promise.resolve("en"));
      mockGroceryListHook.showSuccess = true;

      renderRecipe();

      // Wait for component to settle
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should hide grocery cart button
      expect(
        screen.queryByTestId("lucide-shopping-basket")
      ).not.toBeInTheDocument();

      // Should hide success message even when it would normally show
      expect(screen.queryByText("added_to_groceries")).not.toBeInTheDocument();
    });

    test("handles loading state of user preferred language gracefully", async () => {
      // Simulate slow user preference loading
      let resolvePreference;
      const preferencePromise = new Promise((resolve) => {
        resolvePreference = resolve;
      });
      mockGetUserPreferredLanguage = vi.fn(() => preferencePromise);

      renderRecipe();

      // Initially should not show grocery cart (waiting for preference)
      expect(
        screen.queryByTestId("lucide-shopping-basket")
      ).not.toBeInTheDocument();

      // Resolve the preference to match current language
      resolvePreference("en");

      // Now should show grocery cart button after state updates
      await waitFor(
        () => {
          expect(
            screen.getByTestId("lucide-shopping-basket")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});
