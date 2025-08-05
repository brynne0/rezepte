import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import AuthPage from "./AuthPage";

// Create mock functions
const mockNavigate = vi.fn();
const mockSetLoginMessage = vi.fn();

// Mock dependencies
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key, // Return the key as the translation for simplicity
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../services/auth", () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("../../utils/validation", () => ({
  validateAuthForm: vi.fn(),
}));

vi.mock("../../components/PasswordInput/PasswordInput", () => ({
  default: ({ id, value, onChange, placeholder, className }) => (
    <input
      id={id}
      type="password"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      data-testid="password-input"
    />
  ),
}));

// Wrapper component for router context
const AuthPageWrapper = ({ setLoginMessage }) => (
  <BrowserRouter>
    <AuthPage setLoginMessage={setLoginMessage} />
  </BrowserRouter>
);

describe("AuthPage", () => {
  // Get the mocked functions after import
  let mockSignUp;
  let mockSignIn;
  let mockValidateAuthForm;

  beforeEach(async () => {
    // Import the mocked functions
    const { signUp, signIn } = await import("../../services/auth");
    const { validateAuthForm } = await import("../../utils/validation");

    mockSignUp = signUp;
    mockSignIn = signIn;
    mockValidateAuthForm = validateAuthForm;

    // Reset all mocks
    mockNavigate.mockClear();
    mockSetLoginMessage.mockClear();
    mockSignUp.mockClear();
    mockSignIn.mockClear();
    mockValidateAuthForm.mockClear();

    // Set up default mock return values
    mockSignUp.mockResolvedValue({ error: null });
    mockSignIn.mockResolvedValue({ error: null });
    mockValidateAuthForm.mockReturnValue({}); // Return empty object (no errors) by default
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe("Component Rendering", () => {
    it("renders login form by default", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Check login header is selected
      const loginHeaderButton = screen.getByRole("button", {
        name: "switch-to-login",
      });
      expect(loginHeaderButton).toBeInTheDocument();
      expect(loginHeaderButton.className).toContain("selected");

      // Check signup header is not selected
      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });
      expect(signUpHeaderButton).toBeInTheDocument();
      expect(signUpHeaderButton.className).not.toContain("selected");

      expect(screen.getByPlaceholderText("username")).toBeInTheDocument();
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
      expect(screen.getByText("forgot_password")).toBeInTheDocument();

      // Check for the submit button with login text
      const submitButton = screen.getByRole("button", {
        name: "submit-button",
      });
      expect(submitButton).toHaveTextContent("login");

      // Check for the form with the correct test id
      expect(screen.getByTestId("auth-form")).toBeInTheDocument();
    });

    it("does not render email and firstName fields in login mode", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      expect(screen.queryByPlaceholderText("email")).not.toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText("first_name")
      ).not.toBeInTheDocument();
    });
  });

  describe("Mode Switching", () => {
    it("switches to sign up mode when sign up button is clicked", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });
      const loginHeaderButton = screen.getByRole("button", {
        name: "switch-to-login",
      });

      fireEvent.click(signUpHeaderButton);

      expect(signUpHeaderButton.className).toContain("selected");
      expect(loginHeaderButton.className).not.toContain("selected");

      expect(screen.getByPlaceholderText("email")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("first_name")).toBeInTheDocument();
      expect(screen.queryByText("forgot_password")).not.toBeInTheDocument();

      // Check the submit button text changed
      const submitButton = screen.getByRole("button", {
        name: "submit-button",
      });
      expect(submitButton).toHaveTextContent("sign_up");
    });

    it("switches back to login mode when login button is clicked", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });
      const loginHeaderButton = screen.getByRole("button", {
        name: "switch-to-login",
      });

      // Switch to sign up first
      fireEvent.click(signUpHeaderButton);
      expect(signUpHeaderButton.className).toContain("selected");
      expect(loginHeaderButton.className).not.toContain("selected");

      // Switch back to login
      fireEvent.click(loginHeaderButton);
      expect(signUpHeaderButton.className).not.toContain("selected");
      expect(loginHeaderButton.className).toContain("selected");
    });

    it("clears form fields when switching modes", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Fill in username and password
      const usernameInput = screen.getByPlaceholderText("username");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      expect(usernameInput.value).toBe("testuser");
      expect(passwordInput.value).toBe("testpass");

      // Switch to sign up mode
      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });
      fireEvent.click(signUpHeaderButton);

      // Fields should be cleared
      expect(screen.getByPlaceholderText("username").value).toBe("");
      expect(screen.getByTestId("password-input").value).toBe("");
    });
  });

  describe("Form Input Handling", () => {
    it("updates form fields correctly in login mode", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByPlaceholderText("username");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      expect(usernameInput.value).toBe("testuser");
      expect(passwordInput.value).toBe("testpass");
    });

    it("updates form fields correctly in sign up mode", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });
      fireEvent.click(signUpHeaderButton);

      const emailInput = screen.getByPlaceholderText("email");
      const firstNameInput = screen.getByPlaceholderText("first_name");
      const usernameInput = screen.getByPlaceholderText("username");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(firstNameInput, { target: { value: "John" } });
      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      expect(emailInput.value).toBe("test@example.com");
      expect(firstNameInput.value).toBe("John");
      expect(usernameInput.value).toBe("testuser");
      expect(passwordInput.value).toBe("testpass");
    });
  });

  describe("Form Validation", () => {
    it("calls validation before login submission", () => {
      mockValidateAuthForm.mockReturnValue({});

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      expect(mockValidateAuthForm).toHaveBeenCalledWith(
        { email: "", firstName: "", username: "", password: "" },
        false,
        expect.any(Function)
      );
    });

    it("calls validation before sign up submission", () => {
      mockValidateAuthForm.mockReturnValue({});

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });
      fireEvent.click(signUpHeaderButton);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      expect(mockValidateAuthForm).toHaveBeenCalledWith(
        { email: "", firstName: "", username: "", password: "" },
        true,
        expect.any(Function)
      );
    });

    it("prevents submission when validation fails", () => {
      mockValidateAuthForm.mockReturnValue({
        username: "Username is required",
        password: "Password is required",
      });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      expect(mockSignIn).not.toHaveBeenCalled();
    });

    it("displays validation errors", async () => {
      // Mock validation to return errors
      mockValidateAuthForm.mockReturnValue({
        username: "Username is required",
        password: "Password is required",
      });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Username is required")).toBeInTheDocument();
        expect(screen.getByText("Password is required")).toBeInTheDocument();
      });
    });

    it("clears validation errors when user types", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByPlaceholderText("username");

      // This would trigger clearing validation errors
      fireEvent.change(usernameInput, { target: { value: "newuser" } });

      expect(usernameInput.value).toBe("newuser");
    });
  });

  describe("Login Functionality", () => {
    it("calls signIn with correct parameters on successful validation", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByPlaceholderText("username");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("testuser", "testpass");
      });
    });

    it("navigates on successful login", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSetLoginMessage).toHaveBeenCalledWith("login_success");
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });
    });

    it("handles login error", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({ error: "Invalid credentials" });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("login_failed")).toBeInTheDocument();
      });
    });

    it("clears form fields after login attempt", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByPlaceholderText("username");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(usernameInput.value).toBe("");
        expect(passwordInput.value).toBe("");
      });
    });
  });

  describe("Sign Up Functionality", () => {
    it("calls signUp with correct parameters on successful validation", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignUp.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });
      fireEvent.click(signUpHeaderButton);

      const emailInput = screen.getByPlaceholderText("email");
      const firstNameInput = screen.getByPlaceholderText("first_name");
      const usernameInput = screen.getByPlaceholderText("username");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(firstNameInput, { target: { value: "John" } });
      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          "test@example.com",
          "John",
          "testuser",
          "testpass"
        );
      });
    });

    it("navigates on successful sign up", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignUp.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });
      fireEvent.click(signUpHeaderButton);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSetLoginMessage).toHaveBeenCalledWith("signup_success");
        expect(mockNavigate).toHaveBeenCalledWith("/");
      });
    });

    it("handles sign up error", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignUp.mockResolvedValue({ error: "User already exists" });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });
      fireEvent.click(signUpHeaderButton);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("signup_failed")).toBeInTheDocument();
      });
    });

    it("clears all form fields after sign up attempt", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignUp.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });
      fireEvent.click(signUpHeaderButton);

      const emailInput = screen.getByPlaceholderText("email");
      const firstNameInput = screen.getByPlaceholderText("first_name");
      const usernameInput = screen.getByPlaceholderText("username");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(firstNameInput, { target: { value: "John" } });
      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(emailInput.value).toBe("");
        expect(firstNameInput.value).toBe("");
        expect(usernameInput.value).toBe("");
        expect(passwordInput.value).toBe("");
      });
    });
  });

  describe("Forgot Password Functionality", () => {
    it("navigates to forgot password page when link is clicked", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const forgotPasswordLink = screen.getByText("forgot_password");
      fireEvent.click(forgotPasswordLink);

      expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
    });

    it("clears form fields when navigating to forgot password", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByPlaceholderText("username");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      const forgotPasswordLink = screen.getByText("forgot_password");
      fireEvent.click(forgotPasswordLink);

      expect(usernameInput.value).toBe("");
      expect(passwordInput.value).toBe("");
    });
  });

  describe("CSS Classes and Styling", () => {
    it("applies selected class to active mode button", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const loginHeaderButton = screen.getByRole("button", {
        name: "switch-to-login",
      });
      const signUpHeaderButton = screen.getByRole("button", {
        name: "switch-to-signup",
      });

      expect(loginHeaderButton.className).toContain("selected");
      expect(signUpHeaderButton.className).not.toContain("selected");

      // Switch to sign up
      fireEvent.click(signUpHeaderButton);

      expect(loginHeaderButton.className).not.toContain("selected");
      expect(signUpHeaderButton.className).toContain("selected");
    });

    it("applies error classes to inputs with validation errors", async () => {
      // Mock validation to return errors
      mockValidateAuthForm.mockReturnValue({
        username: "Username is required",
      });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByPlaceholderText("username");
      const form = screen.getByTestId("auth-form");

      fireEvent.submit(form);

      await waitFor(() => {
        expect(usernameInput.className).toContain("input--error");
      });
    });
  });
});
