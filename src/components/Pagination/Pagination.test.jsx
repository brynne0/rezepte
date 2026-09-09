import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";
import Pagination from "./Pagination";
import "@testing-library/jest-dom";

describe("Pagination Component", () => {
  const mockOnPageChange = vi.fn();

  beforeEach(() => {
    mockOnPageChange.mockClear();
  });

  test("renders nothing when totalPages is 1 or less", () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        onPageChange={mockOnPageChange}
      />
    );
    expect(container.firstChild).toBeNull();

    const { container: container2 } = render(
      <Pagination
        currentPage={1}
        totalPages={0}
        onPageChange={mockOnPageChange}
      />
    );
    expect(container2.firstChild).toBeNull();
  });

  test("renders pagination nav when totalPages is greater than 1", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    );

    expect(
      screen.getByRole("navigation", { name: "pagination" })
    ).toBeInTheDocument();
  });

  test("displays correct page numbers for small page count", () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    );

    // Should show all pages 1-5
    for (let i = 1; i <= 5; i++) {
      expect(
        screen.getByRole("button", { name: i.toString() })
      ).toBeInTheDocument();
    }
  });

  test("marks current page with aria-current", () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    );

    const currentPageButton = screen.getByRole("button", { name: "3" });
    expect(currentPageButton).toHaveAttribute("aria-current", "page");

    const otherPageButton = screen.getByRole("button", { name: "2" });
    expect(otherPageButton).not.toHaveAttribute("aria-current");
  });

  test("calls onPageChange when page button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    );

    const page4Button = screen.getByRole("button", { name: "4" });
    await user.click(page4Button);

    expect(mockOnPageChange).toHaveBeenCalledTimes(1);
    expect(mockOnPageChange).toHaveBeenCalledWith(4);
  });

  test("shows ellipsis and first page when current page is far from beginning", () => {
    render(
      <Pagination
        currentPage={8}
        totalPages={15}
        onPageChange={mockOnPageChange}
      />
    );

    // Should show page 1
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();

    // Should show ellipsis
    expect(screen.getAllByText("More pages").length).toBeGreaterThanOrEqual(1);

    // Should show pages around current page (6, 7, 8, 9, 10)
    expect(screen.getByRole("button", { name: "6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "9" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
  });

  test("shows ellipsis and last page when current page is far from end", () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={15}
        onPageChange={mockOnPageChange}
      />
    );

    // Should show pages around current page (1, 2, 3, 4, 5)
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();

    // Should show ellipsis
    expect(screen.getAllByText("More pages").length).toBeGreaterThanOrEqual(1);

    // Should show last page
    expect(screen.getByRole("button", { name: "15" })).toBeInTheDocument();
  });

  test("shows both ellipses when current page is in middle of large page range", () => {
    render(
      <Pagination
        currentPage={8}
        totalPages={20}
        onPageChange={mockOnPageChange}
      />
    );

    // Should show first page
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();

    // Should show last page
    expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();

    // Should show two ellipses
    expect(screen.getAllByText("More pages")).toHaveLength(2);

    // Should show pages around current page
    expect(screen.getByRole("button", { name: "6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "9" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
  });

  test("handles edge case when current page is at the beginning", () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={10}
        onPageChange={mockOnPageChange}
      />
    );

    // Should show first 5 pages
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();

    // Should show ellipsis and last page
    expect(screen.getByText("More pages")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
  });

  test("handles edge case when current page is at the end", () => {
    render(
      <Pagination
        currentPage={10}
        totalPages={10}
        onPageChange={mockOnPageChange}
      />
    );

    // Should show first page and ellipsis
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByText("More pages")).toBeInTheDocument();

    // Should show last 5 pages
    expect(screen.getByRole("button", { name: "6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "9" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
  });

  test("shows all pages when total pages is small", () => {
    render(
      <Pagination
        currentPage={3}
        totalPages={5}
        onPageChange={mockOnPageChange}
      />
    );

    // Should show all pages without ellipsis
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();

    // Should not show any ellipsis
    expect(screen.queryByText("More pages")).not.toBeInTheDocument();
  });

  test("handles clicking on first page button", async () => {
    const user = userEvent.setup();
    render(
      <Pagination
        currentPage={8}
        totalPages={15}
        onPageChange={mockOnPageChange}
      />
    );

    const firstPageButton = screen.getByRole("button", { name: "1" });
    await user.click(firstPageButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  test("handles clicking on last page button", async () => {
    const user = userEvent.setup();
    render(
      <Pagination
        currentPage={3}
        totalPages={15}
        onPageChange={mockOnPageChange}
      />
    );

    const lastPageButton = screen.getByRole("button", { name: "15" });
    await user.click(lastPageButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(15);
  });

  test("getPageNumbers function works correctly for various scenarios", () => {
    // Test the internal logic by checking rendered output

    // Scenario 1: Small total pages (should show all)
    render(
      <Pagination
        currentPage={2}
        totalPages={4}
        onPageChange={mockOnPageChange}
      />
    );
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
  });

  test("handles multiple rapid clicks correctly", async () => {
    const user = userEvent.setup();
    render(
      <Pagination
        currentPage={5}
        totalPages={10}
        onPageChange={mockOnPageChange}
      />
    );

    const page3Button = screen.getByRole("button", { name: "3" });
    const page7Button = screen.getByRole("button", { name: "7" });

    await user.click(page3Button);
    await user.click(page7Button);

    expect(mockOnPageChange).toHaveBeenCalledTimes(2);
    expect(mockOnPageChange).toHaveBeenNthCalledWith(1, 3);
    expect(mockOnPageChange).toHaveBeenNthCalledWith(2, 7);
  });
});
