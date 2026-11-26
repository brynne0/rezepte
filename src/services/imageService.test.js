import { describe, test, expect, beforeEach, vi } from "vitest";
import { queueFrom } from "../test-utils/supabaseMock";

const remove = vi.fn();
const upload = vi.fn();
const list = vi.fn();
const createSignedUrl = vi.fn();

vi.mock("../lib/supabase", () => ({
  default: {
    storage: { from: () => ({ remove, upload, list, createSignedUrl }) },
    from: vi.fn(),
  },
}));

vi.mock("../utils/compressImage", () => ({
  compressImage: vi.fn(),
}));

import supabase from "../lib/supabase";
import { compressImage } from "../utils/compressImage";
import {
  getSignedImageUrl,
  getSignedImageUrls,
  validateImageFile,
  uploadRecipeImage,
  deleteRecipeImage,
  deleteRecipeImageFolder,
  deleteAllUserImages,
  updateRecipeImages,
  getMainImage,
  setMainImage,
  uploadLocalImages,
  cleanupOrphanedImages,
} from "./imageService";

const makeFile = (name = "photo.JPG", type = "image/jpeg", size = 1000) => ({
  name,
  type,
  size,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  remove.mockResolvedValue({ error: null });
  upload.mockResolvedValue({ error: null });
  compressImage.mockImplementation(async (file) => file);
});

describe("getSignedImageUrl", () => {
  test("returns the signed URL", async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://x" } });
    expect(await getSignedImageUrl("a.jpg", 60)).toBe("https://x");
    expect(createSignedUrl).toHaveBeenCalledWith("a.jpg", 60);
  });

  test("returns null on error or exception", async () => {
    createSignedUrl.mockResolvedValueOnce({ error: { message: "x" } });
    expect(await getSignedImageUrl("a.jpg")).toBeNull();

    createSignedUrl.mockRejectedValueOnce(new Error("offline"));
    expect(await getSignedImageUrl("a.jpg")).toBeNull();
  });
});

describe("getSignedImageUrls", () => {
  test("returns empty array for no images", async () => {
    expect(await getSignedImageUrls(null)).toEqual([]);
    expect(await getSignedImageUrls([])).toEqual([]);
  });

  test("adds a url to each image", async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://x" } });
    expect(await getSignedImageUrls([{ id: 1, path: "a" }])).toEqual([
      { id: 1, path: "a", url: "https://x" },
    ]);
  });
});

describe("validateImageFile", () => {
  test("accepts allowed types under the size limit", () => {
    expect(validateImageFile(makeFile())).toBe(true);
    expect(validateImageFile(makeFile("a.webp", "image/webp"))).toBe(true);
  });

  test("rejects missing, wrong type and oversized files", () => {
    expect(() => validateImageFile(null)).toThrow("No file provided");
    expect(() => validateImageFile(makeFile("a.gif", "image/gif"))).toThrow(
      "Invalid file type"
    );
    expect(() =>
      validateImageFile(makeFile("a.jpg", "image/jpeg", 11 * 1024 * 1024))
    ).toThrow("File too large");
  });
});

