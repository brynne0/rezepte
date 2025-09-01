import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { useState } from "react";
import Settings from "./Settings";

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

vi.mock("../../services/userService", () => ({
  getUserPreferredLanguage: vi.fn(),
  updateUserPreferredLanguage: vi.fn(),
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  checkUsernameExists: vi.fn(),
  deleteUserAccount: vi.fn(),
}));

vi.mock("../../components/LoadingAcorn/LoadingAcorn", () => ({
  default: () => <div data-testid="loading-acorn">Loading...</div>,
}));

const mockNavigateWithConfirmation = vi.fn();

vi.mock("../../hooks/ui/useUnsavedChanges", () => ({
  useUnsavedChanges: () => ({
    isModalOpen: false,
    navigate: mockNavigateWithConfirmation,
    confirmNavigation: vi.fn(),
    cancelNavigation: vi.fn(),
    message: "unsaved_changes_warning",
  }),
}));

vi.mock("../../components/ConfirmationModal/ConfirmationModal", () => ({
  default: function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    requireConfirmation,
    confirmationText,
  }) {
    const [isConfirmed, setIsConfirmed] = useState(false);

    if (!isOpen) return null;

    return (
      <div data-testid="confirmation-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        {requireConfirmation && (
          <label>
            <input
              type="checkbox"
              data-testid="confirmation-checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
            />
            {confirmationText}
          </label>
        )}
        <button onClick={onClose} data-testid="modal-cancel">
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          data-testid="modal-confirm"
          disabled={requireConfirmation && !isConfirmed}
        >
          {confirmText}
        </button>
      </div>
    );
  },
}));

const mockChangeLanguage = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (key === "account_deleted_goodbye" && options?.name) {
        return `account_deleted_goodbye_${options.name}`;
      }
      if (options && options.name) {
        return `${key}_${options.name}`;
      }
      return key;
    },
    i18n: {
      changeLanguage: mockChangeLanguage,
    },
  }),
}));

// Wrapper component for router context
const SettingsWrapper = () => (
  <BrowserRouter>
    <Settings />
  </BrowserRouter>
);

