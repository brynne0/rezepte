import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import Selector from "./Selector";

// Mock i18next
const mockUnits = [
  { value: "", label: "Unit" },
  { value: "tsp", label: "tsp" },
  { value: "tbsp", label: "tbsp" },
  { value: "cup/s", label: "cup/s" },
  { value: "ml", label: "ml" },
  { value: "g", label: "g" },
];

const mockCategories = [
  { value: "all", label: "All" },
  { value: "appetizers", label: "Appetizers" },
  { value: "mains", label: "Main Dishes" },
  { value: "desserts", label: "Desserts" },
];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: vi.fn((key) => {
      if (key === "units") return mockUnits;
      if (key === "unit") return "Unit";
      if (key === "select_category") return "Select category";
      if (key === "select_option") return "Select option";
      return key;
    }),
  }),
}));

// Mock useClickOutside hook
vi.mock("../../hooks/ui/useClickOutside", () => ({
  default: () => {
    return { current: null };
  },
}));

describe("Selector", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    id: "test-selector",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Unit Selector", () => {
    test("renders with unit placeholder", () => {
      render(<Selector {...defaultProps} type="unit" />);
      expect(screen.getByPlaceholderText("Unit")).toBeInTheDocument();
    });

    test("displays current unit value", () => {
      render(<Selector {...defaultProps} value="tsp" type="unit" />);
      expect(screen.getByDisplayValue("tsp")).toBeInTheDocument();
    });

    test("opens dropdown with unit options when focused", () => {
      render(<Selector {...defaultProps} type="unit" />);

      const input = screen.getByPlaceholderText("Unit");
      fireEvent.focus(input);

      expect(screen.getByText("Unit")).toBeInTheDocument();
      expect(screen.getByText("tsp")).toBeInTheDocument();
      expect(screen.getByText("tbsp")).toBeInTheDocument();
      expect(screen.getByText("cup/s")).toBeInTheDocument();
    });

    test("calls onChange when unit is selected", () => {
      const mockOnChange = vi.fn();
      render(
        <Selector {...defaultProps} onChange={mockOnChange} type="unit" />
      );

      const input = screen.getByPlaceholderText("Unit");
      fireEvent.focus(input);

      const tspOption = screen.getByText("tsp");
      fireEvent.click(tspOption);

      expect(mockOnChange).toHaveBeenCalledWith("tsp");
    });
  });

  describe("Category Selector", () => {
    test("renders with category placeholder", () => {
      render(
        <Selector {...defaultProps} type="category" options={mockCategories} />
      );
      expect(
        screen.getByPlaceholderText("Select category")
      ).toBeInTheDocument();
    });

    test("filters out 'all' category", () => {
      render(
        <Selector {...defaultProps} type="category" options={mockCategories} />
      );

      const input = screen.getByPlaceholderText("Select category");
      fireEvent.focus(input);

      expect(screen.queryByText("All")).not.toBeInTheDocument();
      expect(screen.getByText("Appetizers")).toBeInTheDocument();
      expect(screen.getByText("Main Dishes")).toBeInTheDocument();
      expect(screen.getByText("Desserts")).toBeInTheDocument();
    });

    test("displays current category value", () => {
      render(
        <Selector
          {...defaultProps}
          value="desserts"
          type="category"
          options={mockCategories}
        />
      );
      expect(screen.getByDisplayValue("Desserts")).toBeInTheDocument();
    });

    test("calls onChange when category is selected", () => {
      const mockOnChange = vi.fn();
      render(
        <Selector
          {...defaultProps}
          onChange={mockOnChange}
          type="category"
          options={mockCategories}
        />
      );

      const input = screen.getByPlaceholderText("Select category");
      fireEvent.focus(input);

      const dessertsOption = screen.getByText("Desserts");
      fireEvent.click(dessertsOption);

      expect(mockOnChange).toHaveBeenCalledWith("desserts");
    });
  });

  describe("Generic Selector", () => {
    const customOptions = [
      { value: "option1", label: "Option 1" },
      { value: "option2", label: "Option 2" },
    ];

    test("works with custom options", () => {
      render(
        <Selector
          {...defaultProps}
          options={customOptions}
          placeholder="Choose option"
        />
      );

      const input = screen.getByPlaceholderText("Choose option");
      fireEvent.focus(input);

      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    test("filters options when typing", async () => {
      render(<Selector {...defaultProps} type="unit" />);

      const input = screen.getByPlaceholderText("Unit");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "cup" } });

      await waitFor(() => {
        expect(screen.getByText("cup/s")).toBeInTheDocument();
        expect(screen.queryByText("tsp")).not.toBeInTheDocument();
        expect(screen.queryByText("tbsp")).not.toBeInTheDocument();
      });
    });

    test("handles keyboard navigation", () => {
      render(<Selector {...defaultProps} type="unit" />);

      const input = screen.getByPlaceholderText("Unit");
      fireEvent.focus(input);

      // Arrow down should highlight first option
      fireEvent.keyDown(input, { key: "ArrowDown" });

      // Enter should select selected option
      fireEvent.keyDown(input, { key: "Enter" });

      expect(defaultProps.onChange).toHaveBeenCalledWith("");
    });

    test("closes dropdown on escape", () => {
      render(<Selector {...defaultProps} type="unit" />);

      const input = screen.getByPlaceholderText("Unit");
      fireEvent.focus(input);

      expect(screen.getByText("tsp")).toBeInTheDocument();

      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByText("tsp")).not.toBeInTheDocument();
    });

    test("highlights selected option in dropdown", () => {
      render(<Selector {...defaultProps} value="ml" type="unit" />);

      const input = screen.getByDisplayValue("ml");
      fireEvent.focus(input);

      const mlOption = screen.getByText("ml");
      expect(mlOption).toHaveClass("selected");
    });
  });
});
