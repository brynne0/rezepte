import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import { useTranslation } from "react-i18next";
import SortButtons from "./SortButtons";
import "@testing-library/jest-dom";

vi.mock("react-i18next");

describe("SortButtons Component", () => {
  const mockOnSortChange = vi.fn();
  const mockT = vi.fn((key) => key);

  const defaultProps = {
    sortBy: "created_at_desc",
    onSortChange: mockOnSortChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useTranslation.mockReturnValue({
      t: mockT,
    });
  });

  test("renders both sort buttons", () => {
    render(<SortButtons {...defaultProps} />);

    expect(screen.getByLabelText("sort_by_title")).toBeInTheDocument();
    expect(screen.getByLabelText("sort_by_date")).toBeInTheDocument();
  });

  test("shows correct active state for date sorting", () => {
    render(<SortButtons {...defaultProps} sortBy="created_at_desc" />);

    const dateButton = screen.getByLabelText("sort_by_date");
    const titleButton = screen.getByLabelText("sort_by_title");

    expect(dateButton).toHaveClass("selected");
    expect(titleButton).not.toHaveClass("selected");
  });

  test("shows correct active state for title sorting", () => {
    render(<SortButtons {...defaultProps} sortBy="title_asc" />);

    const titleButton = screen.getByLabelText("sort_by_title");
    const dateButton = screen.getByLabelText("sort_by_date");

    expect(titleButton).toHaveClass("selected");
    expect(dateButton).not.toHaveClass("selected");
  });

  test("handles title sort click - from unselected to asc", () => {
    render(<SortButtons {...defaultProps} sortBy="created_at_desc" />);

    const titleButton = screen.getByLabelText("sort_by_title");
    fireEvent.click(titleButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("title_asc");
  });

  test("handles title sort click - from asc to desc", () => {
    render(<SortButtons {...defaultProps} sortBy="title_asc" />);

    const titleButton = screen.getByLabelText("sort_by_title");
    fireEvent.click(titleButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("title_desc");
  });

  test("handles title sort click - from desc to asc", () => {
    render(<SortButtons {...defaultProps} sortBy="title_desc" />);

    const titleButton = screen.getByLabelText("sort_by_title");
    fireEvent.click(titleButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("title_asc");
  });

  test("handles date sort click - from desc to asc", () => {
    render(<SortButtons {...defaultProps} sortBy="created_at_desc" />);

    const dateButton = screen.getByLabelText("sort_by_date");
    fireEvent.click(dateButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("created_at_asc");
  });

  test("handles date sort click - from asc to desc", () => {
    render(<SortButtons {...defaultProps} sortBy="created_at_asc" />);

    const dateButton = screen.getByLabelText("sort_by_date");
    fireEvent.click(dateButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("created_at_desc");
  });

  test("handles date sort click - from unselected to desc", () => {
    render(<SortButtons {...defaultProps} sortBy="title_asc" />);

    const dateButton = screen.getByLabelText("sort_by_date");
    fireEvent.click(dateButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("created_at_desc");
  });

  test("renders correct icons for title sorting states", () => {
    const { rerender } = render(
      <SortButtons {...defaultProps} sortBy="title_asc" />
    );
    let titleButton = screen.getByLabelText("sort_by_title");
    expect(titleButton.querySelector("svg")).toBeInTheDocument();

    rerender(<SortButtons {...defaultProps} sortBy="title_desc" />);
    titleButton = screen.getByLabelText("sort_by_title");
    expect(titleButton.querySelector("svg")).toBeInTheDocument();

    rerender(<SortButtons {...defaultProps} sortBy="created_at_desc" />);
    titleButton = screen.getByLabelText("sort_by_title");
    expect(titleButton.querySelector("svg")).toBeInTheDocument();
  });

  test("renders correct icons for date sorting states", () => {
    const { rerender } = render(
      <SortButtons {...defaultProps} sortBy="created_at_asc" />
    );
    let dateButton = screen.getByLabelText("sort_by_date");
    expect(dateButton.querySelector("svg")).toBeInTheDocument();

    rerender(<SortButtons {...defaultProps} sortBy="created_at_desc" />);
    dateButton = screen.getByLabelText("sort_by_date");
    expect(dateButton.querySelector("svg")).toBeInTheDocument();

    rerender(<SortButtons {...defaultProps} sortBy="title_asc" />);
    dateButton = screen.getByLabelText("sort_by_date");
    expect(dateButton.querySelector("svg")).toBeInTheDocument();
  });

  test("buttons have correct accessibility attributes", () => {
    render(<SortButtons {...defaultProps} />);

    const titleButton = screen.getByLabelText("sort_by_title");
    const dateButton = screen.getByLabelText("sort_by_date");

    expect(titleButton).toHaveAttribute("title", "sort_by_title");
    expect(titleButton).toHaveAttribute("aria-label", "sort_by_title");
    expect(dateButton).toHaveAttribute("title", "sort_by_date");
    expect(dateButton).toHaveAttribute("aria-label", "sort_by_date");
  });

  test("buttons have correct CSS classes", () => {
    render(<SortButtons {...defaultProps} sortBy="title_asc" />);

    const titleButton = screen.getByLabelText("sort_by_title");
    const dateButton = screen.getByLabelText("sort_by_date");

    expect(titleButton).toHaveClass(
      "btn-unstyled",
      "btn-icon-neutral",
      "selected"
    );
    expect(dateButton).toHaveClass("btn-unstyled", "btn-icon-neutral");
    expect(dateButton).not.toHaveClass("selected");
  });

  test("translation function is called with correct keys", () => {
    render(<SortButtons {...defaultProps} />);

    expect(mockT).toHaveBeenCalledWith("sort_by_title");
    expect(mockT).toHaveBeenCalledWith("sort_by_date");
  });
});
