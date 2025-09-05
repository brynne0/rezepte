import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../../hooks/data/useAuth";

// Mock the useAuth hook
vi.mock("../../hooks/data/useAuth");

const TestComponent = () => <div>Protected Content</div>;

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("ProtectedRoute", () => {
  it("shows nothing while loading", () => {
    useAuth.mockReturnValue({
      isLoggedIn: false,
      loading: true,
    });

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when user is logged in", () => {
    useAuth.mockReturnValue({
      isLoggedIn: true,
      loading: false,
    });

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to auth page when user is not logged in", () => {
    useAuth.mockReturnValue({
      isLoggedIn: false,
      loading: false,
    });

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
