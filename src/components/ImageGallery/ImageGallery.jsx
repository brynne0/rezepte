import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./ImageGallery.css";
import {
  getMainImage,
  getOptimizedImageUrl,
} from "../../services/imageService";
import LoadingAcorn from "../LoadingAcorn/LoadingAcorn";

const ImageGallery = ({ images = [], onAllImagesLoaded }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const imageRef = useRef(null);
  const preloadImageRef = useRef(null);
  const modalPreloadRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  // Memoize optimized URLs to prevent refetching - smaller sizes for better performance
  const optimizedUrls = useMemo(() => {
    return images.reduce((acc, image) => {
      acc[image.id] = {
        main: getOptimizedImageUrl(image.url, {
          width: 400,
          height: 300,
          quality: 70,
        }),
        thumb: getOptimizedImageUrl(image.url, {
          width: 80,
          height: 60,
          quality: 60,
        }),
        full: getOptimizedImageUrl(image.url, {
          width: 800,
          height: 600,
          quality: 80,
        }),
      };
      return acc;
    }, {});
  }, [images]);

  // Check if all images have loaded and notify parent
  useEffect(() => {
    if (
      loadedImages.size === images.length &&
      images.length > 0 &&
      onAllImagesLoaded
    ) {
      onAllImagesLoaded(); // No delay needed
    }
  }, [loadedImages.size, images.length, onAllImagesLoaded]);

  // Clean up timeout and preload images on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (preloadImageRef.current) {
        preloadImageRef.current.onload = null;
        preloadImageRef.current.onerror = null;
        preloadImageRef.current = null;
      }
      if (modalPreloadRef.current) {
        modalPreloadRef.current.onload = null;
        modalPreloadRef.current.onerror = null;
        modalPreloadRef.current = null;
      }
    };
  }, []);

  if (!images || images.length === 0) {
    return null;
  }

  // Get main image or first image
  const mainImageObj = getMainImage(images);
  const currentImage = images[currentImageIndex] || mainImageObj;

  const handleThumbnailClick = (index) => {
    if (index === currentImageIndex) return; // Don't reload same image
    if (imageLoading) return; // Prevent multiple clicks while loading

    setImageLoading(true);

    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    const startTime = Date.now();
    const minLoadingDuration = 300; // Minimum 300ms loading state

    // Preload the new image
    const newImageUrl = optimizedUrls[images[index].id]?.main;
    if (newImageUrl) {
      preloadImageRef.current = new Image();
      preloadImageRef.current.onload = () => {
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingDuration - elapsed);

        setTimeout(() => {
          // Image is fully loaded, now switch
          setCurrentImageIndex(index);
          setImageLoading(false);

          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
        }, remainingTime);
      };
      preloadImageRef.current.onerror = () => {
        // Handle error - still respect minimum duration
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingDuration - elapsed);

        setTimeout(() => {
          setImageLoading(false);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
        }, remainingTime);
      };
      preloadImageRef.current.src = newImageUrl;
    }

    // Safety timeout to clear loading state if image doesn't load
    loadingTimeoutRef.current = setTimeout(() => {
      setImageLoading(false);
    }, 10000); // Longer timeout for slow connections
  };

  // Handle initial image load
  const handleMainImageLoad = () => {
    handleImageLoadComplete(currentImage.id);
  };

  const handleMainImageError = () => {
    handleImageLoadComplete(currentImage.id);
  };

  // Track when images load for overall progress
  const handleImageLoadComplete = (imageId) => {
    setLoadedImages((prev) => new Set(prev).add(imageId));
  };

  const openModal = () => {
    setModalLoading(true);
    const startTime = Date.now();
    const minLoadingDuration = 200;

    // Preload full-size image
    const fullImageUrl = optimizedUrls[currentImage.id]?.full;
    if (fullImageUrl) {
      modalPreloadRef.current = new Image();
      modalPreloadRef.current.onload = () => {
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingDuration - elapsed);

        setTimeout(() => {
          setShowModal(true);
          setModalLoading(false);
        }, remainingTime);
      };
      modalPreloadRef.current.onerror = () => {
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingDuration - elapsed);

        setTimeout(() => {
          setShowModal(true); // Show modal even if image fails
          setModalLoading(false);
        }, remainingTime);
      };
      modalPreloadRef.current.src = fullImageUrl;
    } else {
      // No image to preload, just show modal
      setTimeout(() => {
        setShowModal(true);
        setModalLoading(false);
      }, minLoadingDuration);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* Main Image */}
      <div className="main-image-wrapper">
        <img
          ref={imageRef}
          key={`main-${currentImage.id}`}
          src={optimizedUrls[currentImage.id]?.main}
          alt={currentImage.filename || "Recipe image"}
          className="main-image"
          onClick={openModal}
          loading="lazy"
          onLoad={handleMainImageLoad}
          onError={handleMainImageError}
        />
      </div>

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
              onLoad={() => handleImageLoadComplete(image.id)}
              onError={() => handleImageLoadComplete(image.id)}
            />
          ))}
        </div>
      )}

      {/* Modal loading overlay - fullscreen */}
      {modalLoading &&
        createPortal(
          <div className="modal-loading-overlay">
            <LoadingAcorn size={40} />
          </div>,
          document.body
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
    </>
  );
};

export default ImageGallery;
