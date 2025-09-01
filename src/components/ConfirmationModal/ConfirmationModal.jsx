import { useState } from "react";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  secondaryMessage,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonType = "danger", // "danger" | "primary" | "secondary"
  requireConfirmation = false,
  confirmationText = "",
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    setIsConfirmed(false);
    onClose();
  };

  const handleConfirm = () => {
    setIsConfirmed(false);
    onConfirm();
  };

  return (
    <div className="confirmation-modal-overlay" onClick={handleOverlayClick}>
      <div className="confirmation-modal-content">
        {title && <h3 className="confirmation-modal-title">{title}</h3>}
        <p className="confirmation-modal-message">{message}</p>
        {secondaryMessage && (
          <p className="confirmation-modal-secondary-message">
            {secondaryMessage}
          </p>
        )}

        {requireConfirmation && (
          <div className="confirmation-checkbox-wrapper">
            <label className="confirmation-checkbox-label">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="confirmation-checkbox"
              />
              <span className="confirmation-checkbox-text">
                {confirmationText}
              </span>
            </label>
          </div>
        )}

        <div className="action-buttons">
          <button
            onClick={handleClose}
            className="btn btn-action btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={requireConfirmation && !isConfirmed}
            className={`btn btn-action btn-${confirmButtonType}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
