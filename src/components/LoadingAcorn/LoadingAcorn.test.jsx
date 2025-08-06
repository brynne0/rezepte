import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import LoadingAcorn from "./LoadingAcorn";
import "@testing-library/jest-dom";

describe("LoadingAcorn Component", () => {
  test("renders loading acorn component", () => {
    render(<LoadingAcorn />);

    const loadingContainer = screen.getByTestId("loading-acorn");
    expect(loadingContainer).toBeInTheDocument();
    expect(loadingContainer).toHaveClass("loading-acorn");
  });

  test("renders three nut icons", () => {
    render(<LoadingAcorn />);

    // Check for lucide-nut icons by their test IDs
    const nutIcons = screen.getAllByTestId("lucide-nut");
    expect(nutIcons).toHaveLength(3);
  });

  test("applies correct CSS classes to nut icons", () => {
    render(<LoadingAcorn />);

    const nutIcons = screen.getAllByTestId("lucide-nut");

    // Check that each icon has the base acorn-icon class and specific animation delay class
    expect(nutIcons[0]).toHaveClass("acorn-icon", "acorn-1");
    expect(nutIcons[1]).toHaveClass("acorn-icon", "acorn-2");
    expect(nutIcons[2]).toHaveClass("acorn-icon", "acorn-3");
  });

  test("uses default size when no size prop is provided", () => {
    render(<LoadingAcorn />);

    const nutIcons = screen.getAllByTestId("lucide-nut");

    // Check that all icons have the default size attribute
    nutIcons.forEach((icon) => {
      expect(icon).toHaveAttribute("width", "25");
      expect(icon).toHaveAttribute("height", "25");
    });
  });

  test("applies custom size when size prop is provided", () => {
    const customSize = 40;
    render(<LoadingAcorn size={customSize} />);

    const nutIcons = screen.getAllByTestId("lucide-nut");

    // Check that all icons have the custom size
    nutIcons.forEach((icon) => {
      expect(icon).toHaveAttribute("width", customSize.toString());
      expect(icon).toHaveAttribute("height", customSize.toString());
    });
  });

  test("applies default className when no className prop is provided", () => {
    render(<LoadingAcorn />);

    const loadingContainer = screen.getByTestId("loading-acorn");
    expect(loadingContainer).toHaveClass("loading-acorn");
    expect(loadingContainer.className).toBe("loading-acorn ");
  });

  test("applies custom className when className prop is provided", () => {
    const customClassName = "custom-loading-class";
    render(<LoadingAcorn className={customClassName} />);

    const loadingContainer = screen.getByTestId("loading-acorn");
    expect(loadingContainer).toHaveClass("loading-acorn", customClassName);
  });

  test("combines default and custom className correctly", () => {
    const customClassName = "my-custom-class another-class";
    render(<LoadingAcorn className={customClassName} />);

    const loadingContainer = screen.getByTestId("loading-acorn");
    expect(loadingContainer).toHaveClass("loading-acorn");
    expect(loadingContainer).toHaveClass("my-custom-class");
    expect(loadingContainer).toHaveClass("another-class");
  });

  test("accepts both size and className props together", () => {
    const customSize = 30;
    const customClassName = "test-class";

    render(<LoadingAcorn size={customSize} className={customClassName} />);

    const loadingContainer = screen.getByTestId("loading-acorn");
    const nutIcons = screen.getAllByTestId("lucide-nut");

    // Check container classes
    expect(loadingContainer).toHaveClass("loading-acorn", customClassName);

    // Check icon sizes
    nutIcons.forEach((icon) => {
      expect(icon).toHaveAttribute("width", customSize.toString());
      expect(icon).toHaveAttribute("height", customSize.toString());
    });
  });

  test("handles size prop as string", () => {
    render(<LoadingAcorn size="35" />);

    const nutIcons = screen.getAllByTestId("lucide-nut");

    nutIcons.forEach((icon) => {
      expect(icon).toHaveAttribute("width", "35");
      expect(icon).toHaveAttribute("height", "35");
    });
  });

  test("renders with accessibility considerations", () => {
    render(<LoadingAcorn />);

    const loadingContainer = screen.getByTestId("loading-acorn");

    // Component should be present and visible
    expect(loadingContainer).toBeInTheDocument();
    expect(loadingContainer).toBeVisible();
  });
});
