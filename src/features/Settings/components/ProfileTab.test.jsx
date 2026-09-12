import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileTab from "./ProfileTab";

const { mockUseOnlineStatus, mockUseOfflineDownload } = vi.hoisted(() => ({
  mockUseOnlineStatus: vi.fn(),
  mockUseOfflineDownload: vi.fn(),
}));

vi.mock("@/hooks/ui/useOnlineStatus", () => ({
  useOnlineStatus: mockUseOnlineStatus,
}));

vi.mock("../hooks/useOfflineDownload", () => ({
  useOfflineDownload: mockUseOfflineDownload,
}));

const t = (key) => key;

describe("ProfileTab", () => {
  const mockStartDownload = vi.fn();
  const mockCancelDownload = vi.fn();
  const mockDeleteDownloads = vi.fn();

  const baseOfflineDownloadState = {
    isDownloading: false,
    progress: null,
    status: null,
    startDownload: mockStartDownload,
    cancelDownload: mockCancelDownload,
    deleteDownloads: mockDeleteDownloads,
  };

  const mockProps = {
    profileData: {
      first_name: "Brynne",
      username: "brynne0",
      email: "brynne@tutamail.com",
      preferred_language: "en",
      friends_can_view_images: false,
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
    handleLanguageChange: vi.fn(),
    handleFriendsCanViewImagesChange: vi.fn(),
    handleDeleteAccount: vi.fn(),
    setTempFirstName: vi.fn(),
    setTempUsername: vi.fn(),
    setUsernameError: vi.fn(),
    t,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOnlineStatus.mockReturnValue(true);
    mockUseOfflineDownload.mockReturnValue(baseOfflineDownloadState);
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

  describe("Offline downloads", () => {
    it("shows the never-synced message and no delete button when there is no download status", () => {
      render(<ProfileTab {...mockProps} />);

      expect(
        screen.getByText("offline_download_never_synced")
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "delete_downloads" })
      ).not.toBeInTheDocument();
    });

    it("calls startDownload when the download button is clicked", () => {
      render(<ProfileTab {...mockProps} />);

      fireEvent.click(
        screen.getByRole("button", { name: /download_recipes_for_offline/ })
      );
      expect(mockStartDownload).toHaveBeenCalled();
    });

    it("disables the download button when offline", () => {
      mockUseOnlineStatus.mockReturnValue(false);
      render(<ProfileTab {...mockProps} />);

      expect(
        screen.getByRole("button", { name: /download_recipes_for_offline/ })
      ).toBeDisabled();
    });

    it("shows a cancel button and progress while downloading", () => {
      mockUseOfflineDownload.mockReturnValue({
        ...baseOfflineDownloadState,
        isDownloading: true,
        progress: { current: 1, total: 4, recipeTitle: "Soup" },
      });

      render(<ProfileTab {...mockProps} />);

      expect(
        screen.getByRole("button", { name: /cancel_download/ })
      ).toBeInTheDocument();
      expect(screen.getByText("offline_download_progress")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /cancel_download/ }));
      expect(mockCancelDownload).toHaveBeenCalled();
    });

    it("shows the last-synced date and a delete button once downloaded", () => {
      mockUseOfflineDownload.mockReturnValue({
        ...baseOfflineDownloadState,
        status: { completedAt: new Date().toISOString(), failedCount: 0 },
      });

      render(<ProfileTab {...mockProps} />);

      expect(
        screen.getByText("offline_download_last_synced")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "delete_downloads" })
      ).toBeInTheDocument();
    });

    it("shows a stale warning when the download is older than the threshold", () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 31);
      mockUseOfflineDownload.mockReturnValue({
        ...baseOfflineDownloadState,
        status: { completedAt: staleDate.toISOString(), failedCount: 0 },
      });

      render(<ProfileTab {...mockProps} />);

      expect(
        screen.getByText("offline_download_stale_suffix")
      ).toBeInTheDocument();
    });

    it("opens a confirmation dialog and only deletes downloads on confirm", () => {
      mockUseOfflineDownload.mockReturnValue({
        ...baseOfflineDownloadState,
        status: { completedAt: new Date().toISOString(), failedCount: 0 },
      });

      render(<ProfileTab {...mockProps} />);

      fireEvent.click(screen.getByRole("button", { name: "delete_downloads" }));

      expect(
        screen.getByText("delete_downloads_confirmation")
      ).toBeInTheDocument();
      expect(mockDeleteDownloads).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "delete" }));
      expect(mockDeleteDownloads).toHaveBeenCalled();
    });

    it("does not delete downloads when the confirmation dialog is cancelled", () => {
      mockUseOfflineDownload.mockReturnValue({
        ...baseOfflineDownloadState,
        status: { completedAt: new Date().toISOString(), failedCount: 0 },
      });

      render(<ProfileTab {...mockProps} />);

      fireEvent.click(screen.getByRole("button", { name: "delete_downloads" }));
      fireEvent.click(screen.getByRole("button", { name: "cancel" }));

      expect(mockDeleteDownloads).not.toHaveBeenCalled();
      expect(
        screen.queryByText("delete_downloads_confirmation")
      ).not.toBeInTheDocument();
    });
  });
});