describe("Settings", () => {
  let mockGetUserProfile;
  let mockGetUserPreferredLanguage;
  let mockUpdateUserProfile;
  let mockUpdateUserPreferredLanguage;
  let mockCheckUsernameExists;
  let mockDeleteUserAccount;

  beforeEach(async () => {
    // Import the mocked modules
    const {
      getUserProfile,
      getUserPreferredLanguage,
      updateUserProfile,
      updateUserPreferredLanguage,
      checkUsernameExists,
      deleteUserAccount,
    } = await import("../../services/userService");

    mockGetUserProfile = getUserProfile;
    mockGetUserPreferredLanguage = getUserPreferredLanguage;
    mockUpdateUserProfile = updateUserProfile;
    mockUpdateUserPreferredLanguage = updateUserPreferredLanguage;
    mockCheckUsernameExists = checkUsernameExists;
    mockDeleteUserAccount = deleteUserAccount;

    // Reset all mocks
    vi.clearAllMocks();
    mockChangeLanguage.mockClear();

    // Set up default mock return values
    mockGetUserProfile.mockResolvedValue({
      id: "test-user-id",
      first_name: "John",
      username: "johndoe",
      email: "john@example.com",
    });
    mockGetUserPreferredLanguage.mockResolvedValue("en");
    mockUpdateUserProfile.mockResolvedValue(true);
    mockUpdateUserPreferredLanguage.mockResolvedValue(true);
    mockCheckUsernameExists.mockResolvedValue(false);

    // Mock localStorage and sessionStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        clear: vi.fn(),
      },
      writable: true,
    });
    Object.defineProperty(window, "sessionStorage", {
      value: {
        clear: vi.fn(),
      },
      writable: true,
    });

    // Mock window.location.href
    delete window.location;
    window.location = { href: "" };
  });

  describe("Component Rendering", () => {
    it("renders loading state initially", async () => {
      mockGetUserProfile.mockImplementation(
        () => new Promise(() => {}) // Never resolves to keep loading
      );

      render(<SettingsWrapper />);

      expect(screen.getByTestId("loading-acorn")).toBeInTheDocument();
    });

    it("renders error state when profile loading fails", async () => {
      mockGetUserProfile.mockRejectedValue(new Error("Failed to load profile"));

      render(<SettingsWrapper />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it("renders settings form when data loads successfully", async () => {
      render(<SettingsWrapper />);

      await waitFor(() => {
        expect(screen.getByText("settings")).toBeInTheDocument();
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
        expect(screen.getByDisplayValue("johndoe")).toBeInTheDocument();
        expect(
          screen.getByDisplayValue("john@example.com")
        ).toBeInTheDocument();
      });
    });

    it("renders back arrow that navigates to previous page", async () => {
      render(<SettingsWrapper />);

      await waitFor(() => {
        expect(screen.getByText("settings")).toBeInTheDocument();
      });

      const backArrow = screen
        .getByRole("banner")
        .querySelector(".back-arrow-left");
      fireEvent.click(backArrow);

      expect(mockNavigateWithConfirmation).toHaveBeenCalledWith(-1);
    });
  });

  describe("First Name Editing", () => {
    beforeEach(async () => {
      render(<SettingsWrapper />);
      await waitFor(() => {
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      });
    });

    it("enables editing when pencil icon is clicked", () => {
      const firstNameInput = screen.getByDisplayValue("John");
      expect(firstNameInput).toHaveAttribute("readonly");

      const firstNameContainer = firstNameInput.closest(
        ".floating-label-input"
      );
      const pencilIcon = firstNameContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      expect(firstNameInput).not.toHaveAttribute("readonly");
      expect(firstNameInput.className).toContain("input--edit");
    });

    it("shows check and cancel buttons when editing", () => {
      const firstNameInput = screen.getByDisplayValue("John");
      const firstNameContainer = firstNameInput.closest(
        ".floating-label-input"
      );
      const pencilIcon = firstNameContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      expect(
        firstNameContainer.querySelector(".profile-settings-check")
      ).toBeInTheDocument();
      expect(
        firstNameContainer.querySelector(".profile-settings-cancel")
      ).toBeInTheDocument();
    });

    it("updates first name successfully", async () => {
      const firstNameInput = screen.getByDisplayValue("John");
      const firstNameContainer = firstNameInput.closest(
        ".floating-label-input"
      );
      const pencilIcon = firstNameContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      fireEvent.change(firstNameInput, { target: { value: "Jane" } });

      const checkButton = firstNameContainer.querySelector(
        ".profile-settings-check"
      );
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(mockUpdateUserProfile).toHaveBeenCalledWith({
          first_name: "Jane",
        });
        expect(
          screen.getByText("successfully_updated_first_name")
        ).toBeInTheDocument();
      });
    });

    it("cancels editing when cancel button is clicked", () => {
      const firstNameInput = screen.getByDisplayValue("John");
      const firstNameContainer = firstNameInput.closest(
        ".floating-label-input"
      );
      const pencilIcon = firstNameContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      fireEvent.change(firstNameInput, { target: { value: "Jane" } });

      const cancelButton = firstNameContainer.querySelector(
        ".profile-settings-cancel"
      );
      fireEvent.click(cancelButton);

      expect(firstNameInput).toHaveValue("John");
      expect(firstNameInput).toHaveAttribute("readonly");
    });
  });

  describe("Username Editing", () => {
    beforeEach(async () => {
      render(<SettingsWrapper />);
      await waitFor(() => {
        expect(screen.getByDisplayValue("johndoe")).toBeInTheDocument();
      });
    });

    it("enables username editing", () => {
      const usernameInput = screen.getByDisplayValue("johndoe");
      expect(usernameInput).toHaveAttribute("readonly");

      const usernameContainer = usernameInput.closest(".floating-label-input");
      const pencilIcon = usernameContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      expect(usernameInput).not.toHaveAttribute("readonly");
    });

    it("updates username successfully", async () => {
      const usernameInput = screen.getByDisplayValue("johndoe");
      const usernameContainer = usernameInput.closest(".floating-label-input");
      const pencilIcon = usernameContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      fireEvent.change(usernameInput, { target: { value: "newusername" } });

      const checkButton = usernameContainer.querySelector(
        ".profile-settings-check"
      );
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(mockCheckUsernameExists).toHaveBeenCalledWith("newusername");
        expect(mockUpdateUserProfile).toHaveBeenCalledWith({
          username: "newusername",
        });
        expect(
          screen.getByText("successfully_updated_username")
        ).toBeInTheDocument();
      });
    });

    it("shows error when username already exists", async () => {
      mockCheckUsernameExists.mockResolvedValue(true);

      const usernameInput = screen.getByDisplayValue("johndoe");
      const usernameContainer = usernameInput.closest(".floating-label-input");
      const pencilIcon = usernameContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      fireEvent.change(usernameInput, { target: { value: "existinguser" } });

      const checkButton = usernameContainer.querySelector(
        ".profile-settings-check"
      );
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText("username_already_exists")).toBeInTheDocument();
      });

      expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    });

    it("clears username error when user types", async () => {
      mockCheckUsernameExists.mockResolvedValue(true);

      const usernameInput = screen.getByDisplayValue("johndoe");
      const usernameContainer = usernameInput.closest(".floating-label-input");
      const pencilIcon = usernameContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      fireEvent.change(usernameInput, { target: { value: "existinguser" } });

      const checkButton = usernameContainer.querySelector(
        ".profile-settings-check"
      );
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText("username_already_exists")).toBeInTheDocument();
      });

      // Clear error by typing
      fireEvent.change(usernameInput, { target: { value: "newuser" } });

      expect(
        screen.queryByText("username_already_exists")
      ).not.toBeInTheDocument();
    });
  });

  describe("Password Field", () => {
    it("renders readonly password field with pencil icon", async () => {
      render(<SettingsWrapper />);

      await waitFor(() => {
        const passwordInput = screen.getByDisplayValue("**************");
        expect(passwordInput).toBeInTheDocument();
        expect(passwordInput).toHaveAttribute("readonly");
      });
    });

    it("navigates to change password page when pencil is clicked", async () => {
      render(<SettingsWrapper />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("**************")).toBeInTheDocument();
      });

      const passwordInput = screen.getByDisplayValue("**************");
      const passwordContainer = passwordInput.closest(".floating-label-input");
      const pencilIcon = passwordContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      expect(mockNavigate).toHaveBeenCalledWith("/change-password", {
        state: { fromSettings: true },
      });
    });
  });

  describe("Language Preferences", () => {
    beforeEach(async () => {
      render(<SettingsWrapper />);
      await waitFor(() => {
        expect(screen.getByText("PREFERRED_LANGUAGE")).toBeInTheDocument();
      });
    });

    it("displays current language selection", () => {
      expect(screen.getByText("EN")).toBeInTheDocument();
      expect(screen.getByText("DE")).toBeInTheDocument();

      // EN should be selected by default (mocked to return "en")
      const enSpan = screen.getByText("EN");
      expect(enSpan.className).toContain("selected");
    });

    it("enables language editing when pencil is clicked", () => {
      const languageContainer = screen
        .getByText("EN")
        .closest(".profile-settings-language-container");
      const pencilIcon = languageContainer.querySelector(".btn");
      fireEvent.click(pencilIcon);

      // Language options should become clickable
      const enOption = screen.getByText("EN");
      const deOption = screen.getByText("DE");
      expect(enOption).toBeInTheDocument();
      expect(deOption).toBeInTheDocument();
    });

    it("updates language preference successfully", async () => {
      const languageContainer = screen
        .getByText("EN")
        .closest(".profile-settings-language-container");
      const pencilIcon = languageContainer.querySelector(".btn");
      fireEvent.click(pencilIcon);

      // Click on DE option
      const deOption = screen.getByText("DE");
      fireEvent.click(deOption);

      // Click check button
      const checkButton = languageContainer.querySelector(
        ".profile-settings-check"
      );
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(mockUpdateUserPreferredLanguage).toHaveBeenCalledWith("de");
        expect(mockChangeLanguage).toHaveBeenCalledWith("de");
        expect(
          screen.getByText("successfully_updated_language")
        ).toBeInTheDocument();
      });
    });

    it("cancels language editing", () => {
      const languageContainer = screen
        .getByText("EN")
        .closest(".profile-settings-language-container");
      const pencilIcon = languageContainer.querySelector(".btn");
      fireEvent.click(pencilIcon);

      // Click on DE option
      const deOption = screen.getByText("DE");
      fireEvent.click(deOption);

      // Click cancel button
      const cancelButton = languageContainer.querySelector(
        ".profile-settings-cancel"
      );
      fireEvent.click(cancelButton);

      // Should return to non-editing state - pencil icon should be back
      expect(
        languageContainer.querySelector(".profile-settings-cancel")
      ).not.toBeInTheDocument();
      expect(languageContainer.querySelector(".btn")).toBeInTheDocument();
    });
  });

  describe("Delete Account", () => {
    beforeEach(async () => {
      render(<SettingsWrapper />);
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "delete_account" })
        ).toBeInTheDocument();
      });
    });

    it("renders delete account button", () => {
      expect(
        screen.getByRole("button", { name: "delete_account" })
      ).toBeInTheDocument();
    });

    it("opens confirmation modal when delete button is clicked", () => {
      fireEvent.click(screen.getByRole("button", { name: "delete_account" }));

      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
      expect(screen.getByText("delete_account")).toBeInTheDocument();
      expect(
        screen.getByText("delete_account_confirmation")
      ).toBeInTheDocument();
    });

    it("displays confirmation checkbox with warning text", () => {
      fireEvent.click(screen.getByRole("button", { name: "delete_account" }));

      expect(screen.getByTestId("confirmation-checkbox")).toBeInTheDocument();
      expect(screen.getByText("delete_account_warning")).toBeInTheDocument();
    });

    it("disables confirm button initially when checkbox is required", () => {
      fireEvent.click(screen.getByRole("button", { name: "delete_account" }));

      const confirmButton = screen.getByTestId("modal-confirm");
      expect(confirmButton).toBeDisabled();
    });

    it("enables confirm button when checkbox is checked", async () => {
      fireEvent.click(screen.getByRole("button", { name: "delete_account" }));

      const checkbox = screen.getByTestId("confirmation-checkbox");
      const confirmButton = screen.getByTestId("modal-confirm");

      expect(confirmButton).toBeDisabled();

      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
    });

    it("closes modal when cancel button is clicked", () => {
      fireEvent.click(screen.getByRole("button", { name: "delete_account" }));
      fireEvent.click(screen.getByTestId("modal-cancel"));

      expect(
        screen.queryByTestId("confirmation-modal")
      ).not.toBeInTheDocument();
    });

    it("calls deleteUserAccount when confirmed", async () => {
      mockDeleteUserAccount.mockResolvedValue();

      fireEvent.click(screen.getByRole("button", { name: "delete_account" }));
      fireEvent.click(screen.getByTestId("confirmation-checkbox"));
      fireEvent.click(screen.getByTestId("modal-confirm"));

      await waitFor(() => {
        expect(mockDeleteUserAccount).toHaveBeenCalledTimes(1);
      });
    });

    it("shows success message with user's name after successful deletion", async () => {
      mockDeleteUserAccount.mockResolvedValue();

      fireEvent.click(screen.getByRole("button", { name: "delete_account" }));
      fireEvent.click(screen.getByTestId("confirmation-checkbox"));
      fireEvent.click(screen.getByTestId("modal-confirm"));

      await waitFor(() => {
        expect(
          screen.getByText("account_deleted_goodbye_John")
        ).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId("confirmation-modal")
      ).not.toBeInTheDocument();
    });

    it("clears localStorage and sessionStorage after successful deletion", async () => {
      mockDeleteUserAccount.mockResolvedValue();

      fireEvent.click(screen.getByRole("button", { name: "delete_account" }));
      fireEvent.click(screen.getByTestId("confirmation-checkbox"));
      fireEvent.click(screen.getByTestId("modal-confirm"));

      await waitFor(() => {
        expect(window.localStorage.clear).toHaveBeenCalled();
        expect(window.sessionStorage.clear).toHaveBeenCalled();
      });
    });

    it("shows error message when deletion fails", async () => {
      const errorMessage = "Failed to delete account";
      mockDeleteUserAccount.mockRejectedValue(new Error(errorMessage));

      fireEvent.click(screen.getByRole("button", { name: "delete_account" }));
      fireEvent.click(screen.getByTestId("confirmation-checkbox"));
      fireEvent.click(screen.getByTestId("modal-confirm"));

      await waitFor(() => {
        expect(screen.getByText(/delete_account_error/)).toBeInTheDocument();
      });

      expect(
        screen.queryByTestId("confirmation-modal")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText("account_deleted_goodbye_John")
      ).not.toBeInTheDocument();
    });

    it("handles deletion error and keeps user on page", async () => {
      mockDeleteUserAccount.mockRejectedValue(new Error("Network error"));

      fireEvent.click(screen.getByRole("button", { name: "delete_account" }));
      fireEvent.click(screen.getByTestId("confirmation-checkbox"));
      fireEvent.click(screen.getByTestId("modal-confirm"));

      await waitFor(() => {
        expect(screen.getByText(/delete_account_error/)).toBeInTheDocument();
      });

      // After error, the full form is no longer displayed - just the error message
      expect(
        screen.queryByRole("button", { name: "delete_account" })
      ).not.toBeInTheDocument();
      expect(window.localStorage.clear).not.toHaveBeenCalled();
      expect(window.sessionStorage.clear).not.toHaveBeenCalled();
    });
  });

  describe("Success Messages", () => {
    it("displays success messages temporarily", async () => {
      render(<SettingsWrapper />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      });

      // Trigger a successful update
      const firstNameInput = screen.getByDisplayValue("John");
      const firstNameContainer = firstNameInput.closest(
        ".floating-label-input"
      );
      const pencilIcon = firstNameContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      fireEvent.change(firstNameInput, { target: { value: "Jane" } });

      const checkButton = firstNameContainer.querySelector(
        ".profile-settings-check"
      );
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(
          screen.getByText("successfully_updated_first_name")
        ).toBeInTheDocument();
      });

      // Success message should be visible in the unified message area
      const messageArea = screen
        .getByText("successfully_updated_first_name")
        .closest(".success-message-wrapper");
      expect(messageArea).toContainElement(
        screen.getByText("successfully_updated_first_name")
      );
    });
  });

  describe("Error Handling", () => {
    it("handles service errors gracefully", async () => {
      mockUpdateUserProfile.mockRejectedValue(new Error("Service unavailable"));

      render(<SettingsWrapper />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      });

      const firstNameInput = screen.getByDisplayValue("John");
      const firstNameContainer = firstNameInput.closest(
        ".floating-label-input"
      );
      const pencilIcon = firstNameContainer.querySelector(".btn-icon-right");
      fireEvent.click(pencilIcon);

      fireEvent.change(firstNameInput, { target: { value: "Jane" } });

      const checkButton = firstNameContainer.querySelector(
        ".profile-settings-check"
      );
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });

    it("handles language update errors", async () => {
      mockUpdateUserPreferredLanguage.mockRejectedValue(
        new Error("Language service error")
      );

      render(<SettingsWrapper />);

      await waitFor(() => {
        expect(screen.getByText("PREFERRED_LANGUAGE")).toBeInTheDocument();
      });

      const languageContainer = screen
        .getByText("EN")
        .closest(".profile-settings-language-container");
      const pencilIcon = languageContainer.querySelector(".btn");
      fireEvent.click(pencilIcon);

      const deOption = screen.getByText("DE");
      fireEvent.click(deOption);

      const checkButton = languageContainer.querySelector(
        ".profile-settings-check"
      );
      fireEvent.click(checkButton);

      await waitFor(() => {
        expect(screen.getByText(/Error:/)).toBeInTheDocument();
      });
    });
  });
});
