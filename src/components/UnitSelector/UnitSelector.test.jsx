import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import UnitSelector from "./UnitSelector";

// Mock i18next
const mockUnits = [
  { value: "", label: "Unit", pluralize: true },
  { value: "tsp", label: "tsp", pluralize: true },
  { value: "tbsp", label: "tbsp", pluralize: true },
  { value: "cup/s", label: "cup/s", pluralize: true },
  { value: "ml", label: "ml", pluralize: false },
  { value: "g", label: "g", pluralize: false },
];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: vi.fn((key) => {
      if (key === "units") return mockUnits;
      if (key === "unit") return "Unit";
      return key;
    }),
  }),
}));

// Mock useClickOutside hook
vi.mock("../../hooks/ui/useClickOutside", () => ({
  default: (callback) => {
    return { current: null };
  },
}));

describe("UnitSelector", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    id: "test-unit-selector",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders with placeholder", () => {
    render(<UnitSelector {...defaultProps} />);

    expect(screen.getByPlaceholderText("Unit")).toBeInTheDocument();
  });

  test("displays current unit value", () => {
    render(<UnitSelector {...defaultProps} value="tsp" />);

    expect(screen.getByDisplayValue("tsp")).toBeInTheDocument();
  });

  test("opens dropdown when input is focused", () => {
    render(<UnitSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText("Unit");
    fireEvent.focus(input);

    expect(screen.getByText("Unit")).toBeInTheDocument();
    expect(screen.getByText("tsp")).toBeInTheDocument();
    expect(screen.getByText("tbsp")).toBeInTheDocument();
    expect(screen.getByText("cup/s")).toBeInTheDocument();
  });

  test("filters units when typing", async () => {
    render(<UnitSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText("Unit");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "cup" } });

    await waitFor(() => {
      expect(screen.getByText("cup/s")).toBeInTheDocument();
      expect(screen.queryByText("tsp")).not.toBeInTheDocument();
      expect(screen.queryByText("tbsp")).not.toBeInTheDocument();
    });
  });

  test("calls onChange when unit is selected", () => {
    const mockOnChange = vi.fn();
    render(<UnitSelector {...defaultProps} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText("Unit");
    fireEvent.focus(input);

    const tspOption = screen.getByText("tsp");
    fireEvent.click(tspOption);

    expect(mockOnChange).toHaveBeenCalledWith("tsp");
  });

  test("handles keyboard navigation", () => {
    render(<UnitSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText("Unit");
    fireEvent.focus(input);

    // Arrow down should highlight first option
    fireEvent.keyDown(input, { key: "ArrowDown" });

    // Enter should select selected option
    fireEvent.keyDown(input, { key: "Enter" });

    expect(defaultProps.onChange).toHaveBeenCalledWith("");
  });

  test("closes dropdown on escape", () => {
    render(<UnitSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText("Unit");
    fireEvent.focus(input);

    expect(screen.getByText("tsp")).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByText("tsp")).not.toBeInTheDocument();
  });

  test("shows 'No units found' when filter returns no results", async () => {
    render(<UnitSelector {...defaultProps} />);

    const input = screen.getByPlaceholderText("Unit");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "xyz" } });

    await waitFor(() => {
      expect(screen.getByText("No units found")).toBeInTheDocument();
    });
  });

  test("highlights selected unit in dropdown", () => {
    render(<UnitSelector {...defaultProps} value="ml" />);

    const input = screen.getByDisplayValue("ml");
    fireEvent.focus(input);

    const mlOption = screen.getByText("ml");
    expect(mlOption).toHaveClass("selected");
  });

  test("displays correct unit label for value", () => {
    render(<UnitSelector {...defaultProps} value="cup/s" />);

    // Should display the label "cup/s" for value "cup/s"
    expect(screen.getByDisplayValue("cup/s")).toBeInTheDocument();
  });
});
