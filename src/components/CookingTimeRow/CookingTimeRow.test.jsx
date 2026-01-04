import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CookingTimeRow from "./CookingTimeRow";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: {
      language: "en",
    },
  }),
}));

describe("CookingTimeRow", () => {
  const mockItem = {
    id: 1,
    tempId: "temp-123",
    ingredient_name: "Brown Rice",
    cooking_time: 45,
    soaking_time: 30,
    dry_weight: 100,
    cooked_weight: 300,
    notes: "Simmer covered until tender",
  };

  const defaultProps = {
    item: mockItem,
    index: 0,
    sectionId: "section-1",
    isEditMode: false,
    provided: null,
    snapshot: null,
    handleItemChange: vi.fn(),
    handleItemFieldEnter: vi.fn(),
    removeItem: vi.fn(),
  };

  describe("View Mode", () => {
    it("should display ingredient name", () => {
      render(<CookingTimeRow {...defaultProps} />);
      expect(screen.getByText("Brown Rice")).toBeInTheDocument();
    });

    it("should display cooking time and soaking time", () => {
      render(<CookingTimeRow {...defaultProps} />);
      expect(screen.getByText(/45 min cook/)).toBeInTheDocument();
      expect(screen.getByText(/30 h soak/)).toBeInTheDocument();
    });

    it("should display weight conversion with ratio", () => {
      render(<CookingTimeRow {...defaultProps} />);
      const weightText = screen.getByText(/100g dry → 300g cooked \(×3\)/);
      expect(weightText).toBeInTheDocument();
    });

    it("should display notes when present", () => {
      render(<CookingTimeRow {...defaultProps} />);
      expect(
        screen.getByText("Simmer covered until tender")
      ).toBeInTheDocument();
    });

    it("should not display soaking time when not provided", () => {
      const itemWithoutSoaking = { ...mockItem, soaking_time: 0 };
      render(<CookingTimeRow {...defaultProps} item={itemWithoutSoaking} />);

      expect(screen.queryByText(/soak/)).not.toBeInTheDocument();
      expect(screen.getByText(/45 min cook/)).toBeInTheDocument();
    });

    it("should not display notes when not provided", () => {
      const itemWithoutNotes = { ...mockItem, notes: null };
      render(<CookingTimeRow {...defaultProps} item={itemWithoutNotes} />);

      expect(
        screen.queryByText("Simmer covered until tender")
      ).not.toBeInTheDocument();
    });

    it("should not show delete button in view mode", () => {
      render(<CookingTimeRow {...defaultProps} />);
      expect(screen.queryByLabelText("Delete")).not.toBeInTheDocument();
    });
  });

  describe("Edit Mode", () => {
    const editModeProps = {
      ...defaultProps,
      isEditMode: true,
      provided: {
        innerRef: vi.fn(),
        draggableProps: {},
        dragHandleProps: {},
      },
    };

    it("should show input fields for all editable properties", () => {
      render(<CookingTimeRow {...editModeProps} />);

      expect(screen.getByPlaceholderText("Ingredient name")).toHaveValue(
        "Brown Rice"
      );
      expect(screen.getByPlaceholderText("Cooking (min)")).toHaveValue("45");
      expect(screen.getByPlaceholderText("Soaking (hrs)")).toHaveValue("30");
      expect(screen.getByPlaceholderText("Dry weight (g)")).toHaveValue(100);
      expect(screen.getByPlaceholderText("Cooked weight (g)")).toHaveValue(300);
      expect(screen.getByPlaceholderText("Optional notes")).toHaveValue(
        "Simmer covered until tender"
      );
    });

    it("should call handleItemChange when ingredient name is updated", () => {
      const handleItemChange = vi.fn();
      render(
        <CookingTimeRow
          {...editModeProps}
          handleItemChange={handleItemChange}
        />
      );

      const ingredientInput = screen.getByPlaceholderText("Ingredient name");
      fireEvent.change(ingredientInput, { target: { value: "White Rice" } });

      expect(handleItemChange).toHaveBeenCalledWith(
        "section-1",
        "temp-123",
        "ingredient_name",
        "White Rice"
      );
    });

    it("should call handleItemChange when cooking time is updated", () => {
      const handleItemChange = vi.fn();
      render(
        <CookingTimeRow
          {...editModeProps}
          handleItemChange={handleItemChange}
        />
      );

      const cookingTimeInput = screen.getByPlaceholderText("Cooking (min)");
      fireEvent.change(cookingTimeInput, { target: { value: "50" } });

      expect(handleItemChange).toHaveBeenCalledWith(
        "section-1",
        "temp-123",
        "cooking_time",
        "50"
      );
    });

    it("should call handleItemChange when soaking time is updated", () => {
      const handleItemChange = vi.fn();
      render(
        <CookingTimeRow
          {...editModeProps}
          handleItemChange={handleItemChange}
        />
      );

      const soakingTimeInput = screen.getByPlaceholderText("Soaking (hrs)");
      fireEvent.change(soakingTimeInput, { target: { value: "60" } });

      expect(handleItemChange).toHaveBeenCalledWith(
        "section-1",
        "temp-123",
        "soaking_time",
        "60"
      );
    });

    it("should call handleItemChange when notes are updated", () => {
      const handleItemChange = vi.fn();
      render(
        <CookingTimeRow
          {...editModeProps}
          handleItemChange={handleItemChange}
        />
      );

      const notesInput = screen.getByPlaceholderText("Optional notes");
      fireEvent.change(notesInput, { target: { value: "New cooking note" } });

      expect(handleItemChange).toHaveBeenCalledWith(
        "section-1",
        "temp-123",
        "notes",
        "New cooking note"
      );
    });

    it("should show delete button in edit mode", () => {
      render(<CookingTimeRow {...editModeProps} />);
      const deleteButton = screen.getByLabelText("Delete");
      expect(deleteButton).toBeInTheDocument();
    });

    it("should call removeItem when delete button is clicked", () => {
      const removeItem = vi.fn();
      render(<CookingTimeRow {...editModeProps} removeItem={removeItem} />);

      const deleteButton = screen.getByLabelText("Delete");
      fireEvent.click(deleteButton);

      expect(removeItem).toHaveBeenCalledWith("section-1", "temp-123");
    });

    it("should handle empty values in edit mode", () => {
      const emptyItem = {
        id: 2,
        tempId: "temp-456",
        ingredient_name: "",
        cooking_time: "",
        soaking_time: "",
        dry_weight: 0,
        cooked_weight: 0,
        notes: "",
      };

      render(<CookingTimeRow {...editModeProps} item={emptyItem} />);

      expect(screen.getByPlaceholderText("Ingredient name")).toHaveValue("");
      expect(screen.getByPlaceholderText("Cooking (min)")).toHaveValue("");
      expect(screen.getByPlaceholderText("Soaking (hrs)")).toHaveValue("");
      expect(screen.getByPlaceholderText("Dry weight (g)")).toHaveValue(null);
      expect(screen.getByPlaceholderText("Cooked weight (g)")).toHaveValue(
        null
      );
    });
  });

  describe("Keyboard Navigation", () => {
    it("should call handleItemFieldEnter when Enter is pressed on ingredient name", () => {
      const handleItemFieldEnter = vi.fn();
      render(
        <CookingTimeRow
          {...defaultProps}
          isEditMode={true}
          provided={{
            innerRef: vi.fn(),
            draggableProps: {},
            dragHandleProps: {},
          }}
          handleItemFieldEnter={handleItemFieldEnter}
        />
      );

      const ingredientInput = screen.getByPlaceholderText("Ingredient name");
      fireEvent.keyDown(ingredientInput, { key: "Enter", code: "Enter" });

      expect(handleItemFieldEnter).toHaveBeenCalled();
    });
  });

  describe("Time Formatting", () => {
    it("should format cooking time in minutes and soaking time in hours", () => {
      const itemWithLargeTimes = {
        ...mockItem,
        cooking_time: 120,
        soaking_time: 8,
      };
      render(<CookingTimeRow {...defaultProps} item={itemWithLargeTimes} />);

      expect(screen.getByText(/120 min cook/)).toBeInTheDocument();
      expect(screen.getByText(/8 h soak/)).toBeInTheDocument();
    });

    it("should handle zero cooking time", () => {
      const itemWithZeroCooking = {
        ...mockItem,
        cooking_time: 0,
        dry_weight: 0,
        cooked_weight: 0,
      };
      render(<CookingTimeRow {...defaultProps} item={itemWithZeroCooking} />);

      // Should not display cooking time but should display soaking time
      expect(screen.queryByText(/45 min cook/)).not.toBeInTheDocument();
      expect(screen.getByText(/30 h soak/)).toBeInTheDocument();
    });

    it("should format numeric ranges with appropriate units", () => {
      const itemWithRange = {
        ...mockItem,
        cooking_time: "40-50",
        soaking_time: "8-12",
      };
      render(<CookingTimeRow {...defaultProps} item={itemWithRange} />);

      expect(screen.getByText(/40-50 min cook/)).toBeInTheDocument();
      expect(screen.getByText(/8-12 h soak/)).toBeInTheDocument();
    });

    it("should display text values as-is without modification", () => {
      const itemWithText = {
        ...mockItem,
        cooking_time: "until tender",
        soaking_time: "overnight",
      };
      render(<CookingTimeRow {...defaultProps} item={itemWithText} />);

      expect(screen.getByText(/until tender cook/)).toBeInTheDocument();
      expect(screen.getByText(/overnight soak/)).toBeInTheDocument();
    });
  });

  describe("Weight Ratio Calculation", () => {
    it("should display correct ratio for 1:3 conversion", () => {
      render(<CookingTimeRow {...defaultProps} />);
      expect(screen.getByText(/×3\)/)).toBeInTheDocument();
    });

    it("should handle decimal ratios without trailing zeros", () => {
      const itemWithDecimal = {
        ...mockItem,
        dry_weight: 100,
        cooked_weight: 250,
      };
      render(<CookingTimeRow {...defaultProps} item={itemWithDecimal} />);

      expect(screen.getByText(/×2\.5\)/)).toBeInTheDocument();
    });

    it("should not display weight info when weights are missing", () => {
      const itemWithoutWeights = {
        ...mockItem,
        dry_weight: 0,
        cooked_weight: 0,
      };
      render(<CookingTimeRow {...defaultProps} item={itemWithoutWeights} />);

      expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    });
  });

  describe("Drag and Drop Styling", () => {
    it("should apply dragging class when being dragged", () => {
      const snapshot = { isDragging: true };
      const provided = {
        innerRef: vi.fn(),
        draggableProps: {},
        dragHandleProps: {},
      };

      const { container } = render(
        <CookingTimeRow
          {...defaultProps}
          isEditMode={true}
          provided={provided}
          snapshot={snapshot}
        />
      );

      const rowElement = container.querySelector(".dragging");
      expect(rowElement).toBeInTheDocument();
    });
  });
});
