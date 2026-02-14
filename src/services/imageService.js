import supabase from "../lib/supabase";

// Configuration
const STORAGE_BUCKET = "recipe-images";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const SIGNED_URL_EXPIRY = 3600; // 1 hour for regular views
const SHARED_SIGNED_URL_EXPIRY = 604800; // 7 days for shared recipes

// Generate signed URL for single image
export const getSignedImageUrl = async (
  imagePath,
  expiresIn = SIGNED_URL_EXPIRY
) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(imagePath, expiresIn);

    if (error) {
      console.error("Failed to create signed URL:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }
};

// Generate signed URLs for multiple images (batched)
export const getSignedImageUrls = async (
  images,
  expiresIn = SIGNED_URL_EXPIRY
) => {
  if (!images || images.length === 0) return [];

  const urlPromises = images.map(async (image) => {
    const signedUrl = await getSignedImageUrl(image.path, expiresIn);
    return {
      ...image,
      url: signedUrl || image.url, // Fallback to existing URL
    };
  });

  return Promise.all(urlPromises);
};

// Helper to validate image file
export const validateImageFile = (file) => {
  if (!file) {
    throw new Error("No file provided");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      "Invalid file type. Please upload JPEG, PNG, or WebP images."
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large. Maximum size is 10MB.");
  }

  return true;
};

// Generate unique filename
const generateFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split(".").pop().toLowerCase();
  return `${timestamp}-${randomString}.${extension}`;
};

// Upload image to Supabase Storage
export const uploadRecipeImage = async (file, userId, recipeId) => {
  try {
    validateImageFile(file);

    const fileName = generateFileName(file.name);
    const filePath = `${userId}/${recipeId}/${fileName}`;

    // Upload file to storage
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "public, max-age=31536000, immutable", // Cache for 1 year (images are immutable due to unique filenames)
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // URL will be generated on-demand via signed URLs
    return {
      id: crypto.randomUUID(),
      path: filePath,
      url: "", // Empty - generated on-demand
      filename: file.name,
      size: file.size,
      type: file.type,
      is_main: false,
      caption: "",
    };
  } catch (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// Delete image from Supabase Storage
export const deleteRecipeImage = async (imagePath) => {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([imagePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

// Update recipe images in database
export const updateRecipeImages = async (recipeId, images) => {
  try {
    const { error } = await supabase
      .from("recipes")
      .update({ images: images })
      .eq("id", recipeId);

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to update recipe images: ${error.message}`);
  }
};

// Get optimized image URL (for thumbnails, etc.)
// Works with both public and signed URLs
export const getOptimizedImageUrl = (signedUrl, options = {}) => {
  if (!signedUrl) return null;

  const { width, height, quality = 60 } = options; // Lower default quality for better performance

  // If using Supabase storage, we can add transform parameters
  if (signedUrl.includes("supabase")) {
    const url = new URL(signedUrl);

    // Add transform parameters to the URL
    // For signed URLs, these get appended to existing query params (including the token)
    if (width) url.searchParams.set("width", width);
    if (height) url.searchParams.set("height", height);
    url.searchParams.set("quality", quality);
    url.searchParams.set("format", "origin"); // Use original format instead of WebP to preserve brightness consistency

    return url.toString();
  }

  return signedUrl;
};

// Helper to get main image from images array
export const getMainImage = (images = []) => {
  if (!images || images.length === 0) return null;

  // Find the main image
  const mainImage = images.find((img) => img.is_main);

  // If no main image is set, return the first one
  return mainImage || images[0];
};

// Helper to set main image and reorder so main image is first
export const setMainImage = (images, imageId) => {
  const updatedImages = images.map((img) => ({
    ...img,
    is_main: img.id === imageId,
  }));

  // Reorder so main image comes first
  const mainImage = updatedImages.find((img) => img.is_main);
  const otherImages = updatedImages.filter((img) => !img.is_main);

  return mainImage ? [mainImage, ...otherImages] : updatedImages;
};

// Upload all local images when recipe is saved
export const uploadLocalImages = async (
  images,
  userId,
  recipeId,
  onProgress = null
) => {
  const uploadedImages = [];
  const localImages = images.filter((image) => image.isLocal && image.file);
  const totalImages = localImages.length;
  let uploadedCount = 0;

  for (const image of images) {
    if (image.isLocal && image.file) {
      try {
        // Update progress before upload
        if (onProgress) {
          onProgress({
            current: uploadedCount,
            total: totalImages,
            currentFile: image.filename,
            progress: Math.round((uploadedCount / totalImages) * 100),
          });
        }

        // Upload the local file
        const uploadedImage = await uploadRecipeImage(
          image.file,
          userId,
          recipeId
        );

        // Keep the same ID and main status
        uploadedImages.push({
          ...uploadedImage,
          id: image.id,
          is_main: image.is_main,
          caption: image.caption,
        });

        // Clean up the local preview URL
        URL.revokeObjectURL(image.url);

        uploadedCount++;

        // Update progress after successful upload
        if (onProgress) {
          onProgress({
            current: uploadedCount,
            total: totalImages,
            currentFile: image.filename,
            progress: Math.round((uploadedCount / totalImages) * 100),
          });
        }
      } catch (error) {
        console.error(`Failed to upload image ${image.filename}:`, error);
        throw error;
      }
    } else {
      // Keep already uploaded images as-is
      uploadedImages.push(image);
    }
  }

  return uploadedImages;
};

// Delete orphaned images when recipe is updated
export const cleanupOrphanedImages = async (oldImages, newImages) => {
  if (!oldImages || oldImages.length === 0) {
    return;
  }

  const newImageIds = new Set(newImages.map((img) => img.id));
  const imagesToDelete = oldImages.filter((img) => !newImageIds.has(img.id));

  for (const image of imagesToDelete) {
    if (image.path) {
      try {
        await deleteRecipeImage(image.path);
      } catch (error) {
        console.error(`Failed to delete orphaned image ${image.path}:`, error);
        // Don't throw - continue with other deletions
      }
    }
  }
};
