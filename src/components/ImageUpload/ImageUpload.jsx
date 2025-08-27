import { useState, useRef } from "react";
import { Upload, Crown, Trash2, Loader2, Image } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./ImageUpload.css";
import {
  deleteRecipeImage,
  validateImageFile,
  setMainImage,
} from "../../services/imageService";

const ImageUpload = ({ images = [], onChange, disabled = false }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = (files) => {
    if (disabled) return;

    Array.from(files).forEach((file) => {
      addImagePreview(file);
    });
  };

  const addImagePreview = async (file) => {
    try {
      setError("");

      // Validate file
      validateImageFile(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      // Create image object with local file
      const imagePreview = {
        id: crypto.randomUUID(),
        file: file, // Store the actual file for later upload
        url: previewUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        is_main: images.length === 0,
        caption: "",
        isLocal: true, // Flag to indicate this is a local preview
      };

      const newImages = [...images, imagePreview];
      onChange(newImages);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteImage = async (imageToDelete) => {
    if (disabled) return;

    try {
      setError("");
      console.log("Deleting image:", imageToDelete.id);

      // If it's a local preview, just revoke the URL
      if (imageToDelete.isLocal) {
        URL.revokeObjectURL(imageToDelete.url);
      } else {
        // Delete from storage if it's already uploaded
        if (imageToDelete.path) {
          await deleteRecipeImage(imageToDelete.path);
        }
      }

      // Remove from images array
      const newImages = images.filter((img) => img.id !== imageToDelete.id);

      // If we deleted the main image and there are other images, make the first one main
      if (imageToDelete.is_main && newImages.length > 0) {
        newImages[0].is_main = true;
      }

      console.log("Calling onChange with new images:", newImages.length);
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
        <div className="upload-text">
          <strong>{t("upload_images")}</strong>
        </div>
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
              <img
                src={image.url}
                alt={image.filename}
                className="image-preview"
                loading="lazy"
              />

              {image.is_main && (
                <div className="main-image-badge">{t("main")}</div>
              )}

              <div className="image-overlay">
                {!image.is_main && (
                  <button
                    type="button"
                    className="btn-unstyled image-action-btn set-main"
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
                  className="btn-unstyled image-action-btn delete"
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
