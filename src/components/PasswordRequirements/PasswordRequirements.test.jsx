import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PasswordRequirements from "./PasswordRequirements";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

describe("PasswordRequirements", () => {
  it("renders all password requirements", () => {
    render(<PasswordRequirements password="" />);

    expect(screen.getByText("password_min_length")).toBeInTheDocument();
    expect(screen.getByText("password_lowercase")).toBeInTheDocument();
    expect(screen.getByText("password_uppercase")).toBeInTheDocument();
    expect(screen.getByText("password_digit")).toBeInTheDocument();
    expect(screen.getByText("password_symbol")).toBeInTheDocument();
  });

  it("shows all requirements as unmet for empty password", () => {
    render(<PasswordRequirements password="" />);

    const requirements = screen.getAllByText(/password_/);
    requirements.forEach((requirement) => {
      expect(requirement).toHaveAttribute("data-met", "false");
    });
  });

  it("shows length requirement as met for 8+ character password", () => {
    render(<PasswordRequirements password="12345678" />);

    expect(screen.getByText("password_min_length")).toHaveAttribute(
      "data-met",
      "true"
    );
  });

  it("shows lowercase requirement as met when password contains lowercase", () => {
    render(<PasswordRequirements password="Password" />);

    expect(screen.getByText("password_lowercase")).toHaveAttribute(
      "data-met",
      "true"
    );
  });

  it("shows uppercase requirement as met when password contains uppercase", () => {
    render(<PasswordRequirements password="Password" />);

    expect(screen.getByText("password_uppercase")).toHaveAttribute(
      "data-met",
      "true"
    );
  });

  it("shows digit requirement as met when password contains digits", () => {
    render(<PasswordRequirements password="Password123" />);

    expect(screen.getByText("password_digit")).toHaveAttribute(
      "data-met",
      "true"
    );
  });

  it("shows symbol requirement as met when password contains symbols", () => {
    render(<PasswordRequirements password="Password123!" />);

    expect(screen.getByText("password_symbol")).toHaveAttribute(
      "data-met",
      "true"
    );
  });

  it("shows all requirements as met for strong password", () => {
    render(<PasswordRequirements password="Password123!" />);

    const requirements = screen.getAllByText(/password_/);
    requirements.forEach((requirement) => {
      expect(requirement).toHaveAttribute("data-met", "true");
    });
  });

  it("shows mixed requirements for partially strong password", () => {
    render(<PasswordRequirements password="password123" />); // Missing uppercase and symbol

    expect(screen.getByText("password_min_length")).toHaveAttribute(
      "data-met",
      "true"
    );
    expect(screen.getByText("password_lowercase")).toHaveAttribute(
      "data-met",
      "true"
    );
    expect(screen.getByText("password_uppercase")).toHaveAttribute(
      "data-met",
      "false"
    );
    expect(screen.getByText("password_digit")).toHaveAttribute(
      "data-met",
      "true"
    );
    expect(screen.getByText("password_symbol")).toHaveAttribute(
      "data-met",
      "false"
    );
  });

  it("renders check icons for met requirements", () => {
    render(<PasswordRequirements password="Password123!" />);

    const metRequirements = screen
      .getAllByText(/password_/)
      .filter((element) => element.getAttribute("data-met") === "true");
    expect(metRequirements).toHaveLength(5); // All 5 requirements met
  });

  it("renders X icons for unmet requirements", () => {
    render(<PasswordRequirements password="pass" />);

    const unmetRequirements = screen
      .getAllByText(/password_/)
      .filter((element) => element.getAttribute("data-met") === "false");
    expect(unmetRequirements).toHaveLength(4); // 4 requirements unmet (only lowercase is met)
  });
});
