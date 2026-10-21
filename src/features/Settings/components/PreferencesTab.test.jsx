import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PreferencesTab from "./PreferencesTab";

const {
  mockUseOnlineStatus,
  mockUseOfflineDownload,
  mockUseTheme,
  mockSetTheme,
} = vi.hoisted(() => ({
  mockUseOnlineStatus: vi.fn(),
  mockUseOfflineDownload: vi.fn(),
  mockUseTheme: vi.fn(),
  mockSetTheme: vi.fn(),
}));

vi.mock("@/hooks/ui/useOnlineStatus", () => ({
  useOnlineStatus: mockUseOnlineStatus,
}));

vi.mock("@/hooks/ui/useTheme", () => ({
  useTheme: mockUseTheme,
}));

vi.mock("../hooks/useOfflineDownload", () => ({
  useOfflineDownload: mockUseOfflineDownload,
}));

const t = (key) => key;

describe("PreferencesTab", () => {
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
      preferred_language: "en",
      friends_can_view_images: false,
    },
    handleLanguageChange: vi.fn(),
    handleFriendsCanViewImagesChange: vi.fn(),
    t,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOnlineStatus.mockReturnValue(true);
    mockUseOfflineDownload.mockReturnValue(baseOfflineDownloadState);
    mockUseTheme.mockReturnValue({ theme: "system", setTheme: mockSetTheme });
  });

  describe("Appearance", () => {
    it("marks the current theme as selected", () => {
      render(<PreferencesTab {...mockProps} />);

      expect(
        screen.getByRole("button", { name: "theme_system" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("button", { name: "theme_dark" })
      ).toHaveAttribute("aria-pressed", "false");
    });

    it("calls setTheme when a theme is picked", () => {
      render(<PreferencesTab {...mockProps} />);

      fireEvent.click(screen.getByRole("button", { name: "theme_dark" }));
      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });
  });

  describe("Language", () => {
    it("calls handleLanguageChange when a language is picked", () => {
      render(<PreferencesTab {...mockProps} />);

      fireEvent.click(screen.getByRole("button", { name: "DE" }));
      expect(mockProps.handleLanguageChange).toHaveBeenCalledWith("de");
    });
  });

  describe("Friends can view images", () => {
    it("calls the handler when toggled", () => {
      render(<PreferencesTab {...mockProps} />);

      fireEvent.click(screen.getByRole("switch"));
      expect(mockProps.handleFriendsCanViewImagesChange).toHaveBeenCalled();
    });
  });

  describe("Offline downloads", () => {
    it("shows the never-synced message and no delete button when there is no download status", () => {
      render(<PreferencesTab {...mockProps} />);

      expect(
        screen.getByText("offline_download_never_synced")
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "delete_downloads" })
      ).not.toBeInTheDocument();
    });

    it("calls startDownload when the download button is clicked", () => {
      render(<PreferencesTab {...mockProps} />);

      fireEvent.click(
        screen.getByRole("button", { name: /download_recipes_for_offline/ })
      );
      expect(mockStartDownload).toHaveBeenCalled();
    });

    it("disables the download button when offline", () => {
      mockUseOnlineStatus.mockReturnValue(false);
      render(<PreferencesTab {...mockProps} />);

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

      render(<PreferencesTab {...mockProps} />);

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

      render(<PreferencesTab {...mockProps} />);

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

      render(<PreferencesTab {...mockProps} />);

      expect(
        screen.getByText("offline_download_stale_suffix")
      ).toBeInTheDocument();
    });

    it("opens a confirmation dialog and only deletes downloads on confirm", () => {
      mockUseOfflineDownload.mockReturnValue({
        ...baseOfflineDownloadState,
        status: { completedAt: new Date().toISOString(), failedCount: 0 },
      });

      render(<PreferencesTab {...mockProps} />);

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

      render(<PreferencesTab {...mockProps} />);

      fireEvent.click(screen.getByRole("button", { name: "delete_downloads" }));
      fireEvent.click(screen.getByRole("button", { name: "cancel" }));

      expect(mockDeleteDownloads).not.toHaveBeenCalled();
      expect(
        screen.queryByText("delete_downloads_confirmation")
      ).not.toBeInTheDocument();
    });
  });
});
