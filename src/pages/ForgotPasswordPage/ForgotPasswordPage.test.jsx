import {
  render,
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ForgotPasswordPage from "./ForgotPasswordPage";
import { forgotPassword } from "../../services/auth";
import { validateForgotPasswordForm } from "../../utils/validation";

vi.mock("../../services/auth", () => ({
  forgotPassword: vi.fn(),
}));

vi.mock("../../utils/validation", () => ({
  validateForgotPasswordForm: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock("../LoadingAcorn/LoadingAcorn", () => ({
  default: () => <div data-testid="loading-acorn">Loading...</div>,
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form correctly", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByPlaceholderText("email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "send_reset_email" })
    ).toBeInTheDocument();
  });

  it("displays validation errors when form is submitted with invalid email", async () => {
    validateForgotPasswordForm.mockReturnValue({ email: "Invalid email" });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText("email");
    const submitButton = screen.getByRole("button", {
      name: "send_reset_email",
    });

    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid email")).toBeInTheDocument();
    });
  });

  it("calls forgotPassword with correct email when form is valid", async () => {
    validateForgotPasswordForm.mockReturnValue({});
    forgotPassword.mockResolvedValue({ error: null });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText("email");
    const submitButton = screen.getByRole("button", {
      name: "send_reset_email",
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith("test@example.com");
      expect(screen.getByText("password_reset_sent")).toBeInTheDocument();
    });
  });

  it("displays error message when forgotPassword fails", async () => {
    validateForgotPasswordForm.mockReturnValue({});
    forgotPassword.mockResolvedValue({ error: "Error" });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText("email");
    const submitButton = screen.getByRole("button", {
      name: "send_reset_email",
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("password_reset_failed")).toBeInTheDocument();
    });
  });

  it("clears validation errors when user types in the email field", () => {
    validateForgotPasswordForm.mockReturnValue({ email: "Invalid email" });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText("email");

    fireEvent.change(emailInput, { target: { value: "Invalid email" } });
    const submitButton = screen.getByRole("button", {
      name: "send_reset_email",
    });
    fireEvent.click(submitButton);

    expect(
      screen.getByText((content) => content.includes("Invalid email"))
    ).toBeInTheDocument();

    fireEvent.change(emailInput, { target: { value: "valid@example.com" } });
    expect(screen.queryByText("Invalid email")).not.toBeInTheDocument();
  });

  it("shows loading indicator while processing", async () => {
    validateForgotPasswordForm.mockReturnValue({});
    forgotPassword.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ error: null }), 1000)
        )
    );

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText("email");
    const submitButton = screen.getByRole("button", {
      name: "send_reset_email",
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    expect(screen.getByTestId("loading-acorn")).toBeInTheDocument();

    await waitForElementToBeRemoved(
      () => screen.queryByTestId("loading-acorn"),
      { timeout: 2000 }
    );
  });
});
