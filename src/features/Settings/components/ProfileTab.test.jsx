import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileTab from "./ProfileTab";

const { mockUseOnlineStatus } = vi.hoisted(() => ({
  mockUseOnlineStatus: vi.fn(),
}));

vi.mock("@/hooks/ui/useOnlineStatus", () => ({
  useOnlineStatus: mockUseOnlineStatus,
}));

const t = (key) => key;

describe("ProfileTab", () => {
  const mockProps = {
    profileData: {
      first_name: "Brynne",
      username: "brynne0",
      email: "brynne@tutamail.com",
    },
    firstName: "Brynne",
    username: "brynne0",
    usernameError: "",
    hasUnsavedChanges: false,
    isSaving: false,
    handleSaveProfile: vi.fn(),
    handleCancelProfile: vi.fn(),
    handleChangePassword: vi.fn(),
    handleChangeEmail: vi.fn(),
    handleDeleteAccount: vi.fn(),
    setTempFirstName: vi.fn(),
    setTempUsername: vi.fn(),
    setUsernameError: vi.fn(),
    t,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOnlineStatus.mockReturnValue(true);
  });

  it("renders editable profile fields with their current values", () => {
    render(<ProfileTab {...mockProps} />);

    expect(screen.getByDisplayValue("Brynne")).not.toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("brynne0")).not.toHaveAttribute("readonly");
    expect(screen.getByDisplayValue("brynne@tutamail.com")).toBeInTheDocument();
  });

  it("passes typed values up", () => {
    render(<ProfileTab {...mockProps} />);

    fireEvent.change(screen.getByDisplayValue("Brynne"), {
      target: { value: "Bry" },
    });
    expect(mockProps.setTempFirstName).toHaveBeenCalledWith("Bry");
  });

  it("disables save/cancel when nothing has changed", () => {
    render(<ProfileTab {...mockProps} />);

    expect(screen.getByRole("button", { name: "save_changes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "cancel" })).toBeDisabled();
  });

  it("calls save and cancel handlers when there are changes", () => {
    render(<ProfileTab {...mockProps} hasUnsavedChanges={true} />);

    fireEvent.click(screen.getByRole("button", { name: "save_changes" }));
    expect(mockProps.handleSaveProfile).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(mockProps.handleCancelProfile).toHaveBeenCalled();
  });

  it("calls handleDeleteAccount when the delete account button is clicked", () => {
    render(<ProfileTab {...mockProps} />);

    fireEvent.click(screen.getByRole("button", { name: "delete_account" }));
    expect(mockProps.handleDeleteAccount).toHaveBeenCalled();
  });
});
