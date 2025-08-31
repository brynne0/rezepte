import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ChangePasswordPage from "./ChangePasswordPage";

// Create mock functions
const mockNavigate = vi.fn();

// Create mock location state
const mockLocation = { state: null };

// Mock dependencies
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

vi.mock("../../lib/supabase", () => ({
  default: {
    auth: {
      setSession: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

vi.mock("../../services/auth", () => ({
  changePassword: vi.fn(),
  verifyCurrentPassword: vi.fn(),
}));

vi.mock("../../utils/validation", () => ({
  validateChangePasswordForm: vi.fn(),
  isPasswordStrong: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key, // Return the key as the translation for testing
  }),
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
    />
  ),
}));

vi.mock("../../components/LoadingAcorn/LoadingAcorn", () => ({
  default: () => <div data-testid="loading-acorn">Loading...</div>,
}));

vi.mock("../../components/PasswordRequirements/PasswordRequirements", () => ({
  default: ({ password }) => (
    <div data-testid="password-requirements">
      Password requirements for: {password}
    </div>
  ),
}));

// Wrapper component for router context
const ChangePasswordPageWrapper = () => (
  <BrowserRouter>
    <ChangePasswordPage />
  </BrowserRouter>
);

describe("ChangePasswordPage", () => {
  let mockSupabase;
  let mockChangePassword;
  let mockVerifyCurrentPassword;
  let mockValidateChangePasswordForm;
  let mockIsPasswordStrong;

  beforeEach(async () => {
    // Import the mocked modules
    const supabase = await import("../../lib/supabase");
    const { changePassword, verifyCurrentPassword } = await import(
      "../../services/auth"
    );
    const { validateChangePasswordForm, isPasswordStrong } = await import(
      "../../utils/validation"
    );

    mockSupabase = supabase.default;
    mockChangePassword = changePassword;
    mockVerifyCurrentPassword = verifyCurrentPassword;
    mockValidateChangePasswordForm = validateChangePasswordForm;
    mockIsPasswordStrong = isPasswordStrong;

    // Reset all mocks
    vi.clearAllMocks();

    // Reset location state
    mockLocation.state = null;

    // Mock window.location
    delete window.location;
    window.location = {
      hash: "",
      search: "",
    };

    // Set up default mock return values
    mockValidateChangePasswordForm.mockReturnValue({}); // No errors by default
    mockIsPasswordStrong.mockReturnValue(true); // Strong password by default
  });

  describe("Component Rendering", () => {
    it("renders loading state initially", async () => {
      mockSupabase.auth.getSession.mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep loading
      );

      render(<ChangePasswordPageWrapper />);

      expect(screen.getByTestId("loading-acorn")).toBeInTheDocument();
    });

    it("renders password change form when session is valid", async () => {
      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(screen.getByText("SET_NEW_PASSWORD")).toBeInTheDocument();
      });

      expect(screen.getByLabelText("new_password")).toBeInTheDocument();
      expect(screen.getByLabelText("new_password_repeat")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "confirm" })
      ).toBeInTheDocument();
    });

    it("renders invalid session message when no valid session", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(screen.getByText("invalid_reset_link")).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: "go_to_login" })
      ).toBeInTheDocument();
    });

    it("renders success message after successful password change", async () => {
      // Set up mocks for successful flow
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
      mockChangePassword.mockResolvedValue({ error: null });
      mockValidateChangePasswordForm.mockReturnValue({});

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      // Fill in the password fields
      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, {
        target: { value: "newPassword123" },
      });
      fireEvent.change(repeatPasswordInput, {
        target: { value: "newPassword123" },
      });

      // Submit the form
      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("password_changed")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: "login" })).toBeInTheDocument();
    });
  });

  describe("URL Parameter Handling", () => {
    it("handles access token and refresh token from hash", async () => {
      // Set up mocks for URL token handling
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });

      window.location.hash =
        "#access_token=test-access&refresh_token=test-refresh&type=recovery";

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
          access_token: "test-access",
          refresh_token: "test-refresh",
        });
      });
    });

    it("handles access token and refresh token from search params", async () => {
      // Set up mocks for URL token handling
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });

      window.location.search =
        "?access_token=test-access&refresh_token=test-refresh&type=recovery";

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
          access_token: "test-access",
          refresh_token: "test-refresh",
        });
      });
    });

    it("uses existing session when no URL tokens provided", async () => {
      // Set up mocks for existing session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      });

      expect(mockSupabase.auth.setSession).not.toHaveBeenCalled();
    });
  });

  describe("Session Validation", () => {
    it("shows error when setSession fails", async () => {
      window.location.hash =
        "#access_token=test-access&refresh_token=test-refresh";
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid session" },
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(screen.getByText("invalid_reset_link")).toBeInTheDocument();
      });
    });

    it("handles session initialization errors", async () => {
      mockSupabase.auth.getSession.mockRejectedValue(
        new Error("Session error")
      );

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(screen.getByText("invalid_reset_link")).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission and Validation", () => {
    it("calls validation before password change", async () => {
      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
      mockValidateChangePasswordForm.mockReturnValue({});

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, { target: { value: "newpass" } });
      fireEvent.change(repeatPasswordInput, { target: { value: "newpass" } });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      expect(mockValidateChangePasswordForm).toHaveBeenCalledWith(
        {
          oldPassword: "",
          newPassword: "newpass",
          newPasswordRepeat: "newpass",
        },
        expect.any(Function),
        false
      );
    });

    it("displays validation errors", async () => {
      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
      mockValidateChangePasswordForm.mockReturnValue({
        newPassword: "Password too short",
        newPasswordRepeat: "Passwords must match",
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Password too short")).toBeInTheDocument();
        expect(screen.getByText("Passwords must match")).toBeInTheDocument();
      });
    });

    it("prevents submission when validation fails", async () => {
      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
      mockValidateChangePasswordForm.mockReturnValue({
        newPassword: "Password too short",
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it("calls changePassword with new password when validation passes", async () => {
      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
      mockChangePassword.mockResolvedValue({ error: null });
      mockValidateChangePasswordForm.mockReturnValue({});

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, {
        target: { value: "newPassword123" },
      });
      fireEvent.change(repeatPasswordInput, {
        target: { value: "newPassword123" },
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith("newPassword123");
      });
    });

    it("shows success message on successful password change", async () => {
      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
      mockChangePassword.mockResolvedValue({ error: null });
      mockValidateChangePasswordForm.mockReturnValue({});

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, {
        target: { value: "newPassword123" },
      });
      fireEvent.change(repeatPasswordInput, {
        target: { value: "newPassword123" },
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("password_changed")).toBeInTheDocument();
      });
    });

    it("shows error message when password change fails", async () => {
      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
      mockChangePassword.mockResolvedValue({
        error: { message: "Password change failed" },
      });
      mockValidateChangePasswordForm.mockReturnValue({});

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, {
        target: { value: "newPassword123" },
      });
      fireEvent.change(repeatPasswordInput, {
        target: { value: "newPassword123" },
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText("password_change_failed: Password change failed")
        ).toBeInTheDocument();
      });
    });

    it("handles exceptions during password change", async () => {
      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
      mockChangePassword.mockRejectedValue(new Error("Network error"));
      mockValidateChangePasswordForm.mockReturnValue({});

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, {
        target: { value: "newPassword123" },
      });
      fireEvent.change(repeatPasswordInput, {
        target: { value: "newPassword123" },
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText("password_change_failed: Network error")
        ).toBeInTheDocument();
      });
    });

    it("shows error when session expires during password change", async () => {
      // Mock URL with access and refresh tokens to avoid the undefined getSession call
      Object.defineProperty(window, "location", {
        value: {
          hash: "#access_token=test-token&refresh_token=test-refresh",
          search: "",
        },
        writable: true,
      });

      // Set up initial valid session, then expired session during submission
      mockSupabase.auth.setSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
      mockValidateChangePasswordForm.mockReturnValue({});

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, {
        target: { value: "newPassword123" },
      });
      fireEvent.change(repeatPasswordInput, {
        target: { value: "newPassword123" },
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("session_expired")).toBeInTheDocument();
      });
    });

    it("clears error messages when user types", async () => {
      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });

      // First trigger an error
      mockValidateChangePasswordForm.mockReturnValue({
        newPassword: "Password too short",
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("Password too short")).toBeInTheDocument();
      });

      // Clear validation errors and type in password field
      mockValidateChangePasswordForm.mockReturnValue({});

      const newPasswordInput = screen.getByLabelText("new_password");
      fireEvent.change(newPasswordInput, { target: { value: "newpass" } });

      expect(newPasswordInput.value).toBe("newpass");
    });
  });

  describe("Settings Flow", () => {
    beforeEach(() => {
      // Set up location state to simulate coming from settings
      mockLocation.state = { fromSettings: true };

      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
    });

    it("renders old password field when coming from account settings", async () => {
      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(screen.getByLabelText("current_password")).toBeInTheDocument();
      });

      expect(screen.getByText("SET_NEW_PASSWORD")).toBeInTheDocument();
      expect(screen.getByLabelText("new_password")).toBeInTheDocument();
      expect(screen.getByLabelText("new_password_repeat")).toBeInTheDocument();
    });

    it("includes old password in validation when coming from account settings", async () => {
      mockValidateChangePasswordForm.mockReturnValue({});
      mockVerifyCurrentPassword.mockResolvedValue({ error: null });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const oldPasswordInput = screen.getByLabelText("current_password");
      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(oldPasswordInput, { target: { value: "oldpass" } });
      fireEvent.change(newPasswordInput, { target: { value: "newpass" } });
      fireEvent.change(repeatPasswordInput, { target: { value: "newpass" } });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      expect(mockValidateChangePasswordForm).toHaveBeenCalledWith(
        {
          oldPassword: "oldpass",
          newPassword: "newpass",
          newPasswordRepeat: "newpass",
        },
        expect.any(Function),
        true
      );
    });

    it("verifies old password before changing password", async () => {
      mockValidateChangePasswordForm.mockReturnValue({});
      mockVerifyCurrentPassword.mockResolvedValue({ error: null });
      mockChangePassword.mockResolvedValue({ error: null });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const oldPasswordInput = screen.getByLabelText("current_password");
      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(oldPasswordInput, { target: { value: "oldpass" } });
      fireEvent.change(newPasswordInput, { target: { value: "newpass" } });
      fireEvent.change(repeatPasswordInput, { target: { value: "newpass" } });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockVerifyCurrentPassword).toHaveBeenCalledWith("oldpass");
      });

      expect(mockChangePassword).toHaveBeenCalledWith("newpass");
    });

    it("shows error when old password verification fails", async () => {
      mockValidateChangePasswordForm.mockReturnValue({});
      mockVerifyCurrentPassword.mockResolvedValue({
        error: { message: "Current password is incorrect" },
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const oldPasswordInput = screen.getByLabelText("current_password");
      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(oldPasswordInput, { target: { value: "wrongpass" } });
      fireEvent.change(newPasswordInput, { target: { value: "newpass" } });
      fireEvent.change(repeatPasswordInput, { target: { value: "newpass" } });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText("current_password_incorrect")
        ).toBeInTheDocument();
      });

      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it("shows validation error for empty old password", async () => {
      mockValidateChangePasswordForm.mockReturnValue({
        oldPassword: "password_required",
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("password_required")).toBeInTheDocument();
      });

      expect(mockVerifyCurrentPassword).not.toHaveBeenCalled();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });
  });

  describe("Navigation", () => {
    it("navigates to auth page when go to login button is clicked", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "go_to_login" })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "go_to_login" }));

      expect(mockNavigate).toHaveBeenCalledWith("/auth-page");
    });

    it("navigates to auth page from success message", async () => {
      // Set up mocks for successful password change flow
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });
      mockChangePassword.mockResolvedValue({ error: null });
      mockValidateChangePasswordForm.mockReturnValue({});

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });

      // Submit form to show success message
      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, {
        target: { value: "newPassword123" },
      });
      fireEvent.change(repeatPasswordInput, {
        target: { value: "newPassword123" },
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "login" })
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "login" }));

      expect(mockNavigate).toHaveBeenCalledWith("/auth-page");
    });
  });

  describe("Input Handling", () => {
    beforeEach(async () => {
      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });
    });

    it("updates password values when user types", () => {
      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, { target: { value: "password123" } });
      fireEvent.change(repeatPasswordInput, {
        target: { value: "password123" },
      });

      expect(newPasswordInput.value).toBe("password123");
      expect(repeatPasswordInput.value).toBe("password123");
    });

    it("applies error class to inputs when validation fails", async () => {
      mockValidateChangePasswordForm.mockReturnValue({
        newPassword: "Password too short",
        newPasswordRepeat: "Passwords must match",
      });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        const newPasswordInput = screen.getByLabelText("new_password");
        const repeatPasswordInput = screen.getByLabelText(
          "new_password_repeat"
        );

        expect(newPasswordInput.className).toContain("input--error");
        expect(repeatPasswordInput.className).toContain("input--error");
      });
    });
  });

  describe("Password Validation and Requirements", () => {
    beforeEach(async () => {
      // Set up mocks for valid session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "test-token" } },
        error: null,
      });
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      });

      render(<ChangePasswordPageWrapper />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "confirm" })
        ).toBeInTheDocument();
      });
    });

    it("shows password requirements when user types in new password field", async () => {
      const newPasswordInput = screen.getByLabelText("new_password");
      
      fireEvent.change(newPasswordInput, { target: { value: "testpass" } });

      expect(screen.getByTestId("password-requirements")).toBeInTheDocument();
      expect(screen.getByText("Password requirements for: testpass")).toBeInTheDocument();
    });

    it("does not show password requirements when password is empty", () => {
      expect(screen.queryByTestId("password-requirements")).not.toBeInTheDocument();
    });

    it("validates password strength before submission", async () => {
      mockValidateChangePasswordForm.mockReturnValue({});
      mockIsPasswordStrong.mockReturnValue(false);

      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, { target: { value: "weak" } });
      fireEvent.change(repeatPasswordInput, { target: { value: "weak" } });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockIsPasswordStrong).toHaveBeenCalledWith("weak");
        expect(screen.getByText("password_requirements_not_met")).toBeInTheDocument();
        expect(mockChangePassword).not.toHaveBeenCalled();
      });
    });

    it("proceeds with password change when password is strong", async () => {
      mockValidateChangePasswordForm.mockReturnValue({});
      mockIsPasswordStrong.mockReturnValue(true);
      mockChangePassword.mockResolvedValue({ error: null });

      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, { target: { value: "StrongPass123!" } });
      fireEvent.change(repeatPasswordInput, { target: { value: "StrongPass123!" } });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockIsPasswordStrong).toHaveBeenCalledWith("StrongPass123!");
        expect(mockChangePassword).toHaveBeenCalledWith("StrongPass123!");
      });
    });

    it("combines validation errors and password strength errors", async () => {
      mockValidateChangePasswordForm.mockReturnValue({
        newPasswordRepeat: "passwords_do_not_match",
      });
      mockIsPasswordStrong.mockReturnValue(false);

      const newPasswordInput = screen.getByLabelText("new_password");
      const repeatPasswordInput = screen.getByLabelText("new_password_repeat");

      fireEvent.change(newPasswordInput, { target: { value: "weak" } });
      fireEvent.change(repeatPasswordInput, { target: { value: "different" } });

      const form = screen
        .getByRole("button", { name: "confirm" })
        .closest("form");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText("password_requirements_not_met")).toBeInTheDocument();
        expect(screen.getByText("passwords_do_not_match")).toBeInTheDocument();
        expect(mockChangePassword).not.toHaveBeenCalled();
      });
    });
  });
});
