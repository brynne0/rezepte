import { describe, test, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const area = { x: 0, y: 0, width: 50, height: 50 };
const pixels = { x: 10, y: 10, width: 300, height: 200 };

// Cropper stand-in that reports a finished crop on demand
vi.mock("react-easy-crop", () => ({
  default: ({ onCropComplete }) => (
    <button onClick={() => onCropComplete(area, pixels)}>finish crop</button>
  ),
}));
vi.mock("../../utils/cropImage", () => ({ getCroppedImageFile: vi.fn() }));
vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));

import { getCroppedImageFile } from "../../utils/cropImage";
import { toast } from "@/components/ui/toast";
import ImageCropDialog from "./ImageCropDialog";

const renderDialog = () => {
  const onSave = vi.fn();
  render(
    <ImageCropDialog
      open
      imageSrc="blob:img"
      file={{ name: "a.jpg", type: "image/jpeg" }}
      onSave={onSave}
      onCancel={vi.fn()}
    />
  );
  return { onSave };
};

describe("ImageCropDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test("saves the cropped file with the crop area", async () => {
    getCroppedImageFile.mockResolvedValue({ name: "cropped.jpg" });
    const { onSave } = renderDialog();

    fireEvent.click(await screen.findByText("finish crop"));
    fireEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ name: "cropped.jpg" }, area)
    );
  });

  test("shows an error and stays usable when cropping fails", async () => {
    getCroppedImageFile.mockRejectedValue(new Error("Image too large to crop"));
    const { onSave } = renderDialog();

    fireEvent.click(await screen.findByText("finish crop"));
    fireEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({
        title: "crop_image_failed",
        type: "error",
      })
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "save" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "cancel" })).toBeEnabled();
  });
});
