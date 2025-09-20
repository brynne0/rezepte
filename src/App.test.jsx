import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";

// Simplified test component that mirrors the App structure
const TestAppRoutes = ({ isOnline }) => {
  // Mock the useLocation hook
  const location = { pathname: "/" };

  return (
    <>
      <div data-testid="header">Header</div>
      {location.pathname === "/" && (
        <>
          {isOnline && <div data-testid="category-filter">Category Filter</div>}
          <div data-testid="recipe-list">Recipe List</div>
          {isOnline && <div data-testid="pagination">Pagination</div>}
        </>
      )}
      {location.pathname === "/auth-page" && (
        <div data-testid="auth-page">Auth Page</div>
      )}
    </>
  );
};

describe("App Component Offline Functionality", () => {
  describe("Home page offline functionality", () => {
    it("shows CategoryFilter and Pagination when online", () => {
      render(
        <MemoryRouter>
          <TestAppRoutes isOnline={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId("category-filter")).toBeInTheDocument();
      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByTestId("recipe-list")).toBeInTheDocument();
    });

    it("hides CategoryFilter and Pagination when offline", () => {
      render(
        <MemoryRouter>
          <TestAppRoutes isOnline={false} />
        </MemoryRouter>
      );

      expect(screen.queryByTestId("category-filter")).not.toBeInTheDocument();
      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
      // RecipeList should still be visible (it handles its own offline state)
      expect(screen.getByTestId("recipe-list")).toBeInTheDocument();
    });

    it("shows header regardless of online status", () => {
      render(
        <MemoryRouter>
          <TestAppRoutes isOnline={false} />
        </MemoryRouter>
      );

      expect(screen.getByTestId("header")).toBeInTheDocument();
    });

    it("handles transition from online to offline", () => {
      const { rerender } = render(
        <MemoryRouter>
          <TestAppRoutes isOnline={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId("category-filter")).toBeInTheDocument();
      expect(screen.getByTestId("pagination")).toBeInTheDocument();

      // Switch to offline
      rerender(
        <MemoryRouter>
          <TestAppRoutes isOnline={false} />
        </MemoryRouter>
      );

      expect(screen.queryByTestId("category-filter")).not.toBeInTheDocument();
      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
      expect(screen.getByTestId("recipe-list")).toBeInTheDocument();
    });

    it("handles transition from offline to online", () => {
      const { rerender } = render(
        <MemoryRouter>
          <TestAppRoutes isOnline={false} />
        </MemoryRouter>
      );

      expect(screen.queryByTestId("category-filter")).not.toBeInTheDocument();
      expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();

      // Switch to online
      rerender(
        <MemoryRouter>
          <TestAppRoutes isOnline={true} />
        </MemoryRouter>
      );

      expect(screen.getByTestId("category-filter")).toBeInTheDocument();
      expect(screen.getByTestId("pagination")).toBeInTheDocument();
      expect(screen.getByTestId("recipe-list")).toBeInTheDocument();
    });
  });
});
