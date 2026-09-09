// Draws the cropped region onto an offscreen canvas and returns it as a File.
// `file` only needs `.name`/`.type` — a real File or a plain descriptor both work.
export const getCroppedImageFile = (imageSrc, cropAreaPixels, file) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous"; // allow canvas reads from remote signed URLs
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = cropAreaPixels.width;
      canvas.height = cropAreaPixels.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        image,
        cropAreaPixels.x,
        cropAreaPixels.y,
        cropAreaPixels.width,
        cropAreaPixels.height,
        0,
        0,
        cropAreaPixels.width,
        cropAreaPixels.height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to crop image"));
            return;
          }
          resolve(new File([blob], file.name, { type: file.type }));
        },
        file.type,
        0.9
      );
    };
    image.onerror = () =>
      reject(new Error("Failed to load image for cropping"));
    image.src = imageSrc;
  });
};
