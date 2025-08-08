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
          { value: "cup", label: "cup" },
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
    category: "desserts",
    servings: 4,
    ungroupedIngredients: [
      { tempId: "1", name: "flour", quantity: "2", unit: "cup", notes: "" },
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
    // handleTitleBlur: vi.fn(),
    // handleIngredientChange: vi.fn(),
    // handleSectionChange: vi.fn(),
    // handleInstructionChange: vi.fn(),
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
        "category",
        "main-dishes",
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

      expect(mockHookReturn.toTitleCase).toHaveBeenCalledWith("New Title");
      expect(mockHookReturn.handleInputChange).toHaveBeenCalled();
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
                unit: "cup",
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
                unit: "cup",
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
                unit: "cup",
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

      const submitButton = screen.getByRole("button", { name: /Creating.../ });
      expect(submitButton).toBeDisabled();
    });

    it("shows loading text on submit button", () => {
      useRecipeForm.mockReturnValue({
        ...mockHookReturn,
        loading: true,
        isEditMode: true,
      });

      renderComponent();

      expect(screen.getByText("Updating...")).toBeInTheDocument();
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
