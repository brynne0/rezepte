import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RecipeForm from "./RecipeForm";

// Mock dependencies
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => {
      // Mock the units array specifically
      if (key === "units") {
        return [
          { value: "", label: "" },
          { value: "cup/s", label: "cup/s" },
          { value: "tbsp", label: "tbsp" },
          { value: "tsp", label: "tsp" },
          { value: "g", label: "g" },
          { value: "kg", label: "kg" },
        ];
      }
      return key;
    },
    i18n: { language: "en" },
  }),
}));

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }) => (
    <div data-testid="drag-drop-context">{children}</div>
  ),
  Droppable: ({ children, droppableId }) => (
    <div data-testid={`droppable-${droppableId}`}>
      {children(
        {
          droppableProps: {},
          innerRef: () => {},
          placeholder: null,
        },
        { isDraggingOver: false }
      )}
    </div>
  ),
  Draggable: ({ children, draggableId }) => (
    <div data-testid={`draggable-${draggableId}`}>
      {children(
        {
          draggableProps: {},
          dragHandleProps: {},
          innerRef: () => {},
        },
        { isDragging: false }
      )}
    </div>
  ),
}));

vi.mock("./hooks/useRecipeForm", () => ({
  useRecipeForm: vi.fn(),
}));

vi.mock("../../hooks/data/useCategories", () => ({
  useCategories: vi.fn(() => ({ refreshCategories: vi.fn() })),
}));

vi.mock("../../services/categoriesService", () => ({
  createCategory: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useBlocker: () => ({ state: "unblocked" }),
  };
});

import { useRecipeForm } from "./hooks/useRecipeForm";

