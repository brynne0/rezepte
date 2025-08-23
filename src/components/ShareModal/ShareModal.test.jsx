import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import ShareModal from "./ShareModal";
import * as sharingService from "../../services/sharingService";

// Mock i18n
const mockT = vi.fn((key) => key);
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

// Mock sharing service
vi.mock("../../services/sharingService", () => ({
  createShareLink: vi.fn(),
  stopSharing: vi.fn(),
  isRecipeShared: vi.fn(),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe("ShareModal Component", () => {
  const mockOnClose = vi.fn();
  const mockRecipe = {
    id: "123",
    title: "Test Recipe",
    slug: "test-recipe",
    share_token: "abc123def",
  };

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    recipe: mockRecipe,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.location.origin for tests
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:3000" },
      writable: true,
    });
  });

  test("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ShareModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders modal content when isOpen is true and recipe not shared", async () => {
    sharingService.isRecipeShared.mockResolvedValue(false);
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByText("share_recipe")).toBeInTheDocument();
    expect(screen.getByText("cancel")).toBeInTheDocument();
    expect(screen.getByText("create_share_link")).toBeInTheDocument();
  });

  test("calls onClose when cancel button is clicked", async () => {
    sharingService.isRecipeShared.mockResolvedValue(false);
    render(<ShareModal {...defaultProps} />);

    const cancelButton = screen.getByText("cancel");
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when overlay is clicked", async () => {
    sharingService.isRecipeShared.mockResolvedValue(false);
    render(<ShareModal {...defaultProps} />);

    const overlay = screen
      .getByText("share_recipe")
      .closest(".confirmation-modal-overlay");
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("does not call onClose when modal content is clicked", async () => {
    sharingService.isRecipeShared.mockResolvedValue(false);
    render(<ShareModal {...defaultProps} />);

    const modalContent = screen
      .getByText("share_recipe")
      .closest(".confirmation-modal-content");
    fireEvent.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test("checks if recipe is shared on mount", async () => {
    sharingService.isRecipeShared.mockResolvedValue(false);
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(sharingService.isRecipeShared).toHaveBeenCalledWith("123");
    });
  });

  test("shows share URL when recipe is already shared", async () => {
    sharingService.isRecipeShared.mockResolvedValue(true);
    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("http://localhost:3000/shared/abc123def/test-recipe")
      ).toBeInTheDocument();
    });
  });

  test("creates share link when create button is clicked", async () => {
    sharingService.isRecipeShared.mockResolvedValue(false);
    sharingService.createShareLink.mockResolvedValue({
      shareToken: "newtoken123",
      shareUrl: "http://localhost:3000/shared/newtoken123/test-recipe",
      isExisting: false,
    });

    render(<ShareModal {...defaultProps} />);

    const createButton = screen.getByText("create_share_link");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(sharingService.createShareLink).toHaveBeenCalledWith("123");
    });

    await waitFor(() => {
      expect(
        screen.getByText("http://localhost:3000/shared/newtoken123/test-recipe")
      ).toBeInTheDocument();
    });
  });

  test("shows loading state when creating share link", async () => {
    sharingService.isRecipeShared.mockResolvedValue(false);
    sharingService.createShareLink.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<ShareModal {...defaultProps} />);

    const createButton = screen.getByText("create_share_link");
    fireEvent.click(createButton);

    expect(screen.getByText("generating")).toBeInTheDocument();
    expect(createButton).toBeDisabled();
  });

  test("handles create share link error", async () => {
    sharingService.isRecipeShared.mockResolvedValue(false);
    sharingService.createShareLink.mockRejectedValue(
      new Error("Failed to create link")
    );

    render(<ShareModal {...defaultProps} />);

    const createButton = screen.getByText("create_share_link");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to create link")).toBeInTheDocument();
    });
  });

  test("copies share URL to clipboard when copy button is clicked", async () => {
    sharingService.isRecipeShared.mockResolvedValue(true);
    navigator.clipboard.writeText.mockResolvedValue();

    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("http://localhost:3000/shared/abc123def/test-recipe")
      ).toBeInTheDocument();
    });

    const copyButton = screen.getByText("copy");
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost:3000/shared/abc123def/test-recipe"
      );
    });
  });

  test("shows copied state after copying", async () => {
    sharingService.isRecipeShared.mockResolvedValue(true);
    navigator.clipboard.writeText.mockResolvedValue();

    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("http://localhost:3000/shared/abc123def/test-recipe")
      ).toBeInTheDocument();
    });

    const copyButton = screen.getByText("copy");
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText("copied")).toBeInTheDocument();
    });
  });

  test("handles clipboard copy error", async () => {
    sharingService.isRecipeShared.mockResolvedValue(true);
    navigator.clipboard.writeText.mockRejectedValue(
      new Error("Clipboard error")
    );

    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("http://localhost:3000/shared/abc123def/test-recipe")
      ).toBeInTheDocument();
    });

    const copyButton = screen.getByText("copy");
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to copy link to clipboard")
      ).toBeInTheDocument();
    });
  });

  test("stops sharing when stop sharing button is clicked", async () => {
    sharingService.isRecipeShared.mockResolvedValue(true);
    sharingService.stopSharing.mockResolvedValue(true);

    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("http://localhost:3000/shared/abc123def/test-recipe")
      ).toBeInTheDocument();
    });

    const stopButton = screen.getByText("stop_sharing");
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(sharingService.stopSharing).toHaveBeenCalledWith("123");
    });
  });

  test("handles stop sharing error", async () => {
    sharingService.isRecipeShared.mockResolvedValue(true);
    sharingService.stopSharing.mockRejectedValue(
      new Error("Failed to stop sharing")
    );

    render(<ShareModal {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("http://localhost:3000/shared/abc123def/test-recipe")
      ).toBeInTheDocument();
    });

    const stopButton = screen.getByText("stop_sharing");
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to stop sharing")).toBeInTheDocument();
    });
  });

  test("generates correct share URL format with slug", async () => {
    const recipeWithSlug = {
      id: "456",
      title: "My Recipe",
      slug: "my-recipe",
      share_token: "token456",
    };

    sharingService.isRecipeShared.mockResolvedValue(true);
    render(<ShareModal {...defaultProps} recipe={recipeWithSlug} />);

    await waitFor(() => {
      expect(
        screen.getByText("http://localhost:3000/shared/token456/my-recipe")
      ).toBeInTheDocument();
    });
  });

  test("handles recipe without share_token", async () => {
    const recipeWithoutToken = {
      id: "789",
      title: "No Token Recipe",
      slug: "no-token-recipe",
    };

    sharingService.isRecipeShared.mockResolvedValue(false);
    render(<ShareModal {...defaultProps} recipe={recipeWithoutToken} />);

    expect(screen.getByText("create_share_link")).toBeInTheDocument();
  });

  test("handles missing recipe prop", () => {
    sharingService.isRecipeShared.mockResolvedValue(false);
    render(<ShareModal {...defaultProps} recipe={null} />);

    expect(screen.getByText("share_recipe")).toBeInTheDocument();
    expect(sharingService.isRecipeShared).not.toHaveBeenCalled();
  });

  test("applies correct CSS classes", async () => {
    sharingService.isRecipeShared.mockResolvedValue(true);
    const { container } = render(<ShareModal {...defaultProps} />);

    expect(
      container.querySelector(".confirmation-modal-overlay")
    ).toBeInTheDocument();
    expect(
      container.querySelector(".confirmation-modal-content")
    ).toBeInTheDocument();
    expect(
      container.querySelector(".confirmation-modal-title")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("http://localhost:3000/shared/abc123def/test-recipe")
      ).toBeInTheDocument();
    });

    expect(container.querySelector(".share-url-container")).toBeInTheDocument();
    expect(container.querySelector(".share-url-input")).toBeInTheDocument();
    expect(container.querySelector(".share-copy-button")).toBeInTheDocument();
  });
});
