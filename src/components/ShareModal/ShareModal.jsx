import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check } from "lucide-react";
import {
  createShareLink,
  stopSharing,
  isRecipeShared,
} from "../../services/sharingService";

const ShareModal = ({ isOpen, onClose, recipe }) => {
  const { t } = useTranslation();
  const [shareUrl, setShareUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const checkIfRecipeIsShared = useCallback(async () => {
    if (!recipe) return;

    try {
      const shared = await isRecipeShared(recipe.id);
      setIsShared(shared);
      if (shared && recipe.share_token) {
        setShareUrl(
          `${window.location.origin}/shared/${recipe.share_token}/${recipe.slug}`
        );
      }
    } catch (err) {
      console.error("Error checking share status:", err);
    }
  }, [recipe]);

  useEffect(() => {
    if (isOpen && recipe) {
      checkIfRecipeIsShared();
    }
  }, [isOpen, recipe, checkIfRecipeIsShared]);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    setError("");

    try {
      const result = await createShareLink(recipe.id);
      setShareUrl(result.shareUrl);
      setIsShared(true);
    } catch (error) {
      setError(error.message || "Failed to create share link");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Failed to copy link to clipboard");
    }
  };

  const handleStopSharing = async () => {
    setIsStopping(true);
    setError("");

    try {
      await stopSharing(recipe.id);
      setIsShared(false);
      setShareUrl("");
    } catch (error) {
      setError(error.message || "Failed to remove sharing");
    } finally {
      setIsStopping(false);
    }
  };

  const handleClose = () => {
    setError("");
    setCopied(false);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="confirmation-modal-overlay" onClick={handleOverlayClick}>
      <div className="confirmation-modal-content">
        <h3 className="confirmation-modal-title flex-center">
          {t("share_recipe")}
        </h3>

        {error && <div className="share-error-box">{error}</div>}

        {!isShared ? (
          <>
            {t("share_recipe_description")}
            <p className="warning-notice">
              <strong>{t("note")}:</strong> {t("public_link_note")}
            </p>
            <div className="action-buttons">
              <button
                className="btn btn-action btn-secondary"
                onClick={handleClose}
              >
                {t("cancel")}
              </button>
              <button
                className="btn btn-action btn-primary"
                onClick={handleGenerateLink}
                disabled={isGenerating}
              >
                {isGenerating ? t("generating") : t("create_share_link")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="share-url-container">
              <div className="share-url-input">{shareUrl}</div>
              <button
                className={`btn btn-action btn-secondary share-copy-button ${
                  copied ? "copied" : ""
                }`}
                onClick={handleCopyLink}
                title={copied ? t("copied") : t("copy_link")}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? t("copied") : t("copy")}
              </button>
            </div>

            <p className="warning-notice">
              <strong>{t("note")}:</strong> {t("public_link_note")}
            </p>

            <div className="action-buttons">
              <button
                className="btn btn-action btn-secondary"
                onClick={handleClose}
              >
                {t("close")}
              </button>
              <button
                className="btn btn-action btn-danger"
                onClick={handleStopSharing}
                disabled={isStopping}
              >
                {isStopping ? t("stopping") : t("stop_sharing")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
