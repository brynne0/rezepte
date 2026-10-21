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
    isEditingProfile: false,
    tempFirstName: "",
    tempUsername: "",
    usernameError: "",
    firstNameInputRef: { current: null },
    profileContainerRef: { current: null },
    handleEditProfile: vi.fn(),
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

  it("renders profile fields with their current values", () => {
    render(<ProfileTab {...mockProps} />);

    expect(screen.getByDisplayValue("Brynne")).toBeInTheDocument();
    expect(screen.getByDisplayValue("brynne0")).toBeInTheDocument();
    expect(screen.getByDisplayValue("brynne@tutamail.com")).toBeInTheDocument();
  });

  it("does not show save/cancel buttons when not editing", () => {
    render(<ProfileTab {...mockProps} />);

    expect(
      screen.queryByRole("button", { name: "save_changes" })
    ).not.toBeInTheDocument();
  });

  it("shows save/cancel buttons and calls handlers when editing", () => {
    render(<ProfileTab {...mockProps} isEditingProfile={true} />);

    fireEvent.click(screen.getByRole("button", { name: "save_changes" }));
    expect(mockProps.handleSaveProfile).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(mockProps.handleCancelProfile).toHaveBeenCalled();
  });

  it("calls handleEditProfile when the edit button is clicked", () => {
    render(<ProfileTab {...mockProps} />);

    fireEvent.click(screen.getByRole("button", { name: /edit_profile/ }));
    expect(mockProps.handleEditProfile).toHaveBeenCalled();
  });

  it("calls handleDeleteAccount when the delete account button is clicked", () => {
    render(<ProfileTab {...mockProps} />);

    fireEvent.click(screen.getByRole("button", { name: "delete_account" }));
    expect(mockProps.handleDeleteAccount).toHaveBeenCalled();
  });
});
