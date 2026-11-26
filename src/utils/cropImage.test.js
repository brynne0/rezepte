import { describe, test, expect, afterEach, vi } from "vitest";
import { installFakeImage, mockCanvas } from "../test-utils/canvasMock";
import { getCroppedImageFile } from "./cropImage";

const area = { x: 10, y: 20, width: 300, height: 200 };

describe("getCroppedImageFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("draws the crop area and returns a file with the same name and type", async () => {
    installFakeImage();
    const { ctx, toBlob } = mockCanvas(new Blob(["png"]));

    const result = await getCroppedImageFile("https://img", area, {
      name: "dish.png",
      type: "image/png",
    });

    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe("dish.png");
    expect(result.type).toBe("image/png");
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ crossOrigin: "anonymous", src: "https://img" }),
      10,
      20,
      300,
      200,
      0,
      0,
      300,
      200
    );
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png", 0.9);
  });

  test("rejects when the canvas can't produce a blob", async () => {
    installFakeImage();
    mockCanvas(null);
    await expect(
      getCroppedImageFile("x", area, { name: "a.jpg", type: "image/jpeg" })
    ).rejects.toThrow("Failed to crop image");
  });

  test("rejects when the image can't load", async () => {
    installFakeImage({ fail: true });
    await expect(
      getCroppedImageFile("x", area, { name: "a.jpg", type: "image/jpeg" })
    ).rejects.toThrow("Failed to load image for cropping");
  });
});
