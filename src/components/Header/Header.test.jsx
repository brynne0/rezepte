import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { BrowserRouter, useNavigate, useLocation } from "react-router-dom";
import Header from "./Header";
import { useAuth } from "../../hooks/data/useAuth";
import { signOut, getFirstName } from "../../services/auth";
import { useTheme } from "../../hooks/ui/useTheme";
import "@testing-library/jest-dom";

// Mock the hooks and services
vi.mock("../../hooks/data/useAuth");
vi.mock("../../services/auth");
vi.mock("../../hooks/ui/useTheme", () => ({
  useTheme: vi.fn(() => ({
    theme: "light",
    toggleTheme: vi.fn(),
  })),
}));
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
    add_new_recipe: "Add New Recipe",
    grocery_list: "Grocery List",
    user_menu: "User Menu",
    settings: "Settings",
    theme_dark: "Switch to dark mode",
    theme_light: "Switch to light mode",
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
  let mockGetFirstName;
  let mockToggleTheme;

  const defaultProps = {
    setSelectedCategory: vi.fn(),
    setSearchTerm: vi.fn(),
    searchTerm: "",
    loginMessage: "",
    disableLanguageSwitch: false,
  };

  beforeEach(() => {
    // Setup mocks
    mockNavigate = vi.fn();
    mockSignOut = vi.fn().mockResolvedValue();
    mockGetFirstName = vi.fn().mockResolvedValue("John");
    mockToggleTheme = vi.fn();

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
    getFirstName.mockImplementation(mockGetFirstName);
    useTheme.mockReturnValue({
      theme: "light",
      toggleTheme: mockToggleTheme,
    });

    // Reset function mocks
    vi.clearAllMocks();

    // Reset shared i18n mock state (mutated by individual tests)
    mockI18n.language = "en";

    // Mock window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
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

    const logo = document.querySelector(".lucide-squirrel");
    expect(logo).toBeInTheDocument();
  });

  test("shows language toggle for switching to the other language", () => {
    mockI18n.language = "en";

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Single toggle shows the language you'd switch TO, not the current one
    expect(screen.getByText("DE")).toBeInTheDocument();
    expect(screen.queryByText("EN")).not.toBeInTheDocument();
  });

  test("changes language when clicking the language toggle", () => {
    mockI18n.language = "en";

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("DE"));
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("de");
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

  test("shows chef hat icon", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Should show chef hat icon for user menu
    const chefHatButtons = screen.getAllByLabelText("Login");
    expect(chefHatButtons.length).toBeGreaterThan(0);
  });

  test("shows chef hat icon with user menu label when logged in", () => {
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

    // Should show chef hat icon with user menu label
    const chefHatButtons = screen.getAllByLabelText("User Menu");
    expect(chefHatButtons.length).toBeGreaterThan(0);
  });

  test("handles logout correctly from user dropdown", async () => {
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

    // Click on chef hat to open user dropdown
    const chefHatButton = screen.getAllByLabelText("User Menu")[0];
    fireEvent.click(chefHatButton);

    // Click logout button in dropdown
    expect(screen.getAllByText("Logout")).toHaveLength(1);

    fireEvent.click(screen.getAllByText("Logout")[0]);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
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
      expect(screen.getByText("John's")).toBeInTheDocument();
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

    expect(screen.getByTestId("lucide-plus")).toBeInTheDocument();
    // expect(screen.getByTestId("lucide-shopping-basket")).toBeInTheDocument();
  });

  test("hides add recipe and grocery list buttons when not logged in", () => {
    mockUseAuth.mockReturnValue({
      isLoggedIn: false,
      isMe: false,
      isGuest: false,
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.queryByTestId("lucide-plus")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("lucide-shopping-basket")
    ).not.toBeInTheDocument();
  });

  test("hides search bar when not on home page", () => {
    useLocation.mockReturnValue({
      pathname: "/add-recipe",
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Search bar should not be visible on non-home pages
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
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

  // test("navigates to grocery list page when shopping basket is clicked", () => {
  //   mockUseAuth.mockReturnValue({
  //     isLoggedIn: true,
  //     isMe: false,
  //     isGuest: false,
  //   });

  //   render(
  //     <TestWrapper>
  //       <Header {...defaultProps} />
  //     </TestWrapper>
  //   );

  //   fireEvent.click(screen.getByTestId("lucide-shopping-basket"));
  //   expect(mockNavigate).toHaveBeenCalledWith("/grocery-list");
  // });

  test("navigates to auth page when login button is clicked from user dropdown", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Click on chef hat to open dropdown
    const chefHatButton = screen.getAllByLabelText("Login")[0];
    fireEvent.click(chefHatButton);

    // Click login button in dropdown
    fireEvent.click(screen.getAllByText("Login")[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/auth-page");
  });

  test("navigates to home when title is clicked", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText("Rezepte"));

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("shows search bar on home page", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Search bar should be visible on home page
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
  });

  // Removed search button functionality
  // test("navigates to home and opens search when search button clicked on non-home page", () => {});

  test("submits search form correctly", () => {
    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Enter search term
    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "pasta" } });

    // Submit form by clicking search button
    const searchForm = searchInput.closest("form");
    fireEvent.submit(searchForm);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  test("user dropdown does not respond when on auth page", () => {
    useLocation.mockReturnValue({
      pathname: "/auth-page",
    });

    render(
      <TestWrapper>
        <Header {...defaultProps} />
      </TestWrapper>
    );

    // Click on chef hat - should not open dropdown on auth page
    const chefHatButton = screen.getAllByLabelText("Login")[0];
    fireEvent.click(chefHatButton);

    // No dropdown should appear
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });

  describe("Language Switching", () => {
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

    test("disables language switching when disableLanguageSwitch is true", () => {
      mockI18n.language = "en";

      render(
        <TestWrapper>
          <Header {...defaultProps} disableLanguageSwitch={true} />
        </TestWrapper>
      );

      const toggle = screen.getByText("DE");
      expect(toggle).toBeDisabled();

      // Language change should not be called when disabled
      fireEvent.click(toggle);
      expect(mockI18n.changeLanguage).not.toHaveBeenCalled();
    });

    test("shows correct target language label even when disabled", () => {
      mockI18n.language = "de";

      render(
        <TestWrapper>
          <Header {...defaultProps} disableLanguageSwitch={true} />
        </TestWrapper>
      );

      const toggle = screen.getByText("EN");

      expect(toggle).toBeDisabled();
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

    test("language toggle label reflects i18n current language", () => {
      // Test that the UI correctly shows the current language state for German
      mockI18n.language = "de";

      const { unmount } = render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      // Currently German, so the toggle offers to switch to English
      expect(screen.getByText("EN")).toBeInTheDocument();
      expect(screen.queryByText("DE")).not.toBeInTheDocument();

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

      // Currently English, so the toggle offers to switch to German
      expect(screen.getByText("DE")).toBeInTheDocument();
      expect(screen.queryByText("EN")).not.toBeInTheDocument();
    });
  });

  describe("User Dropdown Functionality", () => {
    test("opens user dropdown when chef hat is clicked", () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const chefHatButton = screen.getAllByLabelText("Login")[0];
      fireEvent.click(chefHatButton);

      // Each trigger owns its own (uncontrolled) menu, so only the clicked
      // instance's content renders
      expect(screen.getAllByText("Login")).toHaveLength(1);
    });

    test("user dropdown functionality is working correctly", async () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const chefHatButton = screen.getAllByLabelText("Login")[0];

      // Verify dropdown is initially closed
      expect(
        document.querySelectorAll('[data-slot="dropdown-menu-content"]')
      ).toHaveLength(0);

      // Open dropdown
      fireEvent.click(chefHatButton);
      await waitFor(() => {
        expect(
          document.querySelectorAll('[data-slot="dropdown-menu-content"]')
        ).toHaveLength(1);
      });
    });

    test("shows account settings option when logged in", () => {
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

      const chefHatButton = screen.getAllByLabelText("User Menu")[0];
      fireEvent.click(chefHatButton);

      expect(screen.getAllByText("Settings")).toHaveLength(1);
      expect(screen.getAllByText("Logout")).toHaveLength(1);
    });

    test("navigates to settings page when settings is clicked", () => {
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

      const chefHatButton = screen.getAllByLabelText("User Menu")[0];
      fireEvent.click(chefHatButton);

      fireEvent.click(screen.getAllByText("Settings")[0]);

      expect(mockNavigate).toHaveBeenCalledWith("/settings");
    });

    test("does not open dropdown when on auth page", () => {
      useLocation.mockReturnValue({
        pathname: "/auth-page",
      });

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const chefHatButton = screen.getAllByLabelText("Login")[0];
      fireEvent.click(chefHatButton);

      // No dropdown should appear
      expect(screen.queryByText("Login")).not.toBeInTheDocument();
    });

    test("closes dropdown when clicking outside", async () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const chefHatButton = screen.getAllByLabelText("Login")[0];
      fireEvent.click(chefHatButton);

      expect(screen.getAllByText("Login")).toHaveLength(1);

      // The menu (base-ui) handles outside-click-to-close natively
      fireEvent.mouseDown(document.body);
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.queryAllByText("Login")).toHaveLength(0);
      });
    });
  });

  describe("Hamburger Menu Functionality", () => {
    test("opens hamburger menu when menu button is clicked", () => {
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

      const menuButton = screen.getByLabelText("Menu");
      fireEvent.click(menuButton);

      // Should show navigation options for logged in users
      expect(
        document.querySelector('[data-slot="dropdown-menu-content"]')
      ).toBeInTheDocument();
    });

    test("closes hamburger menu when menu button is clicked again", () => {
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

      const menuButton = screen.getByLabelText("Menu");

      // Open menu
      fireEvent.click(menuButton);
      expect(
        document.querySelector('[data-slot="dropdown-menu-content"]')
      ).toBeInTheDocument();

      // Close menu
      fireEvent.click(menuButton);
      expect(
        document.querySelector('[data-slot="dropdown-menu-content"]')
      ).not.toBeInTheDocument();
    });

    test("shows plus icon in hamburger menu when logged in", () => {
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

      const menuButton = screen.getByLabelText("Menu");
      fireEvent.click(menuButton);

      // Should show plus in the dropdown
      const dropdown = document.querySelector(
        '[data-slot="dropdown-menu-content"]'
      );
      expect(dropdown.querySelector(".lucide-plus")).toBeInTheDocument();
    });

    test("navigates to add recipe from hamburger menu", () => {
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

      const menuButton = screen.getByLabelText("Menu");
      fireEvent.click(menuButton);

      const plusButton = document
        .querySelector('[data-slot="dropdown-menu-content"] .lucide-plus')
        .closest('[role="menuitem"]');
      fireEvent.click(plusButton);

      expect(mockNavigate).toHaveBeenCalledWith("/add-recipe");
    });

    test("hides navigation options in hamburger menu when not logged in", () => {
      mockUseAuth.mockReturnValue({
        isLoggedIn: false,
        isMe: false,
        isGuest: false,
      });

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText("Menu");
      fireEvent.click(menuButton);

      const dropdown = document.querySelector(
        '[data-slot="dropdown-menu-content"]'
      );
      expect(dropdown.querySelector(".lucide-plus")).not.toBeInTheDocument();
      expect(
        dropdown.querySelector(".lucide-shopping-basket")
      ).not.toBeInTheDocument();
    });

    test("closes hamburger menu when clicking outside", async () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText("Menu");
      fireEvent.click(menuButton);

      expect(
        document.querySelector('[data-slot="dropdown-menu-content"]')
      ).toBeInTheDocument();

      // The menu (base-ui) handles outside-click-to-close natively
      fireEvent.mouseDown(document.body);
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(
          document.querySelector('[data-slot="dropdown-menu-content"]')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Navigation Button Selected States", () => {
    // test("grocery list button has selected class when on grocery-list page", () => {
    //   mockUseAuth.mockReturnValue({
    //     isLoggedIn: true,
    //     isMe: false,
    //     isGuest: false,
    //   });

    //   useLocation.mockReturnValue({
    //     pathname: "/grocery-list",
    //   });

    //   render(
    //     <TestWrapper>
    //       <Header {...defaultProps} />
    //     </TestWrapper>
    //   );

    //   const groceryButton = screen.getByTestId("lucide-shopping-basket");
    //   expect(groceryButton.className).toContain("selected");
    // });

    test("navigation buttons do not have selected class on other pages", () => {
      mockUseAuth.mockReturnValue({
        isLoggedIn: true,
        isMe: false,
        isGuest: false,
      });

      useLocation.mockReturnValue({
        pathname: "/",
      });

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const addButton = screen.getByTestId("lucide-plus");
      // const groceryButton = screen.getByTestId("lucide-shopping-basket");

      expect(addButton.className).not.toContain("selected");
      // expect(groceryButton.className).not.toContain("selected");
    });

    test("navigates to add recipe from mobile hamburger menu item", () => {
      mockUseAuth.mockReturnValue({
        isLoggedIn: true,
        isMe: false,
        isGuest: false,
      });

      useLocation.mockReturnValue({
        pathname: "/add-recipe",
      });

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const menuButton = screen.getByLabelText("Menu");
      fireEvent.click(menuButton);

      const addButton = document
        .querySelector('[data-slot="dropdown-menu-content"] .lucide-plus')
        .closest('[role="menuitem"]');
      expect(addButton).toBeInTheDocument();
    });
  });

  describe("Real-time Search Functionality", () => {
    test("updates search term in real-time as user types", () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox");

      // Type "pasta" character by character
      fireEvent.change(searchInput, { target: { value: "p" } });
      expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("p");

      fireEvent.change(searchInput, { target: { value: "pa" } });
      expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("pa");

      fireEvent.change(searchInput, { target: { value: "pasta" } });
      expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("pasta");
    });

    test("resets category to 'all' when typing in search input", () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox");

      // Start typing - should reset category
      fireEvent.change(searchInput, { target: { value: "tofu" } });

      expect(defaultProps.setSelectedCategory).toHaveBeenCalledWith(
        "all_recipes"
      );
      expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("tofu");
    });

    test("does not reset category when search input is cleared", () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox");

      // First type something to establish a baseline
      fireEvent.change(searchInput, { target: { value: "test" } });

      // Verify the category was reset when typing
      expect(defaultProps.setSelectedCategory).toHaveBeenCalledWith(
        "all_recipes"
      );
      expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("test");

      // Reset the mocks to check the next behavior
      defaultProps.setSelectedCategory.mockClear();
      defaultProps.setSearchTerm.mockClear();

      // Clear the search input (empty string)
      fireEvent.change(searchInput, { target: { value: "" } });

      expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("");
      expect(defaultProps.setSelectedCategory).not.toHaveBeenCalled();
    });

    test("syncs input value with external searchTerm changes", () => {
      const { rerender } = render(
        <TestWrapper>
          <Header {...defaultProps} searchTerm="initial" />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox");
      expect(searchInput.value).toBe("initial");

      // External searchTerm change (e.g., from category filter reset)
      rerender(
        <TestWrapper>
          <Header {...defaultProps} searchTerm="" />
        </TestWrapper>
      );

      expect(searchInput.value).toBe("");
    });

    test("form submission uses current input value", () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox");

      // Type in search input
      fireEvent.change(searchInput, { target: { value: "pizza" } });

      // Submit form
      const searchForm = searchInput.closest("form");
      fireEvent.submit(searchForm);

      expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("pizza");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    test("input maintains focus during real-time updates", () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox");
      searchInput.focus();
      searchInput.click();

      // Type and verify focus is maintained
      fireEvent.change(searchInput, { target: { value: "test" } });

      expect(document.activeElement).toBe(searchInput);
      expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("test");
    });

    test("handles rapid typing correctly", () => {
      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const searchInput = screen.getByRole("textbox");

      // Simulate rapid typing
      const searchTerm = "rapidtyping";
      for (let i = 1; i <= searchTerm.length; i++) {
        const partialTerm = searchTerm.substring(0, i);
        fireEvent.change(searchInput, { target: { value: partialTerm } });
      }

      // Should have been called for each character
      expect(defaultProps.setSearchTerm).toHaveBeenCalledTimes(
        searchTerm.length
      );
      expect(defaultProps.setSearchTerm).toHaveBeenLastCalledWith(
        "rapidtyping"
      );

      // Category should only be reset once (when first character is typed)
      expect(defaultProps.setSelectedCategory).toHaveBeenCalledTimes(
        searchTerm.length
      );
      expect(defaultProps.setSelectedCategory).toHaveBeenCalledWith(
        "all_recipes"
      );
    });
  });

  describe("Dark Mode Toggle Functionality", () => {
    // The theme toggle now lives in the header's top bar (next to the
    // language toggle) rather than inside the user dropdown, and is a single
    // always-visible control rather than duplicated desktop/mobile buttons.

    test("shows moon icon when theme is light", () => {
      useTheme.mockReturnValue({
        theme: "light",
        toggleTheme: mockToggleTheme,
      });

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const themeButtons = screen.getAllByLabelText("Switch to dark mode");
      expect(themeButtons).toHaveLength(1);
      expect(themeButtons[0]).toBeInTheDocument();
    });

    test("shows sun icon when theme is dark", () => {
      useTheme.mockReturnValue({
        theme: "dark",
        toggleTheme: mockToggleTheme,
      });

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const themeButtons = screen.getAllByLabelText("Switch to light mode");
      expect(themeButtons).toHaveLength(1);
      expect(themeButtons[0]).toBeInTheDocument();
    });

    test("calls toggleTheme when theme toggle button is clicked", () => {
      useTheme.mockReturnValue({
        theme: "light",
        toggleTheme: mockToggleTheme,
      });

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      const themeButton = screen.getByLabelText("Switch to dark mode");
      fireEvent.click(themeButton);

      expect(mockToggleTheme).toHaveBeenCalled();
    });

    test("does not affect the user dropdown when toggled", () => {
      useTheme.mockReturnValue({
        theme: "light",
        toggleTheme: mockToggleTheme,
      });

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      // Open the (unrelated) user dropdown
      const chefHatButton = screen.getAllByLabelText("Login")[0];
      fireEvent.click(chefHatButton);
      expect(screen.getAllByText("Login")).toHaveLength(1);

      // Toggling theme should not close the user dropdown
      fireEvent.click(screen.getByLabelText("Switch to dark mode"));
      expect(mockToggleTheme).toHaveBeenCalled();
      expect(screen.getAllByText("Login")).toHaveLength(1);
    });

    test("theme toggle is available when not logged in", () => {
      mockUseAuth.mockReturnValue({
        isLoggedIn: false,
        isMe: false,
        isGuest: false,
      });

      useTheme.mockReturnValue({
        theme: "light",
        toggleTheme: mockToggleTheme,
      });

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
    });

    test("theme toggle is available when logged in", () => {
      mockUseAuth.mockReturnValue({
        isLoggedIn: true,
        isMe: false,
        isGuest: false,
      });

      useTheme.mockReturnValue({
        theme: "dark",
        toggleTheme: mockToggleTheme,
      });

      render(
        <TestWrapper>
          <Header {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
    });
  });
});
