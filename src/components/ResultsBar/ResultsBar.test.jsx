import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import ResultsBar from "./ResultsBar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) =>
      opts?.count !== undefined ? `${key}:${opts.count}` : key,
  }),
}));

describe("ResultsBar", () => {
  const onSortChange = vi.fn();
  const onPageReset = vi.fn();
  const onShowImagesChange = vi.fn();

  const defaultProps = {
    count: 12,
    sortBy: "last_viewed_at_desc",
    onSortChange,
    onPageReset,
    showImages: true,
    onShowImagesChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows how many recipes match", () => {
    render(<ResultsBar {...defaultProps} />);

    expect(screen.getByText("recipe_count:12")).toBeInTheDocument();
  });

  test("shows the current sort order on the menu button", () => {
    render(<ResultsBar {...defaultProps} sortBy="title_desc" />);

    expect(screen.getByText("sort_short_title_desc")).toBeInTheDocument();
  });

  test("changes the sort order and resets to the first page", async () => {
    render(<ResultsBar {...defaultProps} />);

    fireEvent.click(screen.getByText("sort_short_last_viewed_at_desc"));
    fireEvent.click(await screen.findByText("sort_title_asc"));

    expect(onSortChange).toHaveBeenCalledWith("title_asc");
    expect(onPageReset).toHaveBeenCalled();
  });

  test("leaves out the recently-used sorts when showRecentSort is false", async () => {
    render(
      <ResultsBar {...defaultProps} sortBy="title_asc" showRecentSort={false} />
    );

    fireEvent.click(screen.getByText("sort_short_title_asc"));

    expect(await screen.findByText("sort_title_desc")).toBeInTheDocument();
    expect(
      screen.queryByText("sort_last_viewed_at_desc")
    ).not.toBeInTheDocument();
  });

  test("switches to titles only", () => {
    render(<ResultsBar {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "view_titles_only" }));

    expect(onShowImagesChange).toHaveBeenCalledWith(false);
  });

  test("switches back to photos", () => {
    render(<ResultsBar {...defaultProps} showImages={false} />);

    fireEvent.click(screen.getByRole("button", { name: "view_with_photos" }));

    expect(onShowImagesChange).toHaveBeenCalledWith(true);
  });

  test("hides the view switch when photos can't be shown", () => {
    render(<ResultsBar {...defaultProps} showImageToggle={false} />);

    expect(
      screen.queryByRole("button", { name: "view_with_photos" })
    ).not.toBeInTheDocument();
  });
});