describe("uploadRecipeImage", () => {
  test("uploads the compressed file under user/recipe", async () => {
    const result = await uploadRecipeImage(makeFile(), "u1", "r1");

    const [path, , options] = upload.mock.calls[0];
    expect(path).toMatch(/^u1\/r1\/\d+-\w+\.jpg$/);
    expect(options.upsert).toBe(false);
    expect(result).toMatchObject({
      path,
      original_path: null,
      filename: "photo.JPG",
      is_main: false,
    });
  });

  test("uploads the original file into originals/", async () => {
    const result = await uploadRecipeImage(makeFile(), "u1", "r1", {
      originalFile: makeFile("orig.png", "image/png"),
    });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(result.original_path).toMatch(/^u1\/r1\/originals\/.+\.png$/);
  });

  test("reuses an existing original instead of uploading", async () => {
    const result = await uploadRecipeImage(makeFile(), "u1", "r1", {
      originalFile: makeFile(),
      existingOriginalPath: "u1/r1/originals/old.jpg",
    });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(result.original_path).toBe("u1/r1/originals/old.jpg");
  });

  test("uploads the original when compression fails", async () => {
    compressImage.mockRejectedValue(new Error("canvas"));
    const file = makeFile();
    await uploadRecipeImage(file, "u1", "r1");
    expect(upload.mock.calls[0][1]).toBe(file);
  });

  test("wraps validation and upload errors", async () => {
    await expect(uploadRecipeImage(null, "u1", "r1")).rejects.toThrow(
      "Failed to upload image: No file provided"
    );

    upload.mockResolvedValueOnce({ error: { message: "quota" } });
    await expect(uploadRecipeImage(makeFile(), "u1", "r1")).rejects.toThrow(
      "Failed to upload image: Upload failed: quota"
    );
  });

  test("fails when the original upload fails", async () => {
    upload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "quota" } });
    await expect(
      uploadRecipeImage(makeFile(), "u1", "r1", { originalFile: makeFile() })
    ).rejects.toThrow("Original upload failed: quota");
  });
});

describe("deleteRecipeImage", () => {
  test("removes the file", async () => {
    expect(await deleteRecipeImage("a.jpg")).toBe(true);
    expect(remove).toHaveBeenCalledWith(["a.jpg"]);
  });

  test("wraps errors", async () => {
    remove.mockResolvedValue({ error: { message: "nope" } });
    await expect(deleteRecipeImage("a.jpg")).rejects.toThrow(
      "Failed to delete image: Delete failed: nope"
    );
  });
});

describe("deleteRecipeImageFolder", () => {
  test("removes files in the folder and its originals, skipping subfolders", async () => {
    list
      .mockResolvedValueOnce({
        data: [
          { id: "1", name: "a.jpg" },
          { id: null, name: "originals" },
        ],
      })
      .mockResolvedValueOnce({ data: [{ id: "2", name: "o.jpg" }] });

    await deleteRecipeImageFolder("u1", "r1");
    expect(list).toHaveBeenCalledWith("u1/r1", { limit: 1000 });
    expect(list).toHaveBeenCalledWith("u1/r1/originals", { limit: 1000 });
    expect(remove).toHaveBeenCalledWith([
      "u1/r1/a.jpg",
      "u1/r1/originals/o.jpg",
    ]);
  });

  test("does nothing for an empty folder", async () => {
    list.mockResolvedValue({ data: null });
    await deleteRecipeImageFolder("u1", "r1");
    expect(remove).not.toHaveBeenCalled();
  });

  test("throws on list or remove errors", async () => {
    list.mockResolvedValueOnce({ error: { message: "x" } });
    await expect(deleteRecipeImageFolder("u1", "r1")).rejects.toThrow(
      "List failed: x"
    );

    list.mockResolvedValue({ data: [{ id: "1", name: "a.jpg" }] });
    remove.mockResolvedValue({ error: { message: "y" } });
    await expect(deleteRecipeImageFolder("u1", "r1")).rejects.toThrow(
      "Delete failed: y"
    );
  });
});

describe("deleteAllUserImages", () => {
  test("deletes each recipe folder", async () => {
    list
      .mockResolvedValueOnce({
        data: [
          { id: null, name: "r1" },
          { id: "f", name: "stray.jpg" },
        ],
      })
      .mockResolvedValue({ data: [{ id: "1", name: "a.jpg" }] });

    await deleteAllUserImages("u1");
    expect(list).toHaveBeenCalledWith("u1/r1", { limit: 1000 });
    expect(list).not.toHaveBeenCalledWith("u1/stray.jpg", expect.anything());
  });

  test("handles null data and list errors", async () => {
    list.mockResolvedValueOnce({ data: null });
    await expect(deleteAllUserImages("u1")).resolves.toBeUndefined();

    list.mockResolvedValueOnce({ error: { message: "x" } });
    await expect(deleteAllUserImages("u1")).rejects.toThrow("List failed: x");
  });
});

