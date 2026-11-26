import { vi } from "vitest";

// Fake Image that "loads" (or fails) as soon as src is set
export const installFakeImage = ({
  width = 100,
  height = 100,
  fail = false,
} = {}) => {
  class FakeImage {
    naturalWidth = width;
    naturalHeight = height;
    set src(value) {
      this._src = value;
      queueMicrotask(() => (fail ? this.onerror?.() : this.onload?.()));
    }
    get src() {
      return this._src;
    }
  }
  vi.stubGlobal("Image", FakeImage);
};

// Stubs canvas drawing; toBlob yields `blob` (null simulates failure)
export const mockCanvas = (blob) => {
  const ctx = { fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: "" };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
  const toBlob = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation((cb) => cb(blob));
  return { ctx, toBlob };
};
