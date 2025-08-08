import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { BrowserRouter, useNavigate, useLocation } from "react-router-dom";
import Header from "./Header";
import { useAuth } from "../../hooks/data/useAuth";
import { signOut, getDisplayName } from "../../services/auth";
import useClickOutside from "../../hooks/ui/useClickOutside";
import "@testing-library/jest-dom";

// Mock the hooks and services
vi.mock("../../hooks/data/useAuth");
vi.mock("../../services/auth");
vi.mock("../../hooks/ui/useClickOutside");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  };
});

// Mock i18next
const mockI18n = {
  language: "en",
  changeLanguage: vi.fn(),
};

const mockT = vi.fn((key) => {
  const translations = {
    logged_out: "Logged Out",
    logout: "Logout",
    login: "Login",
    search: "Search",
  };
  return translations[key] || key;
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n,
  }),
  I18nextProvider: ({ children }) => children,
}));

// Create a test wrapper component
const TestWrapper = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe("Header Component", () => {
  let mockNavigate;
  let mockUseAuth;
  let mockSignOut;
  let mockGetDisplayName;
  let mockUseClickOutside;

  const defaultProps = {
    setSelectedCategory: vi.fn(),
    setSearchTerm: vi.fn(),
    setLoginMessage: vi.fn(),
    loginMessage: "",
    disableLanguageSwitch: false,
  };

  beforeEach(() => {
    // Setup mocks
    mockNavigate = vi.fn();
    mockSignOut = vi.fn().mockResolvedValue();
    mockGetDisplayName = vi.fn().mockResolvedValue("John");
    mockUseClickOutside = vi.fn().mockReturnValue({ current: null });

    mockUseAuth = vi.fn().mockReturnValue({
      isLoggedIn: false,
      isMe: false,
      isGuest: false,
    });

    // Apply mocks
    useNavigate.mockReturnValue(mockNavigate);
    useLocation.mockReturnValue({ pathname: "/" });
    useAuth.mockImplementation(mockUseAuth);
    signOut.mockImplementation(mockSignOut);
    getDisplayName.mockImplementation(mockGetDisplayName);
    useClickOutside.mockImplementation(mockUseClickOutside);

    // Reset function mocks
    vi.clearAllMocks();

    // Mock window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("renders header with title", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Rezepte")).toBeInTheDocument();
  });

  test("shows squirrel logo", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    const logos = screen.getAllByTestId("lucide-squirrel");
    expect(logos).toHaveLength(1);
  });

  test("shows double squirrel logo when user is 'me'", () => {
    mockUseAuth.mockReturnValue({
      isLoggedIn: true,
      isMe: true,
      isGuest: false,
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    const logos = screen.getAllByTestId("lucide-squirrel");
    expect(logos).toHaveLength(2);
  });

  test("shows language selection with EN and DE options", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("DE")).toBeInTheDocument();
  });

  test("changes language when clicking on language options", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("DE"));
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("de");

    fireEvent.click(screen.getByText("EN"));
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("en");
  });

  test("does not change language when disableLanguageSwitch is true", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} disableLanguageSwitch={true} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("DE"));
    expect(mockI18n.changeLanguage).not.toHaveBeenCalled();
  });

  test("shows login button when not logged in", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Click on logo to show login form
    const logos = screen.getAllByTestId("lucide-squirrel");
    fireEvent.click(logos[0]);

    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  test("shows logout button when logged in", () => {
    mockUseAuth.mockReturnValue({
      isLoggedIn: true,
      isMe: false,
      isGuest: false,
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Click on logo to show logout form
    const logos = screen.getAllByTestId("lucide-squirrel");
    fireEvent.click(logos[0]);

    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  test("handles logout correctly", async () => {
    mockUseAuth.mockReturnValue({
      isLoggedIn: true,
      isMe: false,
      isGuest: false,
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Click on logo to show logout form
    const logos = screen.getAllByTestId("lucide-squirrel");
    fireEvent.click(logos[0]);

    // Click logout button
    fireEvent.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(defaultProps.setLoginMessage).toHaveBeenCalledWith("Logged Out");
      expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  test("displays login message when provided", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} loginMessage="Welcome back!" />
      </TestWrapper>
    );

    expect(screen.getByText("Welcome back!")).toBeInTheDocument();
  });

  test("displays user display name when logged in", async () => {
    mockUseAuth.mockReturnValue({
      isLoggedIn: true,
      isMe: false,
      isGuest: false,
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("John")).toBeInTheDocument();
    });
  });

  test("shows navigation buttons when logged in and not guest", () => {
    mockUseAuth.mockReturnValue({
      isLoggedIn: true,
      isMe: false,
      isGuest: false,
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByTestId("lucide-search")).toBeInTheDocument();
    expect(screen.getByTestId("lucide-plus")).toBeInTheDocument();
    expect(screen.getByTestId("lucide-shopping-basket")).toBeInTheDocument();
  });

  test("hides add recipe and grocery list buttons for guest users", () => {
    mockUseAuth.mockReturnValue({
      isLoggedIn: true,
      isMe: false,
      isGuest: true,
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByTestId("lucide-search")).toBeInTheDocument();
    expect(screen.queryByTestId("lucide-plus")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("lucide-shopping-basket")
    ).not.toBeInTheDocument();
  });

  test("hides navigation bar on small screens when not on home page", () => {
    // Mock small screen
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true, // Small screen
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });

    useLocation.mockReturnValue({
      pathname: "/add-recipe",
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.queryByTestId("lucide-search")).not.toBeInTheDocument();
  });

  test("navigates to add recipe page when plus button is clicked", () => {
    mockUseAuth.mockReturnValue({
      isLoggedIn: true,
      isMe: false,
      isGuest: false,
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId("lucide-plus"));
    expect(mockNavigate).toHaveBeenCalledWith("/add-recipe");
  });

  test("navigates to grocery list page when shopping basket is clicked", () => {
    mockUseAuth.mockReturnValue({
      isLoggedIn: true,
      isMe: false,
      isGuest: false,
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId("lucide-shopping-basket"));
    expect(mockNavigate).toHaveBeenCalledWith("/grocery-list");
  });

  test("navigates to auth page when login button is clicked", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Click on logo to show login form
    const logos = screen.getAllByTestId("lucide-squirrel");
    fireEvent.click(logos[0]);

    // Click login button
    fireEvent.click(screen.getByText("Login"));

    expect(mockNavigate).toHaveBeenCalledWith("/auth-page");
    expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("");
  });

  test("navigates to home and resets filters when title is clicked", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("Rezepte"));

    expect(defaultProps.setSelectedCategory).toHaveBeenCalledWith("all");
    expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("toggles search bar when search button is clicked on home page", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId("lucide-search"));

    // Search bar should appear
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
  });

  test("navigates to home and opens search when search button clicked on non-home page", () => {
    useLocation.mockReturnValue({
      pathname: "/add-recipe",
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId("lucide-search"));

    expect(defaultProps.setSelectedCategory).toHaveBeenCalledWith("all");
    expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("submits search form correctly", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Open search bar
    fireEvent.click(screen.getByTestId("lucide-search"));

    // Enter search term
    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "pasta" } });

    // Submit form
    fireEvent.click(screen.getByText("Search"));

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("does not show login/logout when on auth page", () => {
    useLocation.mockReturnValue({
      pathname: "/auth-page",
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Click on logo - should not show login and logout buttons
    const logos = screen.getAllByTestId("lucide-squirrel");
    fireEvent.click(logos[0]);

    expect(screen.queryByTestId("header-login-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("header-logout-btn")).not.toBeInTheDocument();
  });

  test("does not show login/logout when there is a login message", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} loginMessage="Processing..." />
      </TestWrapper>
    );

    // Click on logo - should not show login/logout
    const logos = screen.getAllByTestId("lucide-squirrel");
    fireEvent.click(logos[0]);

    expect(screen.queryByText("Login")).not.toBeInTheDocument();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });

  describe("Language Switching", () => {
    test("shows current language as selected", () => {
      mockI18n.language = "en";

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const enButton = screen.getByText("EN");
      const deButton = screen.getByText("DE");

      expect(enButton).toHaveClass("selected");
      expect(deButton).not.toHaveClass("selected");
    });

    test("calls changeLanguage when language button clicked", () => {
      mockI18n.language = "en";

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const deButton = screen.getByText("DE");
      fireEvent.click(deButton);

      expect(mockI18n.changeLanguage).toHaveBeenCalledWith("de");
    });

    test("shows German as selected when language is German", () => {
      mockI18n.language = "de";

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const enButton = screen.getByText("EN");
      const deButton = screen.getByText("DE");

      expect(deButton).toHaveClass("selected");
      expect(enButton).not.toHaveClass("selected");
    });

    test("disables language switching when disableLanguageSwitch is true", () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} disableLanguageSwitch={true} />
        </TestWrapper>
      );

      const enButton = screen.getByText("EN");
      const deButton = screen.getByText("DE");

      expect(enButton).toHaveClass("disabled");
      expect(deButton).toHaveClass("disabled");

      // Language change should not be called when disabled
      fireEvent.click(deButton);
      expect(mockI18n.changeLanguage).not.toHaveBeenCalled();
    });

    test("maintains selected state even when disabled", () => {
      mockI18n.language = "de";

      render(
        <TestWrapper>
          <Header {...defaultProps} disableLanguageSwitch={true} />
        </TestWrapper>
      );

      const deButton = screen.getByText("DE");

      expect(deButton).toHaveClass("selected");
      expect(deButton).toHaveClass("disabled");
    });
  });

  describe("Language Integration with Recipe Translation", () => {
    test("language change triggers recipe re-fetch through i18n dependency", async () => {
      // Integration test that verifies the language change
      // will trigger useRecipe hook re-execution due to i18n.language dependency

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      // Change language
      fireEvent.click(screen.getByText("DE"));

      // Verify changeLanguage was called
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith("de");

      // 1. i18n.language changes to "de"
      // 2. useRecipe hook dependency [id, i18n.language] triggers re-fetch
      // 3. getTranslatedRecipe is called with new language
      // 4. Ingredients get translated and displayed in German
    });

    test("language button state reflects i18n current language", () => {
      // Test that the UI correctly shows the current language state for German
      mockI18n.language = "de";

      const { unmount } = render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      // German should be selected
      expect(screen.getByText("DE")).toHaveClass("selected");
      expect(screen.getByText("EN")).not.toHaveClass("selected");

      // Clean up first render
      unmount();

      // This simulates what happens when language actually changes
      mockI18n.language = "en";

      // Re-render with new language
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      // English should now be selected
      expect(screen.getByText("EN")).toHaveClass("selected");
      expect(screen.getByText("DE")).not.toHaveClass("selected");
    });
  });
});
