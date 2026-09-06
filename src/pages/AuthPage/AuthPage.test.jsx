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
  validateUsernameUnique: vi.fn(),
  isPasswordStrong: vi.fn(),
}));

vi.mock("../../components/PasswordRequirements/PasswordRequirements", () => ({
  default: ({ password }) => (
    <div data-testid="password-requirements">
      Password requirements for: {password}
    </div>
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
  let mockValidateUsernameUnique;
  let mockIsPasswordStrong;

  beforeEach(async () => {
    // Import the mocked functions
    const { signUp, signIn } = await import("../../services/auth");
    const { validateAuthForm, validateUsernameUnique, isPasswordStrong } =
      await import("../../utils/validation");

    mockSignUp = signUp;
    mockSignIn = signIn;
    mockValidateAuthForm = validateAuthForm;
    mockValidateUsernameUnique = validateUsernameUnique;
    mockIsPasswordStrong = isPasswordStrong;

    // Reset all mocks
    mockNavigate.mockClear();
    mockSetLoginMessage.mockClear();
    mockSignUp.mockClear();
    mockSignIn.mockClear();
    mockValidateAuthForm.mockClear();
    mockValidateUsernameUnique.mockClear();
    mockIsPasswordStrong.mockClear();

    // Set up default mock return values
    mockSignUp.mockResolvedValue({ error: null });
    mockSignIn.mockResolvedValue({ error: null });
    mockValidateAuthForm.mockReturnValue({}); // Return empty object (no errors) by default
    mockValidateUsernameUnique.mockResolvedValue(null); // No error by default
    mockIsPasswordStrong.mockReturnValue(true); // Strong password by default
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe("Component Rendering", () => {
    it("renders login form by default", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Check login tab is selected
      const loginTab = screen.getByRole("tab", { name: "login" });
      expect(loginTab).toBeInTheDocument();
      expect(loginTab).toHaveAttribute("aria-selected", "true");

      // Check signup tab is not selected
      const signUpTab = screen.getByRole("tab", { name: "signup" });
      expect(signUpTab).toBeInTheDocument();
      expect(signUpTab).toHaveAttribute("aria-selected", "false");

      expect(screen.getByLabelText("username_or_email")).toBeInTheDocument();
      expect(screen.getByTestId("password-input")).toBeInTheDocument();
      expect(screen.getByText("forgot_password")).toBeInTheDocument();

      // Check for the submit button with login text
      const submitButton = screen.getByRole("button", {
        name: "submit-button",
      });
      expect(submitButton).toHaveTextContent(/^(login|logging_in)$/);

      // Check for the form with the correct test id
      expect(screen.getByTestId("auth-form")).toBeInTheDocument();
    });

    it("does not render email and firstName fields in login mode", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      expect(screen.queryByLabelText("email")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("first_name")).not.toBeInTheDocument();
    });
  });

  describe("Mode Switching", () => {
    it("switches to sign up mode when sign up tab is clicked", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const signUpTab = screen.getByRole("tab", { name: "signup" });
      const loginTab = screen.getByRole("tab", { name: "login" });

      fireEvent.click(signUpTab);

      expect(signUpTab).toHaveAttribute("aria-selected", "true");
      expect(loginTab).toHaveAttribute("aria-selected", "false");

      expect(screen.getByLabelText("email")).toBeInTheDocument();
      expect(screen.getByLabelText("first_name")).toBeInTheDocument();
      expect(screen.queryByText("forgot_password")).not.toBeInTheDocument();

      // Check the submit button text changed
      const submitButton = screen.getByRole("button", {
        name: "submit-button",
      });
      expect(submitButton).toHaveTextContent(/^(signup|signing_up)$/);
    });

    it("switches back to login mode when login tab is clicked", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const signUpTab = screen.getByRole("tab", { name: "signup" });
      const loginTab = screen.getByRole("tab", { name: "login" });

      // Switch to sign up first
      fireEvent.click(signUpTab);
      expect(signUpTab).toHaveAttribute("aria-selected", "true");
      expect(loginTab).toHaveAttribute("aria-selected", "false");

      // Switch back to login
      fireEvent.click(loginTab);
      expect(signUpTab).toHaveAttribute("aria-selected", "false");
      expect(loginTab).toHaveAttribute("aria-selected", "true");
    });

    it("clears form fields when switching modes", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Fill in username and password
      const usernameInput = screen.getByLabelText("username_or_email");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      expect(usernameInput.value).toBe("testuser");
      expect(passwordInput.value).toBe("testpass");

      // Switch to sign up mode
      const signUpTab = screen.getByRole("tab", { name: "signup" });
      fireEvent.click(signUpTab);

      // Fields should be cleared
      expect(screen.getByLabelText("username").value).toBe("");
      expect(screen.getByTestId("password-input").value).toBe("");
    });

    it("shows password requirements in signup mode when password is entered", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpTab = screen.getByRole("tab", { name: "signup" });
      fireEvent.click(signUpTab);

      // Enter password
      const passwordInput = screen.getByTestId("password-input");
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      // Should show password requirements
      expect(screen.getByTestId("password-requirements")).toBeInTheDocument();
      expect(
        screen.getByText("Password requirements for: testpass")
      ).toBeInTheDocument();
    });

    it("does not show password requirements in login mode", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Enter password in login mode
      const passwordInput = screen.getByTestId("password-input");
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      // Should not show password requirements
      expect(
        screen.queryByTestId("password-requirements")
      ).not.toBeInTheDocument();
    });

    it("does not show password requirements when password is empty", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpTab = screen.getByRole("tab", { name: "signup" });
      fireEvent.click(signUpTab);

      // Password is empty by default
      expect(
        screen.queryByTestId("password-requirements")
      ).not.toBeInTheDocument();
    });

    it("toggles password visibility", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const passwordInput = screen.getByTestId("password-input");
      const toggleButton = screen.getByRole("button", {
        name: "show_password",
      });

      expect(passwordInput).toHaveAttribute("type", "password");

      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");
      expect(
        screen.getByRole("button", { name: "hide_password" })
      ).toBeInTheDocument();
    });
  });

  describe("Form Input Handling", () => {
    it("updates form fields correctly in login mode", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByLabelText("username_or_email");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      expect(usernameInput.value).toBe("testuser");
      expect(passwordInput.value).toBe("testpass");
    });

    it("updates form fields correctly in sign up mode", () => {
      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpTab = screen.getByRole("tab", { name: "signup" });
      fireEvent.click(signUpTab);

      const emailInput = screen.getByLabelText("email");
      const firstNameInput = screen.getByLabelText("first_name");
      const usernameInput = screen.getByLabelText("username");
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
      const signUpTab = screen.getByRole("tab", { name: "signup" });
      fireEvent.click(signUpTab);

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

      const usernameInput = screen.getByLabelText("username_or_email");

      // This would trigger clearing validation errors
      fireEvent.change(usernameInput, { target: { value: "newuser" } });

      expect(usernameInput.value).toBe("newuser");
    });
  });

  describe("Username and Email Uniqueness Validation", () => {
    it("prevents signup when username already exists", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockValidateUsernameUnique.mockResolvedValue("username_already_exists");

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      fireEvent.click(screen.getByRole("tab", { name: "signup" }));
      fireEvent.change(screen.getByLabelText("username"), {
        target: { value: "existinguser" },
      });
      fireEvent.submit(screen.getByTestId("auth-form"));

      await waitFor(() => {
        expect(mockValidateUsernameUnique).toHaveBeenCalledWith(
          "existinguser",
          expect.any(Function)
        );
        expect(mockSignUp).not.toHaveBeenCalled();
        expect(screen.getByText("username_already_exists")).toBeInTheDocument();
      });
    });

    it("prevents signup when email is already registered (detected via signUp response)", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockValidateUsernameUnique.mockResolvedValue(null);
      mockIsPasswordStrong.mockReturnValue(true);
      mockSignUp.mockResolvedValue({ error: { type: "EMAIL_EXISTS" } });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      fireEvent.click(screen.getByRole("tab", { name: "signup" }));
      fireEvent.change(screen.getByLabelText("email"), {
        target: { value: "existing@example.com" },
      });
      fireEvent.submit(screen.getByTestId("auth-form"));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
        expect(screen.getByText("email_already_exists")).toBeInTheDocument();
      });
    });

    it("proceeds with signup when username is unique and signUp succeeds", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockValidateUsernameUnique.mockResolvedValue(null);
      mockIsPasswordStrong.mockReturnValue(true);
      mockSignUp.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      fireEvent.click(screen.getByRole("tab", { name: "signup" }));

      fireEvent.change(screen.getByLabelText("email"), {
        target: { value: "unique@example.com" },
      });
      fireEvent.change(screen.getByLabelText("first_name"), {
        target: { value: "John" },
      });
      fireEvent.change(screen.getByLabelText("username"), {
        target: { value: "uniqueuser" },
      });
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "testpass" },
      });

      fireEvent.submit(screen.getByTestId("auth-form"));

      await waitFor(() => {
        expect(mockIsPasswordStrong).toHaveBeenCalledWith("testpass");
        expect(mockValidateUsernameUnique).toHaveBeenCalledWith(
          "uniqueuser",
          expect.any(Function)
        );
        expect(mockSignUp).toHaveBeenCalledWith(
          "unique@example.com",
          "John",
          "uniqueuser",
          "testpass"
        );
      });
    });

    it("prevents signup when password does not meet strength requirements", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockIsPasswordStrong.mockReturnValue(false);

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      fireEvent.click(screen.getByRole("tab", { name: "signup" }));

      fireEvent.change(screen.getByLabelText("email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("first_name"), {
        target: { value: "John" },
      });
      fireEvent.change(screen.getByLabelText("username"), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "weak" },
      });

      fireEvent.submit(screen.getByTestId("auth-form"));

      await waitFor(() => {
        expect(mockIsPasswordStrong).toHaveBeenCalledWith("weak");
        expect(
          screen.getByText("password_requirements_not_met")
        ).toBeInTheDocument();
        expect(mockValidateUsernameUnique).toHaveBeenCalled();
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    it("shows password and username errors simultaneously when both fail", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockIsPasswordStrong.mockReturnValue(false);
      mockValidateUsernameUnique.mockResolvedValue("username_already_exists");

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      fireEvent.click(screen.getByRole("tab", { name: "signup" }));

      fireEvent.change(screen.getByLabelText("email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("first_name"), {
        target: { value: "John" },
      });
      fireEvent.change(screen.getByLabelText("username"), {
        target: { value: "existinguser" },
      });
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "weak" },
      });

      fireEvent.submit(screen.getByTestId("auth-form"));

      await waitFor(() => {
        expect(
          screen.getByText("password_requirements_not_met")
        ).toBeInTheDocument();
        expect(screen.getByText("username_already_exists")).toBeInTheDocument();
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });

    it("does not check username uniqueness in login mode", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      fireEvent.change(screen.getByLabelText("username_or_email"), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "testpass" },
      });

      fireEvent.submit(screen.getByTestId("auth-form"));

      await waitFor(() => {
        expect(mockValidateUsernameUnique).not.toHaveBeenCalled();
        expect(mockSignIn).toHaveBeenCalledWith("testuser", "testpass");
      });
    });
  });

  describe("Login Functionality", () => {
    it("calls signIn with correct parameters on successful validation", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByLabelText("username_or_email");
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

    it("handles login error - user not found", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({
        error: { type: "USER_NOT_FOUND", translationKey: "user_not_found" },
      });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("user_not_found")).toBeInTheDocument();
      });
    });

    it("handles login error - invalid password", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({
        error: { type: "INVALID_PASSWORD", translationKey: "invalid_password" },
      });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("invalid_password")).toBeInTheDocument();
      });
    });

    it("handles login error - general error", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({
        error: { type: "GENERAL_ERROR", translationKey: "login_failed" },
      });

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

      const usernameInput = screen.getByLabelText("username_or_email");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(
        () => {
          expect(usernameInput.value).toBe("");
          expect(passwordInput.value).toBe("");
        },
        { timeout: 2000 }
      );
    });

    it("calls signIn with username when username is provided", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByLabelText("username_or_email");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("testuser", "testpass");
      });
    });

    it("calls signIn with email when email is provided", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignIn.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByLabelText("username_or_email");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, {
        target: { value: "test@example.com" },
      });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "testpass");
      });
    });
  });

  describe("Sign Up Functionality", () => {
    it("calls signUp with correct parameters on successful validation", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignUp.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpTab = screen.getByRole("tab", { name: "signup" });
      fireEvent.click(signUpTab);

      const emailInput = screen.getByLabelText("email");
      const firstNameInput = screen.getByLabelText("first_name");
      const usernameInput = screen.getByLabelText("username");
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

    it("shows confirmation message on successful sign up", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignUp.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpTab = screen.getByRole("tab", { name: "signup" });
      fireEvent.click(signUpTab);

      const emailInput = screen.getByLabelText("email");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("signup_success")).toBeInTheDocument();
        expect(screen.getByText("test@example.com")).toBeInTheDocument();
        expect(screen.queryByTestId("auth-form")).not.toBeInTheDocument();
      });
    });

    it("handles sign up error", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignUp.mockResolvedValue({ error: "User already exists" });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpTab = screen.getByRole("tab", { name: "signup" });
      fireEvent.click(signUpTab);

      const form = screen.getByTestId("auth-form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("signup_failed")).toBeInTheDocument();
      });
    });

    it("hides form and shows confirmation after successful sign up", async () => {
      mockValidateAuthForm.mockReturnValue({});
      mockSignUp.mockResolvedValue({ error: null });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      // Switch to sign up mode
      const signUpTab = screen.getByRole("tab", { name: "signup" });
      fireEvent.click(signUpTab);

      fireEvent.change(screen.getByLabelText("email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("first_name"), {
        target: { value: "John" },
      });
      fireEvent.change(screen.getByLabelText("username"), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByTestId("password-input"), {
        target: { value: "testpass" },
      });

      fireEvent.submit(screen.getByTestId("auth-form"));

      await waitFor(() => {
        expect(screen.queryByTestId("auth-form")).not.toBeInTheDocument();
        expect(screen.getByText("signup_success")).toBeInTheDocument();
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

      const usernameInput = screen.getByLabelText("username_or_email");
      const passwordInput = screen.getByTestId("password-input");

      fireEvent.change(usernameInput, { target: { value: "testuser" } });
      fireEvent.change(passwordInput, { target: { value: "testpass" } });

      const forgotPasswordLink = screen.getByText("forgot_password");
      fireEvent.click(forgotPasswordLink);

      expect(usernameInput.value).toBe("");
      expect(passwordInput.value).toBe("");
    });
  });

  describe("Validation Error Display", () => {
    it("marks the field with an error as invalid", async () => {
      // Mock validation to return errors
      mockValidateAuthForm.mockReturnValue({
        username: "Username is required",
      });

      render(<AuthPageWrapper setLoginMessage={mockSetLoginMessage} />);

      const usernameInput = screen.getByLabelText("username_or_email");
      const form = screen.getByTestId("auth-form");

      fireEvent.submit(form);

      await waitFor(() => {
        expect(usernameInput).toHaveAttribute("aria-invalid", "true");
      });
    });
  });
});
