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
      expect(requirement.parentElement).toHaveClass("unmet");
    });
  });

  it("shows length requirement as met for 8+ character password", () => {
    render(<PasswordRequirements password="12345678" />);

    const lengthRequirement = screen.getByText("password_min_length").parentElement;
    expect(lengthRequirement).toHaveClass("met");
  });

  it("shows lowercase requirement as met when password contains lowercase", () => {
    render(<PasswordRequirements password="Password" />);

    const lowercaseRequirement = screen.getByText("password_lowercase").parentElement;
    expect(lowercaseRequirement).toHaveClass("met");
  });

  it("shows uppercase requirement as met when password contains uppercase", () => {
    render(<PasswordRequirements password="Password" />);

    const uppercaseRequirement = screen.getByText("password_uppercase").parentElement;
    expect(uppercaseRequirement).toHaveClass("met");
  });

  it("shows digit requirement as met when password contains digits", () => {
    render(<PasswordRequirements password="Password123" />);

    const digitRequirement = screen.getByText("password_digit").parentElement;
    expect(digitRequirement).toHaveClass("met");
  });

  it("shows symbol requirement as met when password contains symbols", () => {
    render(<PasswordRequirements password="Password123!" />);

    const symbolRequirement = screen.getByText("password_symbol").parentElement;
    expect(symbolRequirement).toHaveClass("met");
  });

  it("shows all requirements as met for strong password", () => {
    render(<PasswordRequirements password="Password123!" />);

    const requirements = screen.getAllByText(/password_/);
    requirements.forEach((requirement) => {
      expect(requirement.parentElement).toHaveClass("met");
    });
  });

  it("shows mixed requirements for partially strong password", () => {
    render(<PasswordRequirements password="password123" />); // Missing uppercase and symbol

    const lengthRequirement = screen.getByText("password_min_length").parentElement;
    const lowercaseRequirement = screen.getByText("password_lowercase").parentElement;
    const uppercaseRequirement = screen.getByText("password_uppercase").parentElement;
    const digitRequirement = screen.getByText("password_digit").parentElement;
    const symbolRequirement = screen.getByText("password_symbol").parentElement;

    expect(lengthRequirement).toHaveClass("met");
    expect(lowercaseRequirement).toHaveClass("met");
    expect(uppercaseRequirement).toHaveClass("unmet");
    expect(digitRequirement).toHaveClass("met");
    expect(symbolRequirement).toHaveClass("unmet");
  });

  it("renders check icons for met requirements", () => {
    render(<PasswordRequirements password="Password123!" />);

    const metRequirements = screen.getAllByText(/password_/).filter(element => 
      element.parentElement.classList.contains('met')
    );
    expect(metRequirements).toHaveLength(5); // All 5 requirements met
  });

  it("renders X icons for unmet requirements", () => {
    render(<PasswordRequirements password="pass" />);

    const unmetRequirements = screen.getAllByText(/password_/).filter(element => 
      element.parentElement.classList.contains('unmet')
    );
    expect(unmetRequirements).toHaveLength(4); // 4 requirements unmet (only lowercase is met)
  });
});