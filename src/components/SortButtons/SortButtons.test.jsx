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
    sortBy: "last_viewed_at_desc",
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
    expect(screen.getByLabelText("sort_by_recently_used")).toBeInTheDocument();
  });

  test("shows correct active state for recently used sorting", () => {
    render(<SortButtons {...defaultProps} sortBy="last_viewed_at_desc" />);

    const recentButton = screen.getByLabelText("sort_by_recently_used");
    const titleButton = screen.getByLabelText("sort_by_title");

    expect(recentButton).toHaveClass("selected");
    expect(titleButton).not.toHaveClass("selected");
  });

  test("shows correct active state for title sorting", () => {
    render(<SortButtons {...defaultProps} sortBy="title_asc" />);

    const titleButton = screen.getByLabelText("sort_by_title");
    const recentButton = screen.getByLabelText("sort_by_recently_used");

    expect(titleButton).toHaveClass("selected");
    expect(recentButton).not.toHaveClass("selected");
  });

  test("handles title sort click - from unselected to asc", () => {
    render(<SortButtons {...defaultProps} sortBy="last_viewed_at_desc" />);

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

  test("handles recent sort click - from desc to asc", () => {
    render(<SortButtons {...defaultProps} sortBy="last_viewed_at_desc" />);

    const recentButton = screen.getByLabelText("sort_by_recently_used");
    fireEvent.click(recentButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("last_viewed_at_asc");
  });

  test("handles recent sort click - from asc to desc", () => {
    render(<SortButtons {...defaultProps} sortBy="last_viewed_at_asc" />);

    const recentButton = screen.getByLabelText("sort_by_recently_used");
    fireEvent.click(recentButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("last_viewed_at_desc");
  });

  test("handles recent sort click - from unselected to desc", () => {
    render(<SortButtons {...defaultProps} sortBy="title_asc" />);

    const recentButton = screen.getByLabelText("sort_by_recently_used");
    fireEvent.click(recentButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("last_viewed_at_desc");
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

    rerender(<SortButtons {...defaultProps} sortBy="last_viewed_at_desc" />);
    titleButton = screen.getByLabelText("sort_by_title");
    expect(titleButton.querySelector("svg")).toBeInTheDocument();
  });

  test("renders correct icons for recently used sorting states", () => {
    const { rerender } = render(
      <SortButtons {...defaultProps} sortBy="last_viewed_at_asc" />
    );
    let recentButton = screen.getByLabelText("sort_by_recently_used");
    expect(recentButton.querySelector("svg")).toBeInTheDocument();

    rerender(<SortButtons {...defaultProps} sortBy="last_viewed_at_desc" />);
    recentButton = screen.getByLabelText("sort_by_recently_used");
    expect(recentButton.querySelector("svg")).toBeInTheDocument();

    rerender(<SortButtons {...defaultProps} sortBy="title_asc" />);
    recentButton = screen.getByLabelText("sort_by_recently_used");
    expect(recentButton.querySelector("svg")).toBeInTheDocument();
  });

  test("buttons have correct accessibility attributes", () => {
    render(<SortButtons {...defaultProps} />);

    const titleButton = screen.getByLabelText("sort_by_title");
    const recentButton = screen.getByLabelText("sort_by_recently_used");

    expect(titleButton).toHaveAttribute("title", "sort_by_title");
    expect(titleButton).toHaveAttribute("aria-label", "sort_by_title");
    expect(recentButton).toHaveAttribute("title", "sort_by_recently_used");
    expect(recentButton).toHaveAttribute("aria-label", "sort_by_recently_used");
  });

  test("buttons have correct CSS classes", () => {
    render(<SortButtons {...defaultProps} sortBy="title_asc" />);

    const titleButton = screen.getByLabelText("sort_by_title");
    const recentButton = screen.getByLabelText("sort_by_recently_used");

    expect(titleButton).toHaveClass(
      "btn-unstyled",
      "btn-icon-neutral",
      "selected"
    );
    expect(recentButton).toHaveClass("btn-unstyled", "btn-icon-neutral");
    expect(recentButton).not.toHaveClass("selected");
  });

  test("translation function is called with correct keys", () => {
    render(<SortButtons {...defaultProps} />);

    expect(mockT).toHaveBeenCalledWith("sort_by_title");
    expect(mockT).toHaveBeenCalledWith("sort_by_recently_used");
  });
});
