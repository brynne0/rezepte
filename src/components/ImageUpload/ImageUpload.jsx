import { useState, useRef } from "react";
import { Upload, Crown, Trash2, Image } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./ImageUpload.css";
import { validateImageFile, setMainImage } from "../../services/imageService";
import LoadingAcorn from "../LoadingAcorn/LoadingAcorn";

const ImageUpload = ({
  images = [],
  onChange,
  disabled = false,
  uploadingImageIds = new Set(),
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [loadingImages, setLoadingImages] = useState(() => {
    // Set initial loading state for existing images immediately
    if (images && images.length > 0) {
      return new Set(images.map((img) => img.id));
    }
    return new Set();
  });

  const handleImageLoad = (imageId) => {
    // Add a minimum loading time so users can see the loading state
    setTimeout(() => {
      setLoadingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }, 500); // Minimum 500ms loading display
  };

  const handleImageLoadStart = (imageId) => {
    setLoadingImages((prev) => new Set(prev).add(imageId));
  };

  const handleFileSelect = async (files) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const newImages = [];

    for (const file of fileArray) {
      try {
        setError("");

        // Validate file
        validateImageFile(file);

        // Create image object with local file
        const imageId = crypto.randomUUID();

        // Add to loading state first
        setLoadingImages((prev) => new Set(prev).add(imageId));

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);

        const imagePreview = {
          id: imageId,
          file: file, // Store the actual file for later upload
          url: previewUrl,
          filename: file.name,
          size: file.size,
          type: file.type,
          is_main: images.length + newImages.length === 0,
          caption: "",
          isLocal: true, // Flag to indicate this is a local preview
        };

        newImages.push(imagePreview);
      } catch (err) {
        setError(err.message);
        break; // Stop processing if there's an error
      }
    }

    // Add all new images at once to prevent race conditions
    if (newImages.length > 0) {
      const allImages = [...images, ...newImages];
      onChange(allImages);
    }
  };

  const handleDeleteImage = async (imageToDelete) => {
    if (disabled) return;

    try {
      setError("");

      // If it's a local preview, just revoke the URL
      if (imageToDelete.isLocal) {
        URL.revokeObjectURL(imageToDelete.url);
      }
      // Don't delete from storage here - let the cleanup process handle it when recipe is saved
      // This prevents double-deletion attempts

      // Remove from images array
      const newImages = images.filter((img) => img.id !== imageToDelete.id);

      // If we deleted the main image and there are other images, make the first one main
      if (imageToDelete.is_main && newImages.length > 0) {
        newImages[0].is_main = true;
      }

      onChange(newImages);
    } catch (err) {
      console.error("Error deleting image:", err);
      setError(`Failed to delete image: ${err.message}`);
    }
  };

  const handleSetMainImage = (imageId) => {
    if (disabled) return;

    const newImages = setMainImage(images, imageId);
    onChange(newImages);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="image-upload-container">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,image/heic"
        onChange={handleInputChange}
        className="hidden-input"
        disabled={disabled}
      />

      {/* Upload area */}
      <div
        className={`image-upload-area ${dragOver ? "drag-over" : ""}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="upload-icon" size={32} />
        <div className="bold-small">{t("upload_images")}</div>
        <div className="upload-hint">{t("click_or_drag")}</div>
        <div className="upload-hint">{t("image_upload_hint")}</div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.map((image) => (
            <div
              key={image.id}
              className={`image-preview-item ${image.is_main ? "is-main" : ""}`}
            >
              <div className="image-loading-container">
                <img
                  src={image.url}
                  alt={image.filename}
                  className={`image-preview ${
                    loadingImages.has(image.id) ||
                    uploadingImageIds.has(image.id)
                      ? "loading"
                      : ""
                  }`}
                  loading="lazy"
                  onLoadStart={() => handleImageLoadStart(image.id)}
                  onLoad={() => handleImageLoad(image.id)}
                  onError={() => handleImageLoad(image.id)}
                />
                {(loadingImages.has(image.id) ||
                  uploadingImageIds.has(image.id)) && (
                  <div className="loading-spinner">
                    <LoadingAcorn size={20} className="loading-acorn-small" />
                  </div>
                )}
              </div>

              {image.is_main && (
                <div className="main-image-badge">{t("main")}</div>
              )}

              <div className="image-overlay">
                {!image.is_main && (
                  <button
                    type="button"
                    className="btn-unstyled image-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetMainImage(image.id);
                    }}
                    title={t("set_as_main_image")}
                    disabled={disabled}
                  >
                    <Crown size={20} />
                  </button>
                )}

                <button
                  type="button"
                  className="btn-unstyled image-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(image);
                  }}
                  title={t("delete_image")}
                  disabled={disabled}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
