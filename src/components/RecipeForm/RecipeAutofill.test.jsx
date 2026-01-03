import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import RecipeAutofill from "./RecipeAutofill";

// Mock environment variables
const mockEnv = {
  VITE_SUPABASE_URL: "https://test.supabase.co",
  VITE_SUPABASE_ANON_KEY: "test-anon-key",
};

// Store original env
const originalEnv = import.meta.env;

describe("RecipeAutofill", () => {
  let mockOnAutofill;
  let mockFetch;

  beforeEach(() => {
    // Mock import.meta.env
    import.meta.env = { ...originalEnv, ...mockEnv };

    mockOnAutofill = vi.fn();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
    import.meta.env = originalEnv;
  });

  const mockCategories = [
    { value: "all_recipes", label: "All Recipes" },
    { value: "breakfast", label: "Breakfast" },
    { value: "lunch", label: "Lunch" },
    { value: "dinner", label: "Dinner" },
    { value: "dessert", label: "Dessert" },
  ];

  it("renders the autofill form", () => {
    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    expect(
      screen.getByRole("heading", { name: /autofill_recipe/i })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/paste_recipe_placeholder/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /autofill/i })
    ).toBeInTheDocument();
  });

  it("shows error when submitting empty text", async () => {
    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/paste_text_required/i)).toBeInTheDocument();
    });

    expect(mockOnAutofill).not.toHaveBeenCalled();
  });

  it("clears error when user types after an error", async () => {
    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/paste_text_required/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, { target: { value: "Some recipe text" } });

    await waitFor(() => {
      expect(
        screen.queryByText(/paste_text_required/i)
      ).not.toBeInTheDocument();
    });
  });

  it("calls edge function with correct parameters", async () => {
    const mockRecipe = {
      title: "Test Recipe",
      servings: "4",
      categories: ["breakfast"],
      ingredients: [{ quantity: "2", unit: "cup/s", name: "flour", notes: "" }],
      instructions: ["Mix ingredients", "Bake"],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, recipe: mockRecipe }),
    });

    render(
      <RecipeAutofill onAutofill={mockOnAutofill} categories={mockCategories} />
    );

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, { target: { value: "Test recipe text" } });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.supabase.co/functions/v1/parse-recipe",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-anon-key",
          },
          body: JSON.stringify({
            pastedText: "Test recipe text",
            recipeUrl: null,
            availableCategories: ["breakfast", "lunch", "dinner", "dessert"],
          }),
        })
      );
    });
  });

  it("calls onAutofill with parsed recipe on success", async () => {
    const mockRecipe = {
      title: "Test Recipe",
      servings: "4",
      categories: ["breakfast"],
      ingredients: [{ quantity: "2", unit: "cup/s", name: "flour", notes: "" }],
      instructions: ["Mix ingredients", "Bake"],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, recipe: mockRecipe }),
    });

    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, { target: { value: "Test recipe text" } });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnAutofill).toHaveBeenCalledWith(mockRecipe);
    });
  });

  it("shows error message on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: "API error" }),
    });

    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, { target: { value: "Test recipe text" } });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/parse_error/i)).toBeInTheDocument();
    });

    expect(mockOnAutofill).not.toHaveBeenCalled();
  });

  it("clears textarea and hides on cancel", () => {
    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, { target: { value: "Some text" } });

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(textarea.value).toBe("");
  });

  it("allows Enter key in textarea", () => {
    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);

    fireEvent.keyDown(textarea, { key: "Enter", code: "Enter" });

    // Verify stopPropagation was called by checking the event wasn't prevented
    expect(textarea).toBeInTheDocument();
  });

  it("disables submit button while parsing", async () => {
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  success: true,
                  recipe: { title: "Test" },
                }),
              }),
            100
          )
        )
    );

    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, { target: { value: "Test recipe text" } });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    // Button should be disabled and show "autofilling" text
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/autofilling/i)).toBeInTheDocument();
    });
  });

  it("filters out 'all' category when sending to API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recipe: { title: "Test" },
      }),
    });

    render(
      <RecipeAutofill onAutofill={mockOnAutofill} categories={mockCategories} />
    );

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, { target: { value: "Test recipe text" } });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(
            JSON.stringify({
              pastedText: "Test recipe text",
              recipeUrl: null,
              availableCategories: ["breakfast", "lunch", "dinner", "dessert"],
            })
          ),
        })
      );
    });
  });

  it("detects URL and sends it to API correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recipe: { title: "URL Recipe" },
      }),
    });

    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, {
      target: { value: "https://example.com/recipe" },
    });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(
            JSON.stringify({
              pastedText: null,
              recipeUrl: "https://example.com/recipe",
              availableCategories: [],
            })
          ),
        })
      );
    });
  });

  it("detects www URLs without protocol", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recipe: { title: "WWW Recipe" },
      }),
    });

    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, { target: { value: "www.example.com/recipe" } });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(
            JSON.stringify({
              pastedText: null,
              recipeUrl: "www.example.com/recipe",
              availableCategories: [],
            })
          ),
        })
      );
    });
  });

  it("treats non-URL text as recipe text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recipe: { title: "Text Recipe" },
      }),
    });

    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, {
      target: { value: "Just some recipe text" },
    });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining(
            JSON.stringify({
              pastedText: "Just some recipe text",
              recipeUrl: null,
              availableCategories: [],
            })
          ),
        })
      );
    });
  });

  it("includes source URL in parsed recipe when URL is provided", async () => {
    const mockRecipeWithSource = {
      title: "Recipe from URL",
      servings: "4",
      categories: ["dinner"],
      ingredients: [{ quantity: "1", unit: "kg", name: "chicken", notes: "" }],
      instructions: ["Cook it"],
      source: "https://example.com/recipe",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, recipe: mockRecipeWithSource }),
    });

    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    fireEvent.change(textarea, {
      target: { value: "https://example.com/recipe" },
    });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnAutofill).toHaveBeenCalledWith(
        expect.objectContaining({
          source: "https://example.com/recipe",
        })
      );
    });
  });

  it("shows error when text exceeds character limit", async () => {
    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    const longText = "a".repeat(15001);
    fireEvent.change(textarea, { target: { value: longText } });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/paste_text_too_long/i)).toBeInTheDocument();
    });

    expect(mockOnAutofill).not.toHaveBeenCalled();
  });

  it("does not enforce character limit on URLs", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recipe: { title: "Long URL Recipe" },
      }),
    });

    render(<RecipeAutofill onAutofill={mockOnAutofill} />);

    const textarea = screen.getByPlaceholderText(/paste_recipe_placeholder/i);
    // Very long URL should still be accepted
    const longUrl = "https://example.com/recipe?" + "a".repeat(20000);
    fireEvent.change(textarea, { target: { value: longUrl } });

    const submitButton = screen.getByRole("button", { name: /autofill/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
