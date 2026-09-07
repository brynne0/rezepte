import { useState, useRef } from "react";
import { Upload, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "cn";

import { validateImageFile } from "../../services/imageService";
import { useSignedImageUrls } from "../../hooks/data/useSignedImageUrls";
import { Badge } from "@/components/ui/badge";
import {
  Attachment,
  AttachmentMedia,
  AttachmentActions,
  AttachmentAction,
} from "@/components/ui/attachment";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ImageUpload = ({
  images = [],
  onChange,
  disabled = false,
  uploadingImageIds = new Set(),
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [fileDragDepth, setFileDragDepth] = useState(0);
  const isDraggingFile = fileDragDepth > 0;

  // Fetch signed URLs for existing (already uploaded) images
  const existingImages = images.filter((img) => !img.isLocal && img.path);
  const { signedImages } = useSignedImageUrls(existingImages);
  const signedUrlMap = new Map(signedImages.map((img) => [img.id, img.url]));

  // Get the display URL for an image: use signed URL for existing, blob URL for local
  const getDisplayUrl = (image) =>
    image.isLocal ? image.url : signedUrlMap.get(image.id) || image.url;
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

  // The first image is always the main one, so deleting or reordering just
  // needs to keep the is_main flag in sync with position.
  const handleDeleteImage = (imageToDelete) => {
    if (disabled) return;

    if (imageToDelete.isLocal) {
      URL.revokeObjectURL(imageToDelete.url);
    }

    const newImages = images
      .filter((img) => img.id !== imageToDelete.id)
      .map((img, index) => ({ ...img, is_main: index === 0 }));

    onChange(newImages);
  };

  const handleReorder = (result) => {
    if (disabled || !result.destination) return;

    const reordered = Array.from(images);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    onChange(reordered.map((img, index) => ({ ...img, is_main: index === 0 })));
  };

  const isFileDrag = (e) =>
    Array.from(e.dataTransfer?.types || []).includes("Files");

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (disabled || !isFileDrag(e)) return;
    setFileDragDepth((depth) => depth + 1);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!isFileDrag(e)) return;
    setFileDragDepth((depth) => Math.max(0, depth - 1));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setFileDragDepth(0);

    if (disabled || !isFileDrag(e)) return;
    handleFileSelect(e.dataTransfer.files);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const openFilePicker = () => !disabled && fileInputRef.current?.click();

  return (
    <div
      className="flex flex-col gap-3"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,image/heic"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {images.length === 0 ? (
        <div
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-input bg-muted/20 p-6 text-center transition-colors hover:bg-muted/40",
            isDraggingFile && "border-primary bg-muted/40",
            disabled && "pointer-events-none opacity-50"
          )}
          onClick={openFilePicker}
        >
          <Upload className="text-muted-foreground" size={32} />
          <div className="text-sm font-medium">{t("upload_images")}</div>
          <div className="text-xs text-muted-foreground">
            {t("click_or_drag")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("image_upload_hint")}
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleReorder}>
          <Droppable droppableId="images" direction="horizontal">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "flex flex-wrap gap-3 rounded-lg p-1 transition-colors",
                  (snapshot.isDraggingOver || isDraggingFile) &&
                    "bg-muted/50 ring-2 ring-primary"
                )}
              >
                {images.map((image, index) => {
                  const isLoading =
                    loadingImages.has(image.id) ||
                    uploadingImageIds.has(image.id);

                  return (
                    <Draggable
                      key={image.id}
                      draggableId={image.id}
                      index={index}
                      isDragDisabled={disabled}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <Attachment
                            orientation="vertical"
                            state={isLoading ? "uploading" : "done"}
                            className={cn(snapshot.isDragging && "shadow-lg")}
                          >
                            <AttachmentMedia variant="image">
                              <img
                                src={getDisplayUrl(image)}
                                alt={image.filename}
                                loading="lazy"
                                onLoadStart={() =>
                                  handleImageLoadStart(image.id)
                                }
                                onLoad={() => handleImageLoad(image.id)}
                                onError={() => handleImageLoad(image.id)}
                              />
                              {index === 0 && (
                                <Badge className="absolute top-1.5 left-1.5">
                                  {t("main")}
                                </Badge>
                              )}
                            </AttachmentMedia>
                            <AttachmentActions>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <AttachmentAction
                                      variant="ghost-destructive"
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={() => handleDeleteImage(image)}
                                      aria-label={t("delete_image")}
                                      disabled={disabled}
                                    >
                                      <Trash2 />
                                    </AttachmentAction>
                                  }
                                />
                                <TooltipContent>
                                  {t("delete_image")}
                                </TooltipContent>
                              </Tooltip>
                            </AttachmentActions>
                          </Attachment>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}

                <Attachment
                  orientation="vertical"
                  state="idle"
                  className={cn(
                    "cursor-pointer",
                    disabled && "pointer-events-none opacity-50"
                  )}
                  onClick={openFilePicker}
                >
                  <AttachmentMedia variant="icon">
                    <Plus />
                  </AttachmentMedia>
                </Attachment>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {images.length > 1 && (
        <p className="text-xs text-muted-foreground">
          {t("drag_images_to_reorder")}
        </p>
      )}

      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};

export default ImageUpload;
