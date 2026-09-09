import { useState, useRef } from "react";
import { Plus, Trash2, Crop } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "cn";

import {
  validateImageFile,
  getSignedImageUrl,
} from "../../services/imageService";
import { useSignedImageUrls } from "../../hooks/data/useSignedImageUrls";
import ImageCropDialog from "../ImageCropDialog/ImageCropDialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
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

  // Files pending the crop step, cropped one at a time.
  const [cropQueue, setCropQueue] = useState([]);
  const [cropSrc, setCropSrc] = useState(null);

  const addImage = (file, originalFile) => {
    const imageId = crypto.randomUUID();
    setLoadingImages((prev) => new Set(prev).add(imageId));

    const previewUrl = URL.createObjectURL(file);
    const imagePreview = {
      id: imageId,
      file,
      originalFile,
      url: previewUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
      is_main: images.length === 0,
      caption: "",
      isLocal: true,
    };

    onChange([...images, imagePreview]);
  };

  const startCropQueue = (validFiles) => {
    if (validFiles.length === 0) return;
    setCropQueue(validFiles);
    setCropSrc(URL.createObjectURL(validFiles[0]));
  };

  const advanceCropQueue = (remaining) => {
    URL.revokeObjectURL(cropSrc);
    setCropQueue(remaining);
    setCropSrc(remaining.length > 0 ? URL.createObjectURL(remaining[0]) : null);
  };

  const handleCropSave = (croppedFile) => {
    addImage(croppedFile, cropQueue[0]);
    advanceCropQueue(cropQueue.slice(1));
  };

  const handleCropCancel = () => {
    advanceCropQueue(cropQueue.slice(1));
  };

  // Re-cropping an existing image swaps it for a new local entry at the same
  // position, so the parent's normal upload/cleanup flow uploads the
  // recropped file and removes the old one. Always crops from the original
  // (uncropped) photo, not the current display, so re-crops don't compound.
  const [recropTarget, setRecropTarget] = useState(null);
  const [recropSrc, setRecropSrc] = useState(null);

  const openRecrop = async (image) => {
    if (image.isLocal) {
      setRecropTarget(image);
      setRecropSrc(URL.createObjectURL(image.originalFile || image.file));
      return;
    }

    const src = image.original_path
      ? await getSignedImageUrl(image.original_path)
      : null;
    setRecropTarget(image);
    setRecropSrc(src || getDisplayUrl(image));
  };

  const closeRecrop = () => {
    if (recropTarget?.isLocal) {
      URL.revokeObjectURL(recropSrc);
    }
    setRecropTarget(null);
    setRecropSrc(null);
  };

  const handleRecropSave = (croppedFile) => {
    const replacement = {
      id: crypto.randomUUID(),
      file: croppedFile,
      originalFile: recropTarget.isLocal
        ? recropTarget.originalFile || recropTarget.file
        : undefined,
      existingOriginalPath: recropTarget.isLocal
        ? undefined
        : recropTarget.original_path,
      url: URL.createObjectURL(croppedFile),
      filename: croppedFile.name,
      size: croppedFile.size,
      type: croppedFile.type,
      is_main: recropTarget.is_main,
      caption: recropTarget.caption || "",
      isLocal: true,
    };

    if (recropTarget.isLocal) {
      URL.revokeObjectURL(recropTarget.url);
    }

    setLoadingImages((prev) => new Set(prev).add(replacement.id));
    onChange(
      images.map((img) => (img.id === recropTarget.id ? replacement : img))
    );
    closeRecrop();
  };

  const handleRecropCancel = () => closeRecrop();

  const handleFileSelect = async (files) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const validFiles = [];

    for (const file of fileArray) {
      try {
        validateImageFile(file);
        validFiles.push(file);
      } catch (err) {
        toast.add({ title: err.message, type: "error" });
        break; // Stop processing if there's an error
      }
    }

    startCropQueue(validFiles);
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
                          className={cn(
                            "w-32",
                            snapshot.isDragging && "shadow-lg"
                          )}
                        >
                          <AttachmentMedia
                            variant="image"
                            className="aspect-3/2 *:[img]:aspect-3/2"
                          >
                            <img
                              src={getDisplayUrl(image)}
                              alt={image.filename}
                              loading="lazy"
                              onLoadStart={() => handleImageLoadStart(image.id)}
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
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => openRecrop(image)}
                                    aria-label={t("crop_image")}
                                    disabled={disabled}
                                  >
                                    <Crop />
                                  </AttachmentAction>
                                }
                              />
                              <TooltipContent>{t("crop_image")}</TooltipContent>
                            </Tooltip>
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
                  "w-32 cursor-pointer",
                  disabled && "pointer-events-none opacity-50"
                )}
                onClick={openFilePicker}
              >
                <AttachmentMedia variant="icon" className="aspect-3/2">
                  <Plus />
                </AttachmentMedia>
              </Attachment>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {images.length > 1 && (
        <p className="text-xs text-muted-foreground">
          {t("drag_images_to_reorder")}
        </p>
      )}

      <ImageCropDialog
        key={cropSrc}
        open={cropQueue.length > 0}
        imageSrc={cropSrc}
        file={cropQueue[0]}
        onCancel={handleCropCancel}
        onSave={handleCropSave}
      />

      <ImageCropDialog
        key={recropTarget?.id}
        open={!!recropTarget}
        imageSrc={recropSrc}
        file={
          recropTarget && {
            name: recropTarget.filename,
            type: recropTarget.type,
          }
        }
        onCancel={handleRecropCancel}
        onSave={handleRecropSave}
      />
    </div>
  );
};

export default ImageUpload;
