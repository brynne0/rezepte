import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { installFakeImage, mockCanvas } from "../test-utils/canvasMock";
import { compressImage } from "./compressImage";

// File whose reported size we control without allocating the bytes
const fakeFile = (name, size) => {
  const file = new File(["x"], name, { type: "image/png" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("compressImage", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:img");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("returns small images untouched", async () => {
    installFakeImage({ width: 800, height: 600 });
    const file = fakeFile("small.png", 100 * 1024);
    expect(await compressImage(file)).toBe(file);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:img");
  });

  test("scales large images down to 2000px as JPEG on white", async () => {
    installFakeImage({ width: 4000, height: 3000 });
    const { ctx, toBlob } = mockCanvas(new Blob(["tiny"]));

    const result = await compressImage(fakeFile("photo.big.png", 5_000_000));

    expect(result.name).toBe("photo.big.jpg");
    expect(result.type).toBe("image/jpeg");
    expect(ctx.fillStyle).toBe("#fff");
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      2000,
      1500
    );
    expect(toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/jpeg",
      0.85
    );
  });

  test("re-encodes heavy images even when small enough", async () => {
    installFakeImage({ width: 1000, height: 1000 });
    const { ctx } = mockCanvas(new Blob(["tiny"]));
    const result = await compressImage(fakeFile("heavy.png", 900 * 1024));
    expect(result.name).toBe("heavy.jpg");
    expect(ctx.drawImage.mock.calls[0].slice(3)).toEqual([1000, 1000]);
  });

  test.each([
    ["encoding fails", null],
    ["the result is bigger", new Blob(["x".repeat(10)])],
  ])("keeps the original when %s", async (_label, blob) => {
    installFakeImage({ width: 3000, height: 3000 });
    mockCanvas(blob);
    const file = fakeFile("a.png", 5);
    expect(await compressImage(file)).toBe(file);
  });

  test("rejects when the image can't load", async () => {
    installFakeImage({ fail: true });
    await expect(compressImage(fakeFile("bad.png", 1))).rejects.toThrow(
      "Failed to load image for compression"
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:img");
  });
});
