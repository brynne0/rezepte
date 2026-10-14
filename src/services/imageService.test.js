import { describe, test, expect, beforeEach, vi } from "vitest";

const remove = vi.fn();

vi.mock("../lib/supabase", () => ({
  default: { storage: { from: () => ({ remove }) } },
}));

import { cleanupOrphanedImages } from "./imageService";

describe("cleanupOrphanedImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    remove.mockResolvedValue({ error: null });
  });

  const saved = {
    id: "img1",
    path: "u1/r1/cropped.jpg",
    original_path: "u1/r1/originals/original.jpg",
  };

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
});
