// Downscales and re-encodes images as JPEG before upload.
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;
const SKIP_BELOW_BYTES = 500 * 1024;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };
    image.src = url;
  });

const toJpegName = (name) => `${name.replace(/\.[^.]+$/, "")}.jpg`;

export const compressImage = async (file) => {
  const image = await loadImage(file);
  const { naturalWidth: width, naturalHeight: height } = image;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

  if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  // Otherwise transparent areas turn black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );

  if (!blob || blob.size >= file.size) return file;

  return new File([blob], toJpegName(file.name), { type: "image/jpeg" });
};
