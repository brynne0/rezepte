import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import GroceryList from "./GroceryList";
import { useGroceryList } from "../../hooks/data/useGroceryList";

// Mock dependencies
vi.mock("../../hooks/data/useGroceryList");

vi.mock("../../services/userService", () => ({
  getUserPreferredLanguage: vi.fn(),
}));

vi.mock("../../services/groceryListService", () => ({
  normaliseIngredientName: (name) => name, // Simple mock for testing
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => {
      if (key === "units") {
        return [
          { value: "", label: "unit" },
          { value: "tsp", label: "tsp" },
          { value: "tbsp", label: "tbsp" },
          { value: "cup/s", label: "cup/s" },
          { value: "ml", label: "ml" },
          { value: "l", label: "l" },
          { value: "g", label: "g" },
          { value: "kg", label: "kg" },
          { value: "can/s", label: "can/s" },
          { value: "piece/s", label: "piece/s" },
        ];
      }
      return key;
    },
  }),
}));

vi.mock("../../components/LoadingAcorn/LoadingAcorn", () => ({
  default: () => <div data-testid="loading-acorn">Loading...</div>,
}));

vi.mock("../../components/ConfirmationModal/ConfirmationModal", () => ({
  default: ({ isOpen, onClose, onConfirm, message, confirmText }) =>
    isOpen ? (
      <div role="dialog" aria-modal="true">
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmText}</button>
        <button onClick={onClose}>cancel</button>
      </div>
    ) : null,
}));

describe("GroceryList", () => {
  let mockUpdateGroceryList;
  let mockClearGroceryList;
  let mockSetIsEditing;

  const initialGroceryList = [
    { id: 1, name: "Apples", quantity: 2, unit: "kg" },
    { id: 2, name: "Bananas", quantity: 5, unit: "piece/s" },
  ];

  // Helper function to set up the component for tests
  const setup = (props = {}, list = initialGroceryList, loading = false) => {
    mockUpdateGroceryList = vi.fn();
    mockClearGroceryList = vi.fn();
    mockSetIsEditing = vi.fn();

    useGroceryList.mockReturnValue({
      groceryList: list,
      updateGroceryList: mockUpdateGroceryList,
      clearGroceryList: mockClearGroceryList,
      loading,
    });

    const defaultProps = {
      isEditing: false,
      setIsEditing: mockSetIsEditing,
      ...props,
    };

    render(
      <MemoryRouter>
        <GroceryList {...defaultProps} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading indicator when loading", () => {
    setup({}, [], true);
    expect(screen.getByTestId("loading-acorn")).toBeInTheDocument();
  });

  it("renders an empty list message when there are no items", () => {
    setup({}, []);
    expect(screen.getByText("grocery_list")).toBeInTheDocument();
    expect(screen.queryByText("Apples")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add_item/i })
    ).toBeInTheDocument();
  });

  it("renders grocery list items in view mode", () => {
    setup();
    expect(screen.getByText("Apples")).toBeInTheDocument();
    expect(screen.getByText("Bananas")).toBeInTheDocument();
    expect(screen.getByText(/2\s*kg/)).toBeInTheDocument();
    expect(screen.getByText(/5\s*pieces/)).toBeInTheDocument();
  });

  it("switches to edit mode and displays editable fields", () => {
    setup({ isEditing: true });

    expect(screen.getByDisplayValue("Apples")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("kg")).toBeInTheDocument();
    expect(screen.getByText("save")).toBeInTheDocument();
    expect(screen.getByText("cancel")).toBeInTheDocument();
  });

  it("allows item values to be changed", () => {
    setup({ isEditing: true });
    const nameInput = screen.getByDisplayValue("Apples");
    fireEvent.change(nameInput, { target: { value: "Green Apples" } });
    expect(nameInput.value).toBe("Green Apples");
  });

  it("saves changes when save button is clicked", () => {
    setup({ isEditing: true });
    const nameInput = screen.getByDisplayValue("Apples");
    fireEvent.change(nameInput, { target: { value: "Green Apples" } });

    const saveButton = screen.getByRole("button", { name: "save" });
    fireEvent.click(saveButton);

    expect(mockUpdateGroceryList).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: "Green Apples" }),
        expect.objectContaining({ name: "Bananas" }),
      ])
    );
    expect(mockSetIsEditing).toHaveBeenCalledWith(false);
  });

  it("cancels changes when cancel button is clicked", () => {
    setup({ isEditing: true });
    const nameInput = screen.getByDisplayValue("Apples");
    fireEvent.change(nameInput, { target: { value: "Green Apples" } });

    const cancelButton = screen.getByRole("button", { name: "cancel" });
    fireEvent.click(cancelButton);

    expect(mockUpdateGroceryList).not.toHaveBeenCalled();
    expect(mockSetIsEditing).toHaveBeenCalledWith(false);
  });

  it("adds a new item when add button is clicked", () => {
    setup({ isEditing: true });
    const addButton = screen.getByRole("button", { name: "add_item" });
    fireEvent.click(addButton);

    const newItemInputs = screen.getAllByPlaceholderText("item_name");
    const newItemNameInput = newItemInputs[newItemInputs.length - 1];
    expect(newItemNameInput).toBeInTheDocument();
    expect(newItemNameInput.value).toBe("");
  });

  it("removes an item when remove button is clicked", () => {
    setup({ isEditing: true });
    const removeButtons = screen.getAllByRole("button", {
      name: /remove_item/i,
    });
    fireEvent.click(removeButtons[0]); // Remove "Apples"

    expect(screen.queryByDisplayValue("Apples")).not.toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: "save" });
    fireEvent.click(saveButton);

    expect(mockUpdateGroceryList).toHaveBeenCalledWith([
      expect.objectContaining({ name: "Bananas" }),
    ]);
  });

  it("clears the entire list via confirmation modal", async () => {
    setup({ isEditing: true });
    const clearListButton = screen.getByRole("button", {
      name: /clear_list/i,
    });
    fireEvent.click(clearListButton);

    const modal = await screen.findByRole("dialog");
    expect(modal).toBeInTheDocument();
    expect(
      within(modal).getByText("grocery_list_clear_confirmation")
    ).toBeInTheDocument();

    const confirmButton = within(modal).getByRole("button", {
      name: /clear_list/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockClearGroceryList).toHaveBeenCalled();
    });
  });

  it("toggles item checked state on click", () => {
    setup();
    const appleItem = screen.getByText("Apples");
    const checkbox = appleItem.previousElementSibling;

    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
