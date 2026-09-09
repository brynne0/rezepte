import { useState, useMemo, useEffect, useCallback } from "react";
import { getOptimizedImageUrl } from "../../services/imageService";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

const ImageGallery = ({ images = [] }) => {
  const [api, setApi] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState(new Set());

  // Memoize optimized URLs to prevent refetching - smaller sizes for better performance
  const optimizedUrls = useMemo(() => {
    return images.reduce((acc, image) => {
      acc[image.id] = {
        main: getOptimizedImageUrl(image.url, {
          width: 400,
          height: 267,
          quality: 55,
        }),
        thumb: getOptimizedImageUrl(image.url, {
          width: 80,
          height: 53,
          quality: 45,
        }),
      };
      return acc;
    }, {});
  }, [images]);

  // Reorder images so main image appears first
  const reorderedImages = useMemo(() => {
    if (!images || images.length <= 1) return images;

    const mainImage = images.find((img) => img.is_main);
    if (!mainImage) return images;

    const otherImages = images.filter((img) => !img.is_main);
    return [mainImage, ...otherImages];
  }, [images]);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);

    return () => api.off("select", onSelect);
  }, [api]);

  const handleImageLoadComplete = useCallback((imageId) => {
    setLoadedImages((prev) => new Set(prev).add(imageId));
  }, []);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <>
      <Carousel setApi={setApi}>
        <CarouselContent>
          {reorderedImages.map((image) => {
            const isLoaded = loadedImages.has(image.id);
            return (
              <CarouselItem key={image.id}>
                <AspectRatio
                  ratio={3 / 2}
                  className="overflow-hidden rounded-lg"
                >
                  {!isLoaded && (
                    <Skeleton className="absolute inset-0 rounded-lg" />
                  )}
                  <img
                    src={optimizedUrls[image.id]?.main}
                    alt={image.filename || "Recipe image"}
                    className={cn(
                      "size-full object-cover transition-opacity duration-200",
                      isLoaded ? "opacity-100" : "opacity-0"
                    )}
                    loading="lazy"
                    onLoad={() => handleImageLoadComplete(image.id)}
                    onError={() => handleImageLoadComplete(image.id)}
                  />
                </AspectRatio>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {reorderedImages.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {reorderedImages.map((image, index) => {
            const isLoaded = loadedImages.has(image.id);
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                  index === selectedIndex
                    ? "border-accent-red"
                    : "border-transparent hover:border-muted-foreground"
                )}
              >
                {!isLoaded && (
                  <Skeleton className="absolute inset-0 rounded-none" />
                )}
                <img
                  src={optimizedUrls[image.id]?.thumb}
                  alt={image.filename || `Recipe image ${index + 1}`}
                  className={cn(
                    "size-full object-cover transition-opacity duration-200",
                    isLoaded ? "opacity-100" : "opacity-0"
                  )}
                  loading="lazy"
                  onLoad={() => handleImageLoadComplete(image.id)}
                  onError={() => handleImageLoadComplete(image.id)}
                />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

export default ImageGallery;
