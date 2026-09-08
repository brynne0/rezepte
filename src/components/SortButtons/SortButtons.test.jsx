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

    expect(recentButton).toHaveAttribute("aria-pressed", "true");
    expect(titleButton).toHaveAttribute("aria-pressed", "false");
  });

  test("shows correct active state for title sorting", () => {
    render(<SortButtons {...defaultProps} sortBy="title_asc" />);

    const titleButton = screen.getByLabelText("sort_by_title");
    const recentButton = screen.getByLabelText("sort_by_recently_used");

    expect(titleButton).toHaveAttribute("aria-pressed", "true");
    expect(recentButton).toHaveAttribute("aria-pressed", "false");
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

    expect(titleButton).toHaveAttribute("aria-label", "sort_by_title");
    expect(recentButton).toHaveAttribute("aria-label", "sort_by_recently_used");
  });

  test("calls onPageReset when title sort is clicked", () => {
    const mockOnPageReset = vi.fn();
    render(<SortButtons {...defaultProps} onPageReset={mockOnPageReset} />);

    fireEvent.click(screen.getByLabelText("sort_by_title"));

    expect(mockOnPageReset).toHaveBeenCalledTimes(1);
  });

  test("calls onPageReset when recent sort is clicked", () => {
    const mockOnPageReset = vi.fn();
    render(<SortButtons {...defaultProps} onPageReset={mockOnPageReset} />);

    fireEvent.click(screen.getByLabelText("sort_by_recently_used"));

    expect(mockOnPageReset).toHaveBeenCalledTimes(1);
  });

  test("does not throw when onPageReset is not provided", () => {
    render(<SortButtons {...defaultProps} />);

    expect(() =>
      fireEvent.click(screen.getByLabelText("sort_by_title"))
    ).not.toThrow();
  });

  test("renders the show images toggle when logged in", () => {
    render(
      <SortButtons {...defaultProps} isLoggedIn={true} showImages={true} />
    );

    expect(screen.getByLabelText("hide_images")).toBeInTheDocument();
  });

  test("shows correct label and pressed state when images are shown", () => {
    render(
      <SortButtons {...defaultProps} isLoggedIn={true} showImages={true} />
    );

    const imageToggle = screen.getByLabelText("hide_images");
    expect(imageToggle).toHaveAttribute("aria-pressed", "true");
  });

  test("shows correct label and pressed state when images are hidden", () => {
    render(
      <SortButtons {...defaultProps} isLoggedIn={true} showImages={false} />
    );

    const imageToggle = screen.getByLabelText("show_images");
    expect(imageToggle).toHaveAttribute("aria-pressed", "false");
  });

  test("calls onShowImagesChange when the image toggle is clicked", () => {
    const mockOnShowImagesChange = vi.fn();
    render(
      <SortButtons
        {...defaultProps}
        isLoggedIn={true}
        showImages={false}
        onShowImagesChange={mockOnShowImagesChange}
      />
    );

    fireEvent.click(screen.getByLabelText("show_images"));

    expect(mockOnShowImagesChange).toHaveBeenCalledTimes(1);
    expect(mockOnShowImagesChange.mock.calls[0][0]).toBe(true);
  });

  test("translation function is called with correct keys", () => {
    render(<SortButtons {...defaultProps} />);

    expect(mockT).toHaveBeenCalledWith("sort_by_title");
    expect(mockT).toHaveBeenCalledWith("sort_by_recently_used");
  });
});
