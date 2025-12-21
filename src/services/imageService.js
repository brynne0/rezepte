import supabase from "../lib/supabase";

// Configuration
const STORAGE_BUCKET = "recipe-images";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

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
export const uploadRecipeImage = async (file, recipeId) => {
  try {
    validateImageFile(file);

    const fileName = generateFileName(file.name);
    const filePath = `recipes/${recipeId}/${fileName}`;

    // Upload file to storage
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      id: crypto.randomUUID(),
      path: filePath,
      url: urlData.publicUrl,
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
export const getOptimizedImageUrl = (originalUrl, options = {}) => {
  if (!originalUrl) return null;

  const { width, height, quality = 60 } = options; // Lower default quality for better performance

  // If using Supabase storage, we can add transform parameters
  if (originalUrl.includes("supabase")) {
    const url = new URL(originalUrl);
    const params = new URLSearchParams();

    if (width) params.set("width", width);
    if (height) params.set("height", height);
    params.set("quality", quality);
    params.set("format", "origin"); // Use original format instead of WebP to preserve brightness consistency

    if (params.toString()) {
      url.search = params.toString();
    }

    return url.toString();
  }

  return originalUrl;
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
        const uploadedImage = await uploadRecipeImage(image.file, recipeId);

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
