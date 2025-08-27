import { useState } from "react";
import { X } from "lucide-react";
import "./ImageGallery.css";
import { getMainImage, getOptimizedImageUrl } from "../../services/imageService";

const ImageGallery = ({ images = [] }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  if (!images || images.length === 0) {
    return null;
  }

  // Get main image or first image
  const mainImageObj = getMainImage(images);
  const mainImageIndex = images.findIndex(img => img.id === mainImageObj?.id) || 0;
  const currentImage = images[currentImageIndex] || mainImageObj;

  const handleThumbnailClick = (index) => {
    setCurrentImageIndex(index);
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div className="image-gallery">
      {/* Main Image */}
      <img
        src={getOptimizedImageUrl(currentImage.url, { width: 600, height: 300 })}
        alt={currentImage.filename || "Recipe image"}
        className="main-image"
        onClick={openModal}
        loading="lazy"
      />

      {/* Thumbnails - only show if more than 1 image */}
      {images.length > 1 && (
        <div className="thumbnail-grid">
          {images.map((image, index) => (
            <img
              key={image.id}
              src={getOptimizedImageUrl(image.url, { width: 120, height: 80 })}
              alt={image.filename || `Recipe image ${index + 1}`}
              className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
              onClick={() => handleThumbnailClick(index)}
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Modal for full-size viewing */}
      {showModal && (
        <div className="image-modal" onClick={closeModal}>
          <button
            className="btn-unstyled close-modal"
            onClick={closeModal}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <img
            src={currentImage.url}
            alt={currentImage.filename || "Recipe image"}
            className="modal-image"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
          />
        </div>
      )}
    </div>
  );
};

export default ImageGallery;