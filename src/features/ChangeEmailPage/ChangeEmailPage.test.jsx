import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ChangeEmailPage from "./ChangeEmailPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useBlocker: () => ({ state: "unblocked" }),
  };
});

vi.mock("../../lib/supabase", () => ({
  default: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("../../services/auth", () => ({
  changeEmail: vi.fn(),
  verifyCurrentPassword: vi.fn(),
}));

vi.mock("../../utils/validation", () => ({
  validateChangeEmailForm: vi.fn(),
  validateEmailUniqueForChange: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

const ChangeEmailPageWrapper = () => (
  <BrowserRouter>
    <ChangeEmailPage />
  </BrowserRouter>
);

describe("ChangeEmailPage", () => {
  let mockSupabase;
  let mockChangeEmail;
  let mockVerifyCurrentPassword;
  let mockValidateChangeEmailForm;
  let mockValidateEmailUniqueForChange;

  beforeEach(async () => {
    const supabase = await import("../../lib/supabase");
    const { changeEmail, verifyCurrentPassword } = await import(
      "../../services/auth"
    );
    const { validateChangeEmailForm, validateEmailUniqueForChange } =
      await import("../../utils/validation");

    mockSupabase = supabase.default;
    mockChangeEmail = changeEmail;
    mockVerifyCurrentPassword = verifyCurrentPassword;
    mockValidateChangeEmailForm = validateChangeEmailForm;
    mockValidateEmailUniqueForChange = validateEmailUniqueForChange;

    vi.clearAllMocks();

    mockValidateChangeEmailForm.mockReturnValue({});
    mockValidateEmailUniqueForChange.mockResolvedValue(null);
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });
  });

  it("renders the change email form", () => {
    render(<ChangeEmailPageWrapper />);

    expect(screen.getByText("change_email")).toBeInTheDocument();
    expect(screen.getByLabelText("current_password")).toBeInTheDocument();
    expect(screen.getByLabelText("new_email")).toBeInTheDocument();
    expect(screen.getByLabelText("new_email_repeat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "confirm" })).toBeInTheDocument();
  });

  it("displays validation errors and does not submit", async () => {
    mockValidateChangeEmailForm.mockReturnValue({
      newEmail: "email_invalid",
      newEmailRepeat: "emails_do_not_match",
    });

    render(<ChangeEmailPageWrapper />);

    const form = screen
      .getByRole("button", { name: "confirm" })
      .closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("email_invalid")).toBeInTheDocument();
      expect(screen.getByText("emails_do_not_match")).toBeInTheDocument();
    });

    expect(mockVerifyCurrentPassword).not.toHaveBeenCalled();
    expect(mockChangeEmail).not.toHaveBeenCalled();
  });

  it("shows an error when current password verification fails", async () => {
    mockVerifyCurrentPassword.mockResolvedValue({
      error: { message: "Current password is incorrect" },
    });

    render(<ChangeEmailPageWrapper />);

    fireEvent.change(screen.getByLabelText("current_password"), {
      target: { value: "wrongpass" },
    });
    fireEvent.change(screen.getByLabelText("new_email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("new_email_repeat"), {
      target: { value: "new@example.com" },
    });

    const form = screen
      .getByRole("button", { name: "confirm" })
      .closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText("current_password_incorrect")
      ).toBeInTheDocument();
    });

    expect(mockChangeEmail).not.toHaveBeenCalled();
  });

  it("shows an error when the new email is already in use", async () => {
    mockVerifyCurrentPassword.mockResolvedValue({ error: null });
    mockValidateEmailUniqueForChange.mockResolvedValue("email_already_exists");

    render(<ChangeEmailPageWrapper />);

    fireEvent.change(screen.getByLabelText("current_password"), {
      target: { value: "correctpass" },
    });
    fireEvent.change(screen.getByLabelText("new_email"), {
      target: { value: "taken@example.com" },
    });
    fireEvent.change(screen.getByLabelText("new_email_repeat"), {
      target: { value: "taken@example.com" },
    });

    const form = screen
      .getByRole("button", { name: "confirm" })
      .closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("email_already_exists")).toBeInTheDocument();
    });

    expect(mockChangeEmail).not.toHaveBeenCalled();
  });

  it("calls changeEmail and shows success message on valid submission", async () => {
    mockVerifyCurrentPassword.mockResolvedValue({ error: null });
    mockChangeEmail.mockResolvedValue({ error: null });

    render(<ChangeEmailPageWrapper />);

    fireEvent.change(screen.getByLabelText("current_password"), {
      target: { value: "correctpass" },
    });
    fireEvent.change(screen.getByLabelText("new_email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("new_email_repeat"), {
      target: { value: "new@example.com" },
    });

    const form = screen
      .getByRole("button", { name: "confirm" })
      .closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockVerifyCurrentPassword).toHaveBeenCalledWith("correctpass");
      expect(mockChangeEmail).toHaveBeenCalledWith("new@example.com");
    });

    await waitFor(() => {
      expect(screen.getByText("email_change_requested")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "go_to_settings" }));
    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  it("shows an error message when changeEmail fails", async () => {
    mockVerifyCurrentPassword.mockResolvedValue({ error: null });
    mockChangeEmail.mockResolvedValue({
      error: { message: "Email change failed" },
    });

    render(<ChangeEmailPageWrapper />);

    fireEvent.change(screen.getByLabelText("current_password"), {
      target: { value: "correctpass" },
    });
    fireEvent.change(screen.getByLabelText("new_email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("new_email_repeat"), {
      target: { value: "new@example.com" },
    });

    const form = screen
      .getByRole("button", { name: "confirm" })
      .closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText("email_change_failed: Email change failed")
      ).toBeInTheDocument();
    });
  });

  it("shows session expired error when session is missing on submit", async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(<ChangeEmailPageWrapper />);

    fireEvent.change(screen.getByLabelText("current_password"), {
      target: { value: "correctpass" },
    });
    fireEvent.change(screen.getByLabelText("new_email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText("new_email_repeat"), {
      target: { value: "new@example.com" },
    });

    const form = screen
      .getByRole("button", { name: "confirm" })
      .closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("session_expired")).toBeInTheDocument();
    });

    expect(mockChangeEmail).not.toHaveBeenCalled();
  });
});
