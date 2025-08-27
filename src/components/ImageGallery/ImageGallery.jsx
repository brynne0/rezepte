import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./ImageGallery.css";
import {
  getMainImage,
  getOptimizedImageUrl,
} from "../../services/imageService";

const ImageGallery = ({ images = [] }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  // Memoize optimized URLs to prevent refetching
  const optimizedUrls = useMemo(() => {
    return images.reduce((acc, image) => {
      acc[image.id] = {
        main: getOptimizedImageUrl(image.url, { width: 600, height: 300 }),
        thumb: getOptimizedImageUrl(image.url, { width: 120, height: 80 }),
        full: image.url,
      };
      return acc;
    }, {});
  }, [images]);

  if (!images || images.length === 0) {
    return null;
  }

  // Get main image or first image
  const mainImageObj = getMainImage(images);
  const currentImage = images[currentImageIndex] || mainImageObj;

  const handleThumbnailClick = (index) => {
    if (index === currentImageIndex) return; // Don't reload same image
    setCurrentImageIndex(index);
  };

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <div>
      {/* Main Image */}
      <img
        key={`main-${currentImage.id}`}
        src={optimizedUrls[currentImage.id]?.main}
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
              src={optimizedUrls[image.id]?.thumb}
              alt={image.filename || `Recipe image ${index + 1}`}
              className={`thumbnail ${
                index === currentImageIndex ? "active" : ""
              }`}
              onClick={() => handleThumbnailClick(index)}
              loading="lazy"
            />
          ))}
        </div>
      )}

      {/* Modal for full-size viewing - rendered as portal */}
      {showModal &&
        createPortal(
          <div className="image-modal" onClick={closeModal}>
            <button
              className="btn-unstyled close-modal"
              onClick={closeModal}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <img
              src={optimizedUrls[currentImage.id]?.full}
              alt={currentImage.filename || "Recipe image"}
              className="modal-image"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
            />
          </div>,
          document.body
        )}
    </div>
  );
};

export default ImageGallery;
