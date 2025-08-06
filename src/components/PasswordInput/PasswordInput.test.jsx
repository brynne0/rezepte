import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import PasswordInput from "./PasswordInput";

describe("PasswordInput", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    placeholder: "Enter password",
    id: "password-input",
  };

  it("renders with all props correctly", () => {
    render(<PasswordInput {...defaultProps} />);

    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("id", "password-input");
    expect(input).toHaveValue("");
  });

  it("displays the correct value", () => {
    const testValue = "TestPassword123";
    render(<PasswordInput {...defaultProps} value={testValue} />);

    const input = screen.getByPlaceholderText("Enter password");
    expect(input).toHaveValue(testValue);
  });

  it("calls onChange when text is typed", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();

    render(<PasswordInput {...defaultProps} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText("Enter password");
    await user.type(input, "NewPassword");

    expect(mockOnChange).toHaveBeenCalledTimes(11); // Once for each character
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();

    render(<PasswordInput {...defaultProps} />);

    const input = screen.getByPlaceholderText("Enter password");
    const toggleButton = screen.getByRole("button", { name: "show_password" });

    // Initially, the input type should be "password"
    expect(input).toHaveAttribute("type", "password");

    // Click the toggle button to show the password
    await user.click(toggleButton);
    expect(input).toHaveAttribute("type", "text");

    // Click the toggle button again to hide the password
    await user.click(toggleButton);
    expect(input).toHaveAttribute("type", "password");
  });

  it("works without optional props", () => {
    render(<PasswordInput />);

    const input = screen.getByTestId("password-input");
    expect(input).toBeInTheDocument();
  });
});
