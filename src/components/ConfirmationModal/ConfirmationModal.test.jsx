import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import ConfirmationModal from "./ConfirmationModal";

describe("ConfirmationModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    title: "Delete Item",
    message: "Are you sure you want to delete this item?",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ConfirmationModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders modal content when isOpen is true", () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByText("Delete Item")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete this item?")
    ).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  test("renders without title when title is not provided", () => {
    render(<ConfirmationModal {...defaultProps} title={null} />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete this item?")
    ).toBeInTheDocument();
  });

  test("renders without title when title is undefined", () => {
    const { title: _, ...propsWithoutTitle } = defaultProps;
    render(<ConfirmationModal {...propsWithoutTitle} />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  test("uses custom button text when provided", () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Keep")).toBeInTheDocument();
    expect(screen.queryByText("Confirm")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  test("calls onClose when cancel button is clicked", () => {
    render(<ConfirmationModal {...defaultProps} />);

    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  test("calls onConfirm when confirm button is clicked", () => {
    render(<ConfirmationModal {...defaultProps} />);

    const confirmButton = screen.getByText("Confirm");
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test("calls onClose when overlay is clicked", () => {
    render(<ConfirmationModal {...defaultProps} />);

    const overlay = screen
      .getByText("Delete Item")
      .closest(".confirmation-modal-overlay");
    fireEvent.click(overlay);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  test("does not call onClose when modal content is clicked", () => {
    render(<ConfirmationModal {...defaultProps} />);

    const modalContent = screen
      .getByText("Delete Item")
      .closest(".confirmation-modal-content");
    fireEvent.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  test("applies correct CSS classes to elements", () => {
    const { container } = render(<ConfirmationModal {...defaultProps} />);

    expect(
      container.querySelector(".confirmation-modal-overlay")
    ).toBeInTheDocument();
    expect(
      container.querySelector(".confirmation-modal-content")
    ).toBeInTheDocument();
    expect(
      container.querySelector(".confirmation-modal-title")
    ).toBeInTheDocument();
    expect(
      container.querySelector(".confirmation-modal-message")
    ).toBeInTheDocument();
    expect(
      container.querySelector(".confirmation-modal-actions")
    ).toBeInTheDocument();
  });

  test("applies default button classes", () => {
    render(<ConfirmationModal {...defaultProps} />);

    const cancelButton = screen.getByText("Cancel");
    const confirmButton = screen.getByText("Confirm");

    expect(cancelButton).toHaveClass("btn", "btn-action", "btn-secondary");
    expect(confirmButton).toHaveClass("btn", "btn-action", "btn-danger");
  });

  test("applies custom confirmButtonType class", () => {
    render(<ConfirmationModal {...defaultProps} confirmButtonType="primary" />);

    const confirmButton = screen.getByText("Confirm");
    expect(confirmButton).toHaveClass("btn", "btn-action", "btn-primary");
    expect(confirmButton).not.toHaveClass("btn-danger");
  });

  test("handles different confirmButtonType values", () => {
    const { rerender } = render(
      <ConfirmationModal {...defaultProps} confirmButtonType="secondary" />
    );

    let confirmButton = screen.getByText("Confirm");
    expect(confirmButton).toHaveClass("btn-secondary");

    rerender(
      <ConfirmationModal {...defaultProps} confirmButtonType="primary" />
    );

    confirmButton = screen.getByText("Confirm");
    expect(confirmButton).toHaveClass("btn-primary");
  });

  test("renders message as paragraph element", () => {
    render(<ConfirmationModal {...defaultProps} />);

    const message = screen.getByText(
      "Are you sure you want to delete this item?"
    );
    expect(message.tagName).toBe("P");
    expect(message).toHaveClass("confirmation-modal-message");
  });

  test("renders title as h3 element when provided", () => {
    render(<ConfirmationModal {...defaultProps} />);

    const title = screen.getByText("Delete Item");
    expect(title.tagName).toBe("H3");
    expect(title).toHaveClass("confirmation-modal-title");
  });

  test("handles empty strings for optional props", () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        title=""
        confirmText=""
        cancelText=""
      />
    );

    // Empty title should NOT render h3 element
    const titleElement = screen.queryByRole("heading");
    expect(titleElement).not.toBeInTheDocument(); // ✅ Changed this

    // Buttons should exist but have empty text
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("");
    expect(buttons[1]).toHaveTextContent("");
  });

  test("overlay click event only triggers on direct overlay click", () => {
    render(<ConfirmationModal {...defaultProps} />);

    // Create a mock event that simulates clicking the overlay directly
    const overlay = screen
      .getByText("Delete Item")
      .closest(".confirmation-modal-overlay");

    // Mock event where target equals currentTarget (direct overlay click)
    const overlayClickEvent = {
      target: overlay,
      currentTarget: overlay,
    };

    fireEvent.click(overlay, overlayClickEvent);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
