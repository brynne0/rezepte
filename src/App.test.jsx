import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { useAuth } from "./hooks/data/useAuth";
import { useCategories } from "./hooks/data/useCategories";
import { useRecipesPagination } from "./hooks/data/useRecipesPagination";
import { useOnlineStatus } from "./hooks/ui/useOnlineStatus";

vi.mock("./hooks/data/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("./hooks/data/useCategories", () => ({
  useCategories: vi.fn(),
}));

vi.mock("./hooks/data/useRecipesPagination", () => ({
  useRecipesPagination: vi.fn(),
}));

vi.mock("./hooks/ui/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn(() => true),
}));

vi.mock("./components/Header/Header", () => ({
  default: () => <div data-testid="header">Header</div>,
}));

// The route components below drag in large feature trees (forms, data
// fetching, etc.) that are already covered by their own test suites. App.jsx
// itself is only responsible for routing/layout/loading-gate/offline
// behaviour, so its children are stubbed to keep this test focused on that.
vi.mock("./features/Home/Home", () => ({
  default: () => <div data-testid="home-page">Home</div>,
}));
vi.mock("./features/AddRecipe/AddRecipe", () => ({
  default: () => <div data-testid="add-recipe-page">Add Recipe</div>,
}));
vi.mock("./features/EditRecipe/EditRecipe", () => ({
  default: () => <div data-testid="edit-recipe-page">Edit Recipe</div>,
}));
vi.mock("./features/CookingTimes/CookingTimes", () => ({
  default: () => <div data-testid="cooking-times-page">Cooking Times</div>,
}));
vi.mock("./features/Auth/Auth", () => ({
  default: () => <div data-testid="auth-page">Auth</div>,
}));
vi.mock("./features/Recipe/Recipe", () => ({
  default: () => <div data-testid="recipe-page">Recipe</div>,
}));
vi.mock("./features/ForgotPassword/ForgotPassword", () => ({
  default: () => <div data-testid="forgot-password-page">Forgot Password</div>,
}));
vi.mock("./features/ChangePassword/ChangePassword", () => ({
  default: () => <div data-testid="change-password-page">Change Password</div>,
}));
vi.mock("./features/ChangeEmail/ChangeEmail", () => ({
  default: () => <div data-testid="change-email-page">Change Email</div>,
}));
vi.mock("./features/Settings/Settings", () => ({
  default: () => <div data-testid="settings-page">Settings</div>,
}));
vi.mock("./features/FriendRecipes/FriendRecipes", () => ({
  default: () => <div data-testid="friend-recipes-page">Friend Recipes</div>,
}));
vi.mock("./features/Showcase/Showcase", () => ({
  default: () => <div data-testid="showcase-page">Showcase</div>,
}));

const basePaginationInfo = {
  totalCount: 0,
  totalPages: 0,
  currentPage: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const setPath = (path) => {
  window.history.pushState({}, "", path);
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      isLoggedIn: true,
      loading: false,
      user: { id: "u1" },
    });
    useCategories.mockReturnValue({ categories: [], loading: false });
    useRecipesPagination.mockReturnValue({
      recipes: [],
      loading: false,
      isFetchingRecipes: false,
      totalRecipeCount: 0,
      paginationInfo: basePaginationInfo,
    });
    useOnlineStatus.mockReturnValue(true);
    setPath("/");
  });

  test("shows a loading state on the home page while recipes or categories are loading", () => {
    useRecipesPagination.mockReturnValue({
      recipes: [],
      loading: true,
      isFetchingRecipes: false,
      totalRecipeCount: 0,
      paginationInfo: basePaginationInfo,
    });

    render(<App />);

    expect(screen.queryByTestId("header")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  });

  test("renders the header and the routed page once loaded", async () => {
    render(<App />);

    expect(await screen.findByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });

  test("does not gate a non-home route behind the loading state", async () => {
    setPath("/login");
    useRecipesPagination.mockReturnValue({
      recipes: [],
      loading: true,
      isFetchingRecipes: false,
      totalRecipeCount: 0,
      paginationInfo: basePaginationInfo,
    });

    render(<App />);

    expect(await screen.findByTestId("auth-page")).toBeInTheDocument();
  });

  test("shows the offline banner when offline", async () => {
    useOnlineStatus.mockReturnValue(false);

    render(<App />);

    expect(
      await screen.findByText("no_internet_connection")
    ).toBeInTheDocument();
  });

  test("does not show the offline banner when online", async () => {
    render(<App />);

    await screen.findByTestId("home-page");

    expect(
      screen.queryByText("no_internet_connection")
    ).not.toBeInTheDocument();
  });

  test("renders a public route (login) without requiring authentication", async () => {
    useAuth.mockReturnValue({ isLoggedIn: false, loading: false, user: null });
    setPath("/login");

    render(<App />);

    expect(await screen.findByTestId("auth-page")).toBeInTheDocument();
  });

  test("redirects a protected route to /login when not authenticated", async () => {
    useAuth.mockReturnValue({ isLoggedIn: false, loading: false, user: null });
    setPath("/add-recipe");

    render(<App />);

    expect(await screen.findByTestId("auth-page")).toBeInTheDocument();
    expect(screen.queryByTestId("add-recipe-page")).not.toBeInTheDocument();
  });

  test("renders a protected route when authenticated", async () => {
    setPath("/add-recipe");

    render(<App />);

    expect(await screen.findByTestId("add-recipe-page")).toBeInTheDocument();
  });

  test("redirects an unknown path to the home page", async () => {
    setPath("/does-not-exist");

    render(<App />);

    expect(await screen.findByTestId("home-page")).toBeInTheDocument();
  });
});
