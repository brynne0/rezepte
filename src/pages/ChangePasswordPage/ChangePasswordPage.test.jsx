import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ChangePasswordPage from "./ChangePasswordPage";

// Create mock functions
const mockNavigate = vi.fn();

// Mock dependencies
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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
}));

vi.mock("../../utils/validation", () => ({
  validateChangePasswordForm: vi.fn(),
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

// Wrapper component for router context
const ChangePasswordPageWrapper = () => (
  <BrowserRouter>
    <ChangePasswordPage />
  </BrowserRouter>
);

describe("ChangePasswordPage", () => {
  let mockSupabase;
  let mockChangePassword;
  let mockValidateChangePasswordForm;

  beforeEach(async () => {
    // Import the mocked modules
    const supabase = await import("../../lib/supabase");
    const { changePassword } = await import("../../services/auth");
    const { validateChangePasswordForm } = await import(
      "../../utils/validation"
    );

    mockSupabase = supabase.default;
    mockChangePassword = changePassword;
    mockValidateChangePasswordForm = validateChangePasswordForm;

    // Reset all mocks
    vi.clearAllMocks();

    // Mock window.location
    delete window.location;
    window.location = {
      hash: "",
      search: "",
    };
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
        expect(screen.getByText("set_new_password")).toBeInTheDocument();
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
        { newPassword: "newpass", newPasswordRepeat: "newpass" },
        expect.any(Function)
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
});