describe("updateRecipeImages", () => {
  test("saves the images on the recipe", async () => {
    const [chain] = queueFrom(supabase.from, { error: null });
    expect(await updateRecipeImages("r1", [{ id: 1 }])).toBe(true);
    expect(chain.update).toHaveBeenCalledWith({ images: [{ id: 1 }] });
  });

  test("wraps errors", async () => {
    queueFrom(supabase.from, { error: { message: "x" } });
    await expect(updateRecipeImages("r1", [])).rejects.toThrow(
      "Failed to update recipe images: Database update failed: x"
    );
  });
});

describe("getMainImage / setMainImage", () => {
  const images = [{ id: "a" }, { id: "b", is_main: true }, { id: "c" }];

  test("getMainImage returns the main image, else the first", () => {
    expect(getMainImage(images).id).toBe("b");
    expect(getMainImage([{ id: "x" }]).id).toBe("x");
    expect(getMainImage(null)).toBeNull();
    expect(getMainImage()).toBeNull();
  });

  test("setMainImage marks and moves the chosen image first", () => {
    const result = setMainImage(images, "c");
    expect(result.map((i) => i.id)).toEqual(["c", "a", "b"]);
    expect(result.map((i) => i.is_main)).toEqual([true, false, false]);
  });

  test("setMainImage keeps order when the id isn't found", () => {
    expect(setMainImage(images, "zzz").map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("uploadLocalImages", () => {
  beforeEach(() => {
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  test("uploads local images, keeps saved ones, and reports progress", async () => {
    const onProgress = vi.fn();
    const saved = { id: "s", path: "u1/r1/s.jpg" };
    const local = {
      id: "l",
      isLocal: true,
      file: makeFile(),
      url: "blob:1",
      filename: "photo.JPG",
      is_main: true,
      caption: "hi",
      crop_area: { x: 1 },
    };

    const result = await uploadLocalImages(
      [saved, local],
      "u1",
      "r1",
      onProgress
    );

    expect(result[0]).toBe(saved);
    expect(result[1]).toMatchObject({
      id: "l",
      is_main: true,
      caption: "hi",
      crop_area: { x: 1 },
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:1");
    expect(onProgress).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ uploading: true, progress: 0, total: 1 })
    );
    expect(onProgress).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ uploading: false, progress: 100, current: 1 })
    );
  });

  test("works without a progress callback", async () => {
    const result = await uploadLocalImages(
      [{ id: "l", isLocal: true, file: makeFile() }],
      "u1",
      "r1"
    );
    expect(result).toHaveLength(1);
  });

  test("rethrows upload failures", async () => {
    upload.mockResolvedValue({ error: { message: "quota" } });
    await expect(
      uploadLocalImages(
        [{ id: "l", isLocal: true, file: makeFile() }],
        "u1",
        "r1"
      )
    ).rejects.toThrow("quota");
  });
});

describe("cleanupOrphanedImages", () => {
  const saved = {
    id: "img1",
    path: "u1/r1/cropped.jpg",
    original_path: "u1/r1/originals/original.jpg",
  };

  test("does nothing without old images", async () => {
    await cleanupOrphanedImages(null, []);
    await cleanupOrphanedImages([], []);
    expect(remove).not.toHaveBeenCalled();
  });

  test("deletes both files of a removed image", async () => {
    await cleanupOrphanedImages([saved], []);

    expect(remove).toHaveBeenCalledWith([saved.path]);
    expect(remove).toHaveBeenCalledWith([saved.original_path]);
  });

  test("keeps the original when a re-crop still uses it", async () => {
    const recropped = {
      id: "img2",
      isLocal: true,
      existingOriginalPath: saved.original_path,
    };

    await cleanupOrphanedImages([saved], [recropped]);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith([saved.path]);
  });

  test("keeps going when a delete fails", async () => {
    remove.mockResolvedValueOnce({ error: { message: "x" } });
    await cleanupOrphanedImages([saved], []);
    expect(remove).toHaveBeenCalledTimes(2);
  });
});
