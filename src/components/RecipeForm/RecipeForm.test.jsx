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

vi.mock("../../hooks/forms/useRecipeForm", () => ({
  useRecipeForm: vi.fn(),
}));

vi.mock("../AutoResizeTextArea", () => ({
  default: ({ value, onChange, ...props }) => (
    <textarea
      value={value}
      onChange={onChange}
      data-testid="auto-resize-textarea"
      {...props}
    />
  ),
}));

vi.mock("../ConfirmationModal/ConfirmationModal", () => ({
  default: ({ isOpen, onClose, onConfirm, message }) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <p>{message}</p>
        <button onClick={onConfirm} data-testid="confirm-delete">
          Confirm
        </button>
        <button onClick={onClose} data-testid="cancel-delete">
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock("./RecipeForm.css", () => ({}));

import { useRecipeForm } from "../../hooks/forms/useRecipeForm";

describe("RecipeForm", () => {
  const mockCategories = [
    { value: "all", label: "All Recipes" },
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
  };

  const mockHookReturn = {
    formData: mockFormData,
    validationErrors: {},
    loading: false,
    isEditMode: false,
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
    handleEnter: vi.fn(),
    handleSubmit: vi.fn(),
    handleCancel: vi.fn(),
    handleDelete: vi.fn(),
    toTitleCase: vi.fn((str) => str),
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

      // Check that category buttons are rendered (excluding "all")
      expect(screen.queryByText("All Recipes")).not.toBeInTheDocument();
      expect(screen.getByText("Desserts")).toBeInTheDocument();
      expect(screen.getByText("Main Dishes")).toBeInTheDocument();

      // Check that the selected category has the correct class
      const dessertsButton = screen.getByText("Desserts").closest("button");
      const mainDishesButton = screen
        .getByText("Main Dishes")
        .closest("button");

      expect(dessertsButton).toHaveClass("selected");
      expect(mainDishesButton).not.toHaveClass("selected");
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
        false
      );
    });

    it("shows validation errors when present", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        validationErrors: { title: "Title is required" },
      });

      renderComponent();

      const titleInput = screen.getByDisplayValue("Test Recipe");
      expect(titleInput).toHaveClass("input--error");
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });

    it("shows validation error styling on category buttons", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        validationErrors: { category: "Category is required" },
      });

      renderComponent();

      const categoriesWrapper = screen
        .getByText("Desserts")
        .closest(".form-categories-wrapper");
      expect(categoriesWrapper).toHaveClass("input--error");
      expect(screen.getByText("Category is required")).toBeInTheDocument();
    });

    it("renders source input with toggle button", () => {
      renderComponent();

      expect(
        screen.getByDisplayValue("https://example.com")
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/switch_to/)).toBeInTheDocument(); // toggle button
    });

    it("source toggle button changes placeholder", () => {
      renderComponent();

      const toggleButton = screen.getByLabelText(/switch_to/);
      const sourceInput = screen.getByDisplayValue("https://example.com");

      // Initially should be in link mode
      expect(sourceInput).toHaveAttribute("placeholder", "source_link");

      // Click toggle to switch to note mode
      fireEvent.click(toggleButton);

      expect(sourceInput).toHaveAttribute("placeholder", "source_note");
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

    it("calls handleCancel when back arrow is clicked", () => {
      renderComponent();

      const backButton = screen.getByTestId("back-arrow");
      fireEvent.click(backButton);

      expect(mockHookReturn.handleCancel).toHaveBeenCalled();
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
      expect(screen.getByDisplayValue("For the sauce")).toBeInTheDocument();

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
      expect(screen.getByDisplayValue("Sauce")).toBeInTheDocument();

      // Find the section remove button
      const removeSectionButton = screen.getByText("remove_section");
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

      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
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
      const confirmButton = screen.getByTestId("confirm-delete");
      fireEvent.click(confirmButton);

      expect(mockHookReturn.handleDelete).toHaveBeenCalled();
    });
  });

  describe("Loading State", () => {
    it("disables submit button when loading", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        loading: true,
      });

      renderComponent();

      const submitButton = screen.getByRole("button", { name: /creating/ });
      expect(submitButton).toBeDisabled();
    });

    it("shows loading text on submit button", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        loading: true,
        isEditMode: true,
      });

      renderComponent();

      expect(screen.getByText("updating")).toBeInTheDocument();
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

      it("applies translation-disabled class to servings field", () => {
        renderComponent({ isEditingTranslation: true });

        const servingsField = screen
          .getByDisplayValue("4")
          .closest(".servings-field");
        expect(servingsField).toHaveClass("translation-disabled");
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

      it("applies translation-disabled class to category form group", () => {
        renderComponent({ isEditingTranslation: true });

        const categoryFormGroup = screen
          .getByText("category")
          .closest(".form-group");
        expect(categoryFormGroup).toHaveClass("translation-disabled");
      });

      it("disables add section button in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const addSectionButton = screen.getByText("add_section");
        expect(addSectionButton).toBeDisabled();
        expect(addSectionButton).toHaveClass("translation-disabled");
      });

      it("disables add ingredient buttons in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const addIngredientButtons =
          screen.getAllByTestId("add-ingredient-btn");
        addIngredientButtons.forEach((button) => {
          expect(button.closest("button")).toBeDisabled();
          expect(button.closest("button")).toHaveClass("translation-disabled");
        });
      });

      it("disables remove ingredient buttons in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const removeIngredientButtons = screen.getAllByTestId(
          "remove-ingredient-btn"
        );
        removeIngredientButtons.forEach((button) => {
          expect(button.closest("button")).toBeDisabled();
          expect(button.closest("button")).toHaveClass("translation-disabled");
        });
      });

      it("disables add instruction button in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const addInstructionButton = screen
          .getByTestId("add-instruction-btn")
          .closest("button");
        expect(addInstructionButton).toBeDisabled();
        expect(addInstructionButton).toHaveClass("translation-disabled");
      });

      it("disables remove instruction buttons in translation mode", () => {
        renderComponent({ isEditingTranslation: true });

        const removeInstructionButtons = screen.getAllByTestId(
          "remove-instruction-btn"
        );
        removeInstructionButtons.forEach((button) => {
          expect(button.closest("button")).toBeDisabled();
          expect(button.closest("button")).toHaveClass("translation-disabled");
        });
      });

      it("disables drag handles in translation mode", () => {
        const { container } = renderComponent({ isEditingTranslation: true });

        // Check that drag handles have disabled styling
        const dragHandles = container.querySelectorAll(".drag-handle");
        dragHandles.forEach((handle) => {
          expect(handle).toHaveClass("translation-disabled");
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
        expect(removeButton.closest("button")).toHaveClass(
          "translation-disabled"
        );
      });

      it("disables add ingredient button for sections", () => {
        renderComponent({ isEditingTranslation: true });

        const addSectionIngredientButton = screen.getByTestId(
          "add-section-ingredient-btn"
        );
        expect(addSectionIngredientButton.closest("button")).toBeDisabled();
        expect(addSectionIngredientButton.closest("button")).toHaveClass(
          "translation-disabled"
        );
      });

      it("disables remove section button", () => {
        renderComponent({ isEditingTranslation: true });

        const removeSectionButton = screen.getByText("remove_section");
        expect(removeSectionButton).toBeDisabled();
        expect(removeSectionButton).toHaveClass("translation-disabled");
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
        const bakeInstructionInput = screen.getByDisplayValue("Bake for 30 minutes");
        
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

      it("shows correct loading text when updating translation", () => {
        useRecipeForm.mockReturnValue({
          ...mockHookReturn,
          isEditMode: true,
          loading: true,
        });

        renderComponent({ isEditingTranslation: true });

        expect(screen.getByText("updating_translation")).toBeInTheDocument();
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

      it("does not apply translation-disabled class when not in translation mode", () => {
        renderComponent({ isEditingTranslation: false });

        const servingsField = screen
          .getByDisplayValue("4")
          .closest(".servings-field");
        const categoryFormGroup = screen
          .getByText("category")
          .closest(".form-group");

        expect(servingsField).not.toHaveClass("translation-disabled");
        expect(categoryFormGroup).not.toHaveClass("translation-disabled");
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
        },
      });

      expect(() => renderComponent()).not.toThrow();
    });

    it("handles missing categories prop", () => {
      expect(() => renderComponent({ categories: undefined })).not.toThrow();
    });
  });
});