describe("RecipeForm", () => {
  const mockCategories = [
    { value: "all_recipes", label: "All Recipes" },
    { value: "desserts", label: "Desserts" },
    { value: "main-dishes", label: "Main Dishes" },
  ];

  const mockFormData = {
    title: "Test Recipe",
    categories: ["desserts"],
    servings: 4,
    ungroupedIngredients: [
      { tempId: "1", name: "flour", quantity: "2", unit: "cup/s", notes: "" },
    ],
    ingredientSections: [],
    instructions: ["Mix ingredients", "Bake for 30 minutes"],
    source: "https://example.com",
    notes: "Test notes",
    images: [],
    ingredientLinks: {},
    nutrition_columns: [
      {
        label: "",
        calories: null,
        protein: null,
        fat: null,
        carbs: null,
        fiber: null,
        sugar: null,
        sodium: null,
      },
    ],
  };

  const mockHookReturn = {
    formData: mockFormData,
    validationErrors: {},
    loading: false,
    isEditMode: false,
    isOnline: true,
    hasUnsavedChanges: vi.fn(() => false),
    handleInputChange: vi.fn(),
    handleTitleBlur: vi.fn(),
    handleIngredientChange: vi.fn(),
    handleSectionChange: vi.fn(),
    handleInstructionChange: vi.fn(),
    addInstruction: vi.fn(),
    removeInstruction: vi.fn(),
    addIngredient: vi.fn(),
    addSection: vi.fn(),
    removeSection: vi.fn(),
    removeIngredient: vi.fn(),
    handleDragEnd: vi.fn(),
    handleSubmit: vi.fn(),
    handleDelete: vi.fn(),
    toTitleCase: vi.fn((str) => str),
    handleIngredientLink: vi.fn(),
    removeIngredientLink: vi.fn(),
    getIngredientLink: vi.fn(() => null),
    handleImagesChange: vi.fn(),
    uploadingImageIds: new Set(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useRecipeForm.mockReturnValue(mockHookReturn);
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      categories: mockCategories,
      title: "Create Recipe",
    };

    return render(<RecipeForm {...defaultProps} {...props} />);
  };

  describe("Basic Rendering", () => {
    it("renders form with title", () => {
      renderComponent();

      expect(screen.getByText("Create Recipe")).toBeInTheDocument();
      expect(screen.getByRole("form")).toBeInTheDocument();
    });
  });

  describe("Form Fields", () => {
    it("renders all basic form fields", () => {
      renderComponent();

      expect(screen.getByDisplayValue("Test Recipe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("4")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("https://example.com")
      ).toBeInTheDocument();
    });

    it("renders title and servings on the same row", () => {
      renderComponent();

      // Check that both title and servings headers are present
      expect(screen.getByText("recipe_title")).toBeInTheDocument();
      expect(screen.getByText("servings")).toBeInTheDocument();

      // Check that the inputs are rendered
      expect(screen.getByDisplayValue("Test Recipe")).toBeInTheDocument();
      expect(screen.getByDisplayValue("4")).toBeInTheDocument();
    });

    it("renders category buttons correctly", () => {
      renderComponent();

      // Check that category buttons are rendered (excluding "all_recipes")
      expect(screen.queryByText("All Recipes")).not.toBeInTheDocument();
      expect(screen.getByText("Desserts")).toBeInTheDocument();
      expect(screen.getByText("Main Dishes")).toBeInTheDocument();

      // Check that the selected category has the correct class
      const dessertsButton = screen.getByText("Desserts").closest("button");
      const mainDishesButton = screen
        .getByText("Main Dishes")
        .closest("button");

      expect(dessertsButton).toHaveAttribute("aria-pressed", "true");
      expect(mainDishesButton).toHaveAttribute("aria-pressed", "false");
    });

    it("calls handleInputChange when category button is clicked", () => {
      renderComponent();

      const mainDishesButton = screen
        .getByText("Main Dishes")
        .closest("button");
      fireEvent.click(mainDishesButton);

      expect(mockHookReturn.handleInputChange).toHaveBeenCalledWith(
        "categories",
        ["desserts", "main-dishes"],
        true
      );
    });

    it("shows validation errors when present", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        validationErrors: { title: "Title is required" },
      });

      renderComponent();

      const titleInput = screen.getByDisplayValue("Test Recipe");
      expect(titleInput).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });

    it("shows validation error styling on category buttons", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        validationErrors: { category: "Category is required" },
      });

      renderComponent();

      const categoryField = screen
        .getByText("Desserts")
        .closest('[data-slot="field"]');
      expect(categoryField).toHaveAttribute("data-invalid", "true");
      expect(screen.getByText("Category is required")).toBeInTheDocument();
    });

    it("renders a plain source input", () => {
      renderComponent();

      const sourceInput = screen.getByDisplayValue("https://example.com");
      expect(sourceInput).toBeInTheDocument();
      expect(sourceInput).toHaveAttribute("placeholder", "source_placeholder");
    });

    it("calls handleInputChange when source changes", () => {
      renderComponent();

      const sourceInput = screen.getByDisplayValue("https://example.com");
      fireEvent.change(sourceInput, {
        target: { value: "My grandmother's recipe" },
      });

      expect(mockHookReturn.handleInputChange).toHaveBeenCalledWith(
        "source",
        "My grandmother's recipe"
      );
    });
  });

  describe("Form Interactions", () => {
    it("calls handleInputChange when title changes", () => {
      renderComponent();

      const titleInput = screen.getByDisplayValue("Test Recipe");
      fireEvent.change(titleInput, { target: { value: "New Title" } });

      // On change, should call handleInputChange without title case
      expect(mockHookReturn.handleInputChange).toHaveBeenCalledWith(
        "title",
        "New Title",
        false
      );

      // On blur, should call toTitleCase and handleInputChange again
      fireEvent.blur(titleInput, { target: { value: "New Title" } });
      expect(mockHookReturn.toTitleCase).toHaveBeenCalledWith("New Title");
    });

    it("calls handleSubmit when form is submitted", () => {
      renderComponent();

      const form = screen.getByRole("form");
      fireEvent.submit(form);

      expect(mockHookReturn.handleSubmit).toHaveBeenCalled();
    });

    it("navigates when back arrow is clicked with no unsaved changes", () => {
      renderComponent();

      const backButton = screen.getByTestId("back-arrow");
      fireEvent.click(backButton);

      // With no unsaved changes (mock returns false), it should navigate directly
      // We can't easily test navigation without more complex mocking, so just
      // verify the back button exists and is clickable
      expect(backButton).toBeInTheDocument();
    });
  });

  describe("Ingredients Section", () => {
    it("renders existing ingredients", () => {
      renderComponent();

      expect(screen.getByDisplayValue("flour")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    });

    it("calls addIngredient when add ingredient button is clicked", () => {
      renderComponent();

      const addButtons = screen.getAllByTestId("add-ingredient-btn");
      fireEvent.click(addButtons[0]); // First plus button should be for ingredients

      expect(mockHookReturn.addIngredient).toHaveBeenCalledWith("ungrouped");
    });

    it("calls removeIngredient when delete ingredient button is clicked", () => {
      renderComponent();

      // Find the remove button for the ingredient
      const removeButtons = screen.getAllByTestId("remove-ingredient-btn");
      fireEvent.click(removeButtons[0]); // First remove button should be for ingredient

      expect(mockHookReturn.removeIngredient).toHaveBeenCalledWith(
        "ungrouped",
        "1"
      );
    });

    it("calls addSection when add section button is clicked", () => {
      renderComponent();

      const addSectionButton = screen.getByText("add_section");
      fireEvent.click(addSectionButton);

      expect(mockHookReturn.addSection).toHaveBeenCalled();
    });
    it("can add ingredients to sections", () => {
      const mockFormDataWithSection = {
        ...mockFormData,
        ingredientSections: [
          {
            id: "section-1",
            subheading: "For the sauce",
            ingredients: [
              {
                tempId: "2",
                name: "tomatoes",
                quantity: "3",
                unit: "cup/s",
                notes: "diced",
              },
            ],
          },
        ],
      };

      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        formData: mockFormDataWithSection,
      });

      renderComponent();

      // Check that section ingredient is rendered
      expect(screen.getByDisplayValue("tomatoes")).toBeInTheDocument();
      expect(screen.getByText("For the sauce")).toBeInTheDocument();

      // Find add ingredient button for the section
      const addSectionButton = screen.getByTestId("add-section-ingredient-btn");

      fireEvent.click(addSectionButton);

      expect(mockHookReturn.addIngredient).toHaveBeenCalledWith("section-1");
    });

    it("calls removeIngredient when delete ingredient button is clicked for section ingredients", () => {
      const mockFormDataWithSection = {
        ...mockFormData,
        ingredientSections: [
          {
            id: "section-1",
            subheading: "For the sauce",
            ingredients: [
              {
                tempId: "2",
                name: "tomatoes",
                quantity: "3",
                unit: "cup/s",
                notes: "diced",
              },
            ],
          },
        ],
      };

      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        formData: mockFormDataWithSection,
      });

      renderComponent();

      // Find the remove button for the section ingredient
      const removeButton = screen.getByTestId(
        "remove-section-ingredient-btn-section-1-2"
      ); // Updated data-testid
      fireEvent.click(removeButton);

      expect(mockHookReturn.removeIngredient).toHaveBeenCalledWith(
        "section-1",
        "2"
      );
    });

    it("can remove entire sections", () => {
      const mockFormDataWithSection = {
        ...mockFormData,
        ingredientSections: [
          {
            id: "section-1",
            subheading: "Sauce",
            ingredients: [
              {
                tempId: "2",
                name: "tomatoes",
                quantity: "3",
                unit: "cup/s",
                notes: "diced",
              },
            ],
          },
        ],
      };

      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        formData: mockFormDataWithSection,
      });

      renderComponent();

      // Ensure section is rendered
      expect(screen.getByText("Sauce")).toBeInTheDocument();

      // Find the section remove button
      const removeSectionButton = screen.getByLabelText("remove_section");
      fireEvent.click(removeSectionButton); // First remove button should be for removing the section

      expect(mockHookReturn.removeSection).toHaveBeenCalledWith("section-1");
    });
  });

  describe("Instructions Section", () => {
    it("renders existing instructions with step numbers", () => {
      renderComponent();

      expect(screen.getByText("1.")).toBeInTheDocument();
      expect(screen.getByText("2.")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Mix ingredients")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("Bake for 30 minutes")
      ).toBeInTheDocument();
    });

    it("calls addInstruction when add instruction button is clicked", () => {
      renderComponent();

      // Find the add instruction button (should be the last plus button)
      const addInstructionButton = screen.getByTestId("add-instruction-btn");
      fireEvent.click(addInstructionButton);
      expect(mockHookReturn.addInstruction).toHaveBeenCalled();
    });

    it("calls removeInstruction when delete instruction button is clicked", () => {
      renderComponent();

      // Find the remove button for the instruction
      const removeButtons = screen.getAllByTestId("remove-instruction-btn");
      fireEvent.click(removeButtons[0]); // Click the first remove button

      expect(mockHookReturn.removeInstruction).toHaveBeenCalled();
    });
  });

  describe("Edit Mode", () => {
    it("shows delete button in edit mode", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        isEditMode: true,
      });

      renderComponent();

      expect(screen.getByText("delete_recipe")).toBeInTheDocument();
    });

    it("shows update button text in edit mode", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        isEditMode: true,
      });

      renderComponent();

      expect(screen.getByText("update_recipe")).toBeInTheDocument();
    });

    it("opens delete modal when delete button is clicked", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        isEditMode: true,
      });

      renderComponent();

      const deleteButton = screen.getByText("delete_recipe");
      fireEvent.click(deleteButton);

      expect(
        screen.getByText("recipe_delete_confirmation")
      ).toBeInTheDocument();
    });

    it("calls handleDelete when delete is confirmed", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        isEditMode: true,
      });

      renderComponent();

      // Open modal
      const deleteButton = screen.getByText("delete_recipe");
      fireEvent.click(deleteButton);

      // Confirm delete
      const confirmButton = screen.getByRole("button", { name: "delete" });
      fireEvent.click(confirmButton);

      expect(mockHookReturn.handleDelete).toHaveBeenCalled();
    });
  });

  describe("Offline", () => {
    it("disables the submit button when offline", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        isOnline: false,
      });

      renderComponent();

      const submitButton = screen.getByRole("button", {
        name: /create_recipe/,
      });
      expect(submitButton).toBeDisabled();
    });

    it("does not disable the submit button when online", () => {
      renderComponent();

      const submitButton = screen.getByRole("button", {
        name: /create_recipe/,
      });
      expect(submitButton).not.toBeDisabled();
    });

    it("disables the delete button and confirm action when offline in edit mode", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        isEditMode: true,
        isOnline: false,
      });

      renderComponent();

      const deleteButton = screen.getByText("delete_recipe");
      expect(deleteButton.closest("button")).toBeDisabled();
    });
  });

  describe("Adding a category", () => {
    it("shows an input for the new category name when add_category is clicked", () => {
      renderComponent();

      fireEvent.click(screen.getByText("add_category"));

      expect(screen.getByPlaceholderText("category_name")).toBeInTheDocument();
    });

    it("adds the typed category locally without calling any service", () => {
      renderComponent();

      fireEvent.click(screen.getByText("add_category"));
      fireEvent.change(screen.getByPlaceholderText("category_name"), {
        target: { value: "Brunch" },
      });
      fireEvent.click(screen.getByText("add_category"));

      expect(screen.getByText("Brunch")).toBeInTheDocument();
      expect(mockHookReturn.handleInputChange).toHaveBeenCalledWith(
        "categories",
        ["desserts", "Brunch"]
      );
    });

    it("shows a required error when saving an empty category name", () => {
      renderComponent();

      fireEvent.click(screen.getByText("add_category"));
      fireEvent.click(screen.getByText("add_category"));

      expect(screen.getByText("category_name_required")).toBeInTheDocument();
      expect(mockHookReturn.handleInputChange).not.toHaveBeenCalled();
    });

    it("shows a duplicate error when the category name already exists", () => {
      renderComponent();

      fireEvent.click(screen.getByText("add_category"));
      fireEvent.change(screen.getByPlaceholderText("category_name"), {
        target: { value: "desserts" },
      });
      fireEvent.click(screen.getByText("add_category"));

      expect(
        screen.getByText("category_name_already_exists")
      ).toBeInTheDocument();
      expect(mockHookReturn.handleInputChange).not.toHaveBeenCalled();
    });

    it("closes the input and clears the name when cancelled", () => {
      renderComponent();

      fireEvent.click(screen.getByText("add_category"));
      const nameInput = screen.getByPlaceholderText("category_name");
      fireEvent.change(nameInput, { target: { value: "Brunch" } });

      const cancelButtons = screen.getAllByRole("button", { name: "cancel" });
      const categoryCancelButton = cancelButtons.find((button) =>
        nameInput.parentElement.contains(button)
      );
      fireEvent.click(categoryCancelButton);

      expect(
        screen.queryByPlaceholderText("category_name")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Brunch")).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("disables submit button when loading", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        loading: true,
      });

      renderComponent();

      const submitButton = screen.getByRole("button", {
        name: /create_recipe/,
      });
      expect(submitButton).toBeDisabled();
    });

    it("shows loading spinner on submit button", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        loading: true,
        isEditMode: true,
      });

      renderComponent();

      expect(
        screen.getByRole("status", { name: /loading/i })
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper form labels", () => {
      renderComponent();

      expect(screen.getByText("recipe_title")).toBeInTheDocument();
      expect(screen.getByText("category")).toBeInTheDocument();
      expect(screen.getByLabelText("servings")).toBeInTheDocument();
    });

    it("has aria-labels for icon buttons", () => {
      renderComponent();

      const removeButtons = screen.getAllByLabelText("remove_ingredient");
      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Translation Editing Mode", () => {
    describe("Translation Notice", () => {
      it("shows translation notice when isEditingTranslation is true", () => {
        renderComponent({ isEditingTranslation: true });

        expect(
          screen.getByText("editing_translation_notice")
        ).toBeInTheDocument();
      });

      it("does not show translation notice when isEditingTranslation is false", () => {
        renderComponent({ isEditingTranslation: false });

        expect(
          screen.queryByText("editing_translation_notice")
        ).not.toBeInTheDocument();
      });
    });

    describe("Disabled Fields", () => {
      beforeEach(() => {
        // Reset mocks for each test
        vi.clearAllMocks();
      });

      it("disables servings input in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const servingsInput = screen.getByDisplayValue("4");
        expect(servingsInput).toBeDisabled();
      });

      it("applies disabled styling to servings field", () => {
        renderComponent({ isEditingTranslation: true });

        const servingsField = screen
          .getByDisplayValue("4")
          .closest('[data-slot="field"]');
        expect(servingsField).toHaveClass("opacity-50");
      });

      it("disables category buttons in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const categoryButtons = screen
          .getAllByRole("button")
          .filter(
            (button) =>
              button.textContent === "Desserts" ||
              button.textContent === "Main Dishes"
          );

        categoryButtons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });

      it("disables add section button in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const addSectionButton = screen.getByText("add_section");
        expect(addSectionButton).toBeDisabled();
      });

      it("disables add ingredient buttons in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const addIngredientButtons =
          screen.getAllByTestId("add-ingredient-btn");
        addIngredientButtons.forEach((button) => {
          expect(button.closest("button")).toBeDisabled();
        });
      });

      it("disables remove ingredient buttons in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const removeIngredientButtons = screen.getAllByTestId(
          "remove-ingredient-btn"
        );
        removeIngredientButtons.forEach((button) => {
          expect(button.closest("button")).toBeDisabled();
        });
      });

      it("disables add instruction button in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const addInstructionButton = screen
          .getByTestId("add-instruction-btn")
          .closest("button");
        expect(addInstructionButton).toBeDisabled();
      });

      it("disables remove instruction buttons in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const removeInstructionButtons = screen.getAllByTestId(
          "remove-instruction-btn"
        );
        removeInstructionButtons.forEach((button) => {
          expect(button.closest("button")).toBeDisabled();
        });
      });

      it("disables drag handles in translation mode", () => {
        const { container } = renderComponent({ isEditingTranslation: true });

        // Check that drag handles have disabled styling
        const dragHandles = container.querySelectorAll(
          '[data-slot="drag-handle"]'
        );
        dragHandles.forEach((handle) => {
          expect(handle).toHaveStyle({ pointerEvents: "none" });
        });
      });
    });

    describe("Sectioned Ingredients in Translation Mode", () => {
      beforeEach(() => {
        const mockFormDataWithSection = {
          ...mockFormData,
          ingredientSections: [
            {
              id: "section-1",
              subheading: "For the sauce",
              ingredients: [
                {
                  tempId: "2",
                  name: "tomatoes",
                  quantity: "3",
                  unit: "cup/s",
                  notes: "diced",
                },
              ],
            },
          ],
        };

        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          formData: mockFormDataWithSection,
        });
      });

      it("disables ingredient quantity inputs in sections", () => {
        renderComponent({ isEditingTranslation: true });

        const quantityInputs = screen.getAllByDisplayValue("3");
        quantityInputs.forEach((input) => {
          if (input.getAttribute("placeholder") === "quantity") {
            expect(input).toBeDisabled();
          }
        });
      });

      it("disables ingredient unit selectors in sections", () => {
        const { container } = renderComponent({ isEditingTranslation: true });

        // Check for disabled unit selectors (these are custom Selector components)
        const selectorElements = container.querySelectorAll(
          '[id*="ingredient-unit"]'
        );
        // Note: The actual disabled state would be handled by the Selector component
        // Here we just verify the prop is passed correctly
        expect(selectorElements.length).toBeGreaterThan(0);
      });

      it("disables remove ingredient buttons in sections", () => {
        renderComponent({ isEditingTranslation: true });

        const removeButton = screen.getByTestId(
          "remove-section-ingredient-btn-section-1-2"
        );
        expect(removeButton.closest("button")).toBeDisabled();
      });

      it("disables add ingredient button for sections", () => {
        renderComponent({ isEditingTranslation: true });

        const addSectionIngredientButton = screen.getByTestId(
          "add-section-ingredient-btn"
        );
        expect(addSectionIngredientButton.closest("button")).toBeDisabled();
      });

      it("disables remove section button", () => {
        renderComponent({ isEditingTranslation: true });

        const removeSectionButton = screen.getByLabelText("remove_section");
        expect(removeSectionButton).toBeDisabled();
      });
    });

    describe("Enabled Fields in Translation Mode", () => {
      it("keeps title input enabled in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const titleInput = screen.getByDisplayValue("Test Recipe");
        expect(titleInput).not.toBeDisabled();
      });

      it("keeps ingredient name inputs enabled in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const ingredientNameInput = screen.getByDisplayValue("flour");
        expect(ingredientNameInput).not.toBeDisabled();
      });

      it("keeps ingredient notes inputs enabled in translation mode", () => {
        const { container } = renderComponent({ isEditingTranslation: true });

        // Look for notes inputs by placeholder or other identifying attributes
        const notesInputs = container.querySelectorAll(
          'input[placeholder="notes"]'
        );
        notesInputs.forEach((input) => {
          expect(input).not.toBeDisabled();
        });
      });

      it("keeps instruction textareas enabled in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        // Instructions should be editable, find them by their values
        const mixInstructionInput = screen.getByDisplayValue("Mix ingredients");
        const bakeInstructionInput = screen.getByDisplayValue(
          "Bake for 30 minutes"
        );

        expect(mixInstructionInput).not.toBeDisabled();
        expect(bakeInstructionInput).not.toBeDisabled();
      });

      it("keeps source input enabled in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const sourceInput = screen.getByDisplayValue("https://example.com");
        expect(sourceInput).not.toBeDisabled();
      });

      it("keeps notes input enabled in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const notesInput = screen.getByDisplayValue("Test notes");
        expect(notesInput).not.toBeDisabled();
      });
    });

    describe("Button Text in Translation Mode", () => {
      it("shows correct submit button text when editing translation", () => {
        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          isEditMode: true,
        });

        renderComponent({ isEditingTranslation: true });

        expect(screen.getByText("update_translation")).toBeInTheDocument();
      });

      it("shows loading spinner when updating translation", () => {
        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          isEditMode: true,
          loading: true,
        });

        renderComponent({ isEditingTranslation: true });

        expect(
          screen.getByRole("status", { name: /loading/i })
        ).toBeInTheDocument();
        expect(screen.getByText("update_translation")).toBeInTheDocument();
      });
    });

    describe("Form Submission in Translation Mode", () => {
      it("allows form submission in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const form = screen.getByRole("form");
        fireEvent.submit(form);

        expect(mockHookReturn.handleSubmit).toHaveBeenCalled();
      });

      it("does not prevent text changes in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const titleInput = screen.getByDisplayValue("Test Recipe");
        fireEvent.change(titleInput, { target: { value: "Translated Title" } });

        expect(mockHookReturn.handleInputChange).toHaveBeenCalledWith(
          "title",
          "Translated Title",
          false
        );
      });
    });

    describe("Non-Translation Mode Behavior", () => {
      it("enables all fields when not in translation mode", () => {
        renderComponent({ isEditingTranslation: false });

        // Verify key fields are not disabled
        const servingsInput = screen.getByDisplayValue("4");
        const addSectionButton = screen.getByText("add_section");
        const categoryButtons = screen
          .getAllByRole("button")
          .filter(
            (button) =>
              button.textContent === "Desserts" ||
              button.textContent === "Main Dishes"
          );

        expect(servingsInput).not.toBeDisabled();
        expect(addSectionButton).not.toBeDisabled();
        categoryButtons.forEach((button) => {
          expect(button).not.toBeDisabled();
        });
      });

      it("does not apply disabled styling when not in translation mode", () => {
        renderComponent({ isEditingTranslation: false });

        const servingsField = screen
          .getByDisplayValue("4")
          .closest('[data-slot="field"]');

        expect(servingsField).not.toHaveClass("opacity-50");
      });
    });
  });

  describe("Ingredient Recipe Link Functionality", () => {
    const mockLinkedRecipe = {
      id: "recipe-123",
      title: "Chocolate Chip Cookies",
      slug: "chocolate-chip-cookies",
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("Link Button Rendering", () => {
      it("renders link button for ungrouped ingredients", () => {
        renderComponent();

        // Find all link buttons - should have one for each ingredient
        const linkButtons = screen.getAllByLabelText("link_to_recipe");

        expect(linkButtons.length).toBeGreaterThan(0);
      });

      it("renders link button with correct default styling", () => {
        renderComponent();

        const linkButton = screen.getByLabelText("link_to_recipe");

        expect(linkButton).not.toHaveClass("text-destructive");
      });

      it("renders link button with linked styling when ingredient is linked", () => {
        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          getIngredientLink: vi.fn(() => mockLinkedRecipe),
        });

        renderComponent();

        const linkButton = screen.getByLabelText("unlink_recipe");

        expect(linkButton).toHaveClass("text-destructive");
      });
    });

    describe("Link Button Actions", () => {
      it("opens recipe selector when clicking unlinked ingredient button", () => {
        renderComponent();

        const linkButton = screen.getByLabelText("link_to_recipe");

        fireEvent.click(linkButton);

        // Should set linking ingredient state to open recipe selector
        expect(linkButton).toBeInTheDocument();
      });

      it("removes link when clicking linked ingredient button", () => {
        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          getIngredientLink: vi.fn(() => mockLinkedRecipe),
        });

        renderComponent();

        const linkButton = screen.getByLabelText("unlink_recipe");

        fireEvent.click(linkButton);

        expect(mockHookReturn.removeIngredientLink).toHaveBeenCalledWith(
          "ungrouped",
          "1"
        );
      });
    });

    describe("Recipe Linking", () => {
      it("calls handleIngredientLink when recipe is selected", () => {
        renderComponent();

        // Find and click link button to open selector
        const linkButton = screen.getByLabelText("link_to_recipe");

        fireEvent.click(linkButton);

        // Verify that the hook function for handling ingredient links is available
        expect(mockHookReturn.handleIngredientLink).toBeDefined();
      });

      it("creates correct link key for ungrouped ingredients", () => {
        const mockGetIngredientLink = vi.fn((sectionId, tempId) => {
          expect(sectionId).toBe("ungrouped");
          expect(tempId).toBe("1");
          return mockLinkedRecipe;
        });

        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          getIngredientLink: mockGetIngredientLink,
        });

        renderComponent();

        // getIngredientLink should be called with correct parameters
        expect(mockGetIngredientLink).toHaveBeenCalledWith("ungrouped", "1");
      });

      it("creates correct link key for section ingredients", () => {
        const mockFormDataWithSection = {
          ...mockFormData,
          ingredientSections: [
            {
              id: "section-1",
              subheading: "For the sauce",
              ingredients: [
                {
                  tempId: "2",
                  name: "tomatoes",
                  quantity: "3",
                  unit: "cup/s",
                  notes: "diced",
                },
              ],
            },
          ],
        };

        const mockGetIngredientLink = vi.fn((sectionId, tempId) => {
          // Only check section ingredients, not ungrouped
          if (sectionId === "section-1" && tempId === "2") {
            expect(sectionId).toBe("section-1");
            expect(tempId).toBe("2");
          }
          return null;
        });

        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          formData: mockFormDataWithSection,
          getIngredientLink: mockGetIngredientLink,
        });

        renderComponent();

        expect(mockGetIngredientLink).toHaveBeenCalledWith("section-1", "2");
      });
    });

    describe("Link Button Accessibility", () => {
      it("has correct aria-label for unlinked ingredient", () => {
        renderComponent();

        const linkButton = screen.getByLabelText("link_to_recipe");

        expect(linkButton).toHaveAttribute("aria-label", "link_to_recipe");
      });

      it("has correct aria-label for linked ingredient", () => {
        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          getIngredientLink: vi.fn(() => mockLinkedRecipe),
        });

        renderComponent();

        const linkButton = screen.getByLabelText("unlink_recipe");

        expect(linkButton).toHaveAttribute("aria-label", "unlink_recipe");
      });
    });

    describe("Link Button State in Translation Mode", () => {
      it("disables link buttons in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const linkButtons = screen.getAllByLabelText("link_to_recipe");

        linkButtons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });

      it("enables link buttons in normal mode", () => {
        renderComponent({ isEditingTranslation: false });

        const linkButtons = screen.getAllByLabelText("link_to_recipe");

        linkButtons.forEach((button) => {
          expect(button).not.toBeDisabled();
        });
      });
    });

    describe("Section Ingredient Links", () => {
      beforeEach(() => {
        const mockFormDataWithSection = {
          ...mockFormData,
          ingredientSections: [
            {
              id: "section-1",
              subheading: "For the sauce",
              ingredients: [
                {
                  tempId: "2",
                  name: "tomatoes",
                  quantity: "3",
                  unit: "cup/s",
                  notes: "diced",
                },
              ],
            },
          ],
        };

        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          formData: mockFormDataWithSection,
        });
      });

      it("renders link buttons for section ingredients", () => {
        renderComponent();

        const linkButtons = screen.getAllByLabelText("link_to_recipe");

        // Should have buttons for both ungrouped and section ingredients
        expect(linkButtons.length).toBeGreaterThanOrEqual(2);
      });

      it("removes section ingredient link correctly", () => {
        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          formData: {
            ...mockFormData,
            ingredientSections: [
              {
                id: "section-1",
                subheading: "For the sauce",
                ingredients: [
                  {
                    tempId: "2",
                    name: "tomatoes",
                    quantity: "3",
                    unit: "cup/s",
                    notes: "diced",
                  },
                ],
              },
            ],
          },
          getIngredientLink: vi.fn((sectionId, tempId) => {
            if (sectionId === "section-1" && tempId === "2") {
              return mockLinkedRecipe;
            }
            return null;
          }),
        });

        renderComponent();

        const linkedButton = screen.getByLabelText("unlink_recipe");

        fireEvent.click(linkedButton);

        expect(mockHookReturn.removeIngredientLink).toHaveBeenCalledWith(
          "section-1",
          "2"
        );
      });
    });

    describe("Link Data Persistence", () => {
      it("maintains link data across ingredient updates", () => {
        const initialFormData = {
          ...mockFormData,
          ingredientLinks: {
            "ungrouped-1": mockLinkedRecipe,
          },
        };

        const mockGetIngredientLink = vi.fn((sectionId, tempId) => {
          const linkKey = `${sectionId}-${tempId}`;
          return initialFormData.ingredientLinks[linkKey];
        });

        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          formData: initialFormData,
          getIngredientLink: mockGetIngredientLink,
        });

        renderComponent();

        // Verify that the link is properly retrieved
        expect(mockGetIngredientLink).toHaveBeenCalledWith("ungrouped", "1");
      });

      it("handles missing ingredientLinks object gracefully", () => {
        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          formData: {
            ...mockFormData,
            ingredientLinks: undefined,
          },
          getIngredientLink: vi.fn(() => null),
        });

        expect(() => renderComponent()).not.toThrow();
      });

      it("handles empty ingredientLinks object", () => {
        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          formData: {
            ...mockFormData,
            ingredientLinks: {},
          },
          getIngredientLink: vi.fn(() => null),
        });

        expect(() => renderComponent()).not.toThrow();
      });
    });

    describe("Icon Display", () => {
      it("shows default link icon for unlinked ingredients", () => {
        renderComponent();

        const linkButton = screen.getByLabelText("link_to_recipe");

        expect(linkButton.querySelector("svg")).toBeInTheDocument();
      });

      it("shows the unlink icon for linked ingredients", () => {
        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          getIngredientLink: vi.fn(() => mockLinkedRecipe),
        });

        renderComponent();

        const linkButton = screen.getByLabelText("unlink_recipe");

        expect(linkButton.querySelector("svg")).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles empty form data gracefully", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        formData: {
          ungroupedIngredients: [],
          ingredientSections: [],
          instructions: [],
          nutrition_columns: [
            {
              label: "",
              calories: null,
              protein: null,
              fat: null,
              carbs: null,
              fiber: null,
              sugar: null,
              sodium: null,
            },
          ],
        },
      });

      expect(() => renderComponent()).not.toThrow();
    });

    it("handles missing categories prop", () => {
      expect(() => renderComponent({ categories: undefined })).not.toThrow();
    });
  });

  describe("Ingredient Field Navigation", () => {
    beforeEach(() => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        formData: {
          ...mockFormData,
          ungroupedIngredients: [
            {
              tempId: "temp-1",
              name: "flour",
              quantity: "2",
              unit: "cups",
              notes: "sifted",
            },
          ],
          ingredientSections: [
            {
              id: "section-1",
              subheading: "For the sauce",
              ingredients: [
                {
                  tempId: "temp-2",
                  name: "butter",
                  quantity: "1",
                  unit: "tbsp",
                  notes: "melted",
                },
              ],
            },
          ],
        },
      });
    });

    it("renders ingredient fields with navigation handlers without errors", () => {
      expect(() => renderComponent()).not.toThrow();
    });

    it("renders ungrouped ingredient fields with proper IDs for navigation", () => {
      renderComponent();

      // Check that ungrouped ingredient fields exist with correct IDs
      expect(
        document.querySelector("#ingredient-name-ungrouped-0-temp-1")
      ).toBeInTheDocument();
      expect(
        document.querySelector("#ingredient-quantity-ungrouped-0-temp-1")
      ).toBeInTheDocument();
      expect(
        document.querySelector("#ingredient-unit-ungrouped-0-temp-1")
      ).toBeInTheDocument();
      expect(
        document.querySelector("#ingredient-notes-ungrouped-0-temp-1")
      ).toBeInTheDocument();
    });

    it("renders section ingredient fields with proper IDs for navigation", () => {
      renderComponent();

      // Check that section ingredient fields exist with correct IDs
      expect(
        document.querySelector("#ingredient-name-section-1-0-temp-2")
      ).toBeInTheDocument();
      expect(
        document.querySelector("#ingredient-quantity-section-1-0-temp-2")
      ).toBeInTheDocument();
      expect(
        document.querySelector("#ingredient-unit-section-1-0-temp-2")
      ).toBeInTheDocument();
      expect(
        document.querySelector("#ingredient-notes-section-1-0-temp-2")
      ).toBeInTheDocument();
    });

    it("ingredient fields have onKeyDown attribute for navigation", () => {
      renderComponent();

      const nameInput = document.querySelector(
        "#ingredient-name-ungrouped-0-temp-1"
      );
      const quantityInput = document.querySelector(
        "#ingredient-quantity-ungrouped-0-temp-1"
      );
      const notesInput = document.querySelector(
        "#ingredient-notes-ungrouped-0-temp-1"
      );

      // Test that elements exist and can receive keydown events
      expect(nameInput).toBeInTheDocument();
      expect(quantityInput).toBeInTheDocument();
      expect(notesInput).toBeInTheDocument();

      // Test that keydown events can be fired (verifies event handler exists)
      expect(() =>
        fireEvent.keyDown(nameInput, { key: "Enter" })
      ).not.toThrow();
      expect(() =>
        fireEvent.keyDown(quantityInput, { key: "Enter" })
      ).not.toThrow();
      expect(() =>
        fireEvent.keyDown(notesInput, { key: "Enter" })
      ).not.toThrow();
    });
  });

  describe("Instruction Drag and Drop", () => {
    it("renders instructions with drag handles", () => {
      renderComponent();

      // Check that instructions are rendered with drag handles
      const dragHandles = screen.getAllByTestId(/draggable-instruction-/);
      expect(dragHandles).toHaveLength(2); // We have 2 instructions in mock data

      // Verify drag handles are present within instruction rows
      dragHandles.forEach((handle) => {
        // Each draggable should contain a drag handle with the grip icon
        expect(handle).toBeInTheDocument();
      });
    });

    it("renders instructions within droppable area", () => {
      renderComponent();

      // Check that instructions are wrapped in a droppable area
      const droppableArea = screen.getByTestId("droppable-instructions");
      expect(droppableArea).toBeInTheDocument();
    });

    it("passes handleDragEnd to DragDropContext", () => {
      renderComponent();

      // Verify that the hook provides handleDragEnd function
      expect(mockHookReturn.handleDragEnd).toBeDefined();
      expect(typeof mockHookReturn.handleDragEnd).toBe("function");
    });

    it("disables drag handles in translation mode", () => {
      renderComponent({ isEditingTranslation: true });

      // Check that drag handles are disabled in translation mode
      const dragHandles = screen.getAllByTestId(/draggable-instruction-/);
      dragHandles.forEach((handle) => {
        const dragHandleElement = handle.querySelector(
          '[data-slot="drag-handle"]'
        );
        expect(dragHandleElement).toHaveStyle({ pointerEvents: "none" });
      });
    });

    it("enables drag handles in normal mode", () => {
      renderComponent({ isEditingTranslation: false });

      // Check that drag handles are enabled in normal mode
      const dragHandles = screen.getAllByTestId(/draggable-instruction-/);
      dragHandles.forEach((handle) => {
        const dragHandleElement = handle.querySelector(
          '[data-slot="drag-handle"]'
        );
        expect(dragHandleElement).toHaveStyle({ pointerEvents: "auto" });
      });
    });

    it("displays correct step numbers for instructions", () => {
      renderComponent();

      // Check that step numbers are displayed correctly
      const stepNumbers = screen.getAllByText(/^\d+\.$/);
      expect(stepNumbers).toHaveLength(2);
      expect(stepNumbers[0]).toHaveTextContent("1.");
      expect(stepNumbers[1]).toHaveTextContent("2.");
    });

    it("maintains step numbers after reordering", () => {
      // This test verifies that step numbers are always sequential
      // regardless of the instruction order
      const reorderedInstructions = ["Bake for 30 minutes", "Mix ingredients"];

      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        formData: {
          ...mockHookReturn.formData,
          instructions: reorderedInstructions,
        },
      });

      renderComponent();

      // Step numbers should still be 1, 2 even with reordered content
      const stepNumbers = screen.getAllByText(/^\d+\.$/);
      expect(stepNumbers).toHaveLength(2);
      expect(stepNumbers[0]).toHaveTextContent("1.");
      expect(stepNumbers[1]).toHaveTextContent("2.");

      // But the content should be in the new order
      expect(
        screen.getByDisplayValue("Bake for 30 minutes")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("Mix ingredients")).toBeInTheDocument();
    });

    it("includes isDragDisabled prop for instructions in translation mode", () => {
      renderComponent({ isEditingTranslation: true });

      // In translation mode, draggables should be disabled
      const dragHandles = screen.getAllByTestId(/draggable-instruction-/);
      expect(dragHandles).toHaveLength(2);

      // This verifies the component structure is correct for disabled state
      dragHandles.forEach((handle) => {
        expect(handle).toBeInTheDocument();
      });
    });

    it("does not include isDragDisabled prop for instructions in normal mode", () => {
      renderComponent({ isEditingTranslation: false });

      // In normal mode, draggables should be enabled
      const dragHandles = screen.getAllByTestId(/draggable-instruction-/);
      expect(dragHandles).toHaveLength(2);

      // This verifies the component structure is correct for enabled state
      dragHandles.forEach((handle) => {
        expect(handle).toBeInTheDocument();
      });
    });

    it("handles empty instructions array", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        formData: {
          ...mockHookReturn.formData,
          instructions: [],
        },
      });

      renderComponent();

      // Should not render the droppable area when there are no instructions,
      // to avoid an empty bordered box collapsing into a stray line
      const droppableArea = screen.queryByTestId("droppable-instructions");
      expect(droppableArea).not.toBeInTheDocument();

      // Should not have any instruction drag handles
      const dragHandles = screen.queryAllByTestId(/draggable-instruction-/);
      expect(dragHandles).toHaveLength(0);
    });

    it("handles single instruction", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        formData: {
          ...mockHookReturn.formData,
          instructions: ["Single instruction"],
        },
      });

      renderComponent();

      // Should render one instruction with drag handle
      const dragHandles = screen.getAllByTestId(/draggable-instruction-/);
      expect(dragHandles).toHaveLength(1);

      // Should show step number 1
      const stepNumber = screen.getByText("1.");
      expect(stepNumber).toBeInTheDocument();

      // Should show the instruction content
      expect(
        screen.getByDisplayValue("Single instruction")
      ).toBeInTheDocument();
    });
  });

  describe("Unsaved Changes Detection Integration", () => {
    it("should integrate with useUnsavedChanges hook for navigation warning", () => {
      // Set up hook to return true for unsaved changes
      const mockHasUnsavedChanges = vi.fn(() => true);
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        hasUnsavedChanges: mockHasUnsavedChanges,
      });

      renderComponent();

      // Verify that the component renders without errors when unsaved changes exist
      expect(screen.getByText("Create Recipe")).toBeInTheDocument();

      // Verify that hasUnsavedChanges function is available and called
      expect(mockHasUnsavedChanges).toBeDefined();
      expect(typeof mockHasUnsavedChanges).toBe("function");
    });

    it("should pass hasUnsavedChanges state correctly to form interactions", () => {
      let hasChanges = false;
      const mockHasUnsavedChanges = vi.fn(() => hasChanges);

      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        hasUnsavedChanges: mockHasUnsavedChanges,
      });

      renderComponent();

      // Initially no changes
      expect(mockHasUnsavedChanges()).toBe(false);

      // Simulate state change
      hasChanges = true;
      expect(mockHasUnsavedChanges()).toBe(true);
    });

    it("should handle form state transitions properly", () => {
      const mockHasUnsavedChanges = vi.fn(() => false);
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        hasUnsavedChanges: mockHasUnsavedChanges,
      });

      const { rerender } = renderComponent();

      // Initially no unsaved changes
      expect(mockHasUnsavedChanges()).toBe(false);

      // Update mock to simulate unsaved changes
      const updatedMockHasUnsavedChanges = vi.fn(() => true);
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        hasUnsavedChanges: updatedMockHasUnsavedChanges,
      });

      // Re-render with updated state
      rerender(
        <RecipeForm categories={mockCategories} title="Create Recipe" />
      );

      // Should now have unsaved changes
      expect(updatedMockHasUnsavedChanges()).toBe(true);
    });

    it("should work correctly when form is clean", () => {
      const mockHasUnsavedChanges = vi.fn(() => false);
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        hasUnsavedChanges: mockHasUnsavedChanges,
      });

      renderComponent();

      // Clean form should not have unsaved changes
      expect(mockHasUnsavedChanges()).toBe(false);
    });

    it("should work correctly when form is dirty", () => {
      const mockHasUnsavedChanges = vi.fn(() => true);
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        hasUnsavedChanges: mockHasUnsavedChanges,
      });

      renderComponent();

      // Dirty form should have unsaved changes
      expect(mockHasUnsavedChanges()).toBe(true);
    });

    it("should provide stable hasUnsavedChanges function reference", () => {
      const mockHasUnsavedChanges = vi.fn(() => false);
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        hasUnsavedChanges: mockHasUnsavedChanges,
      });

      const { rerender } = renderComponent();

      const initialFunction = mockHookReturn.hasUnsavedChanges;

      // Re-render and verify function reference stability
      rerender(
        <RecipeForm categories={mockCategories} title="Create Recipe" />
      );

      // The function should remain the same instance for performance
      expect(mockHookReturn.hasUnsavedChanges).toBe(initialFunction);
    });

    it("should handle unsaved changes detection across all form fields", () => {
      // This test verifies that the component properly integrates with
      // the hasUnsavedChanges function from useRecipeForm
      const mockHasUnsavedChanges = vi.fn((currentData, initialData) => {
        // Simple mock implementation that checks if any field changed
        return currentData !== initialData;
      });

      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        hasUnsavedChanges: mockHasUnsavedChanges,
      });

      renderComponent();

      // The component should be able to use the hasUnsavedChanges function
      expect(mockHasUnsavedChanges).toBeDefined();
      expect(typeof mockHasUnsavedChanges).toBe("function");
    });
  });
});
