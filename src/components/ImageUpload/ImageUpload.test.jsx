import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { useState } from "react";

// Pass-through drag-and-drop so items render without the real library
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }) => children,
  Droppable: ({ children }) =>
    children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }) =>
    children(
      { innerRef: () => {}, draggableProps: {}, dragHandleProps: {} },
      {}
    ),
}));

// Crop dialog stand-in: shows its source and can save or cancel
vi.mock("../ImageCropDialog/ImageCropDialog", () => ({
  default: ({ open, imageSrc, file, initialCropArea, onSave, onCancel }) =>
    open ? (
      <div data-testid="crop" data-src={imageSrc}>
        <span>{file?.name}</span>
        <span data-testid="initial-crop">
          {JSON.stringify(initialCropArea)}
        </span>
        <button
          onClick={() =>
            onSave(
              { name: `cropped-${file.name}`, size: 1, type: "image/jpeg" },
              {
                x: 1,
              }
            )
          }
        >
          save crop
        </button>
        <button onClick={onCancel}>cancel crop</button>
      </div>
    ) : null,
}));

vi.mock("../../services/imageService", () => ({
  validateImageFile: vi.fn(),
  getSignedImageUrl: vi.fn(),
}));
vi.mock("../../hooks/data/useSignedImageUrls", () => ({
  useSignedImageUrls: (images) => ({
    signedImages: images.map((img) => ({ ...img, url: `signed:${img.path}` })),
  }),
}));
vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));

import {
  validateImageFile,
  getSignedImageUrl,
} from "../../services/imageService";
import { toast } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import ImageUpload from "./ImageUpload";

const saved = (id, extra = {}) => ({
  id,
  path: `u/r/${id}.jpg`,
  url: "",
  filename: `${id}.jpg`,
  type: "image/jpeg",
  ...extra,
});
const file = (name) => new File(["x"], name, { type: "image/jpeg" });

let latest;
const Harness = ({ initial = [], ...props }) => {
  const [images, setImages] = useState(initial);
  latest = images;
  return (
    <TooltipProvider>
      <ImageUpload images={images} onChange={setImages} {...props} />
    </TooltipProvider>
  );
};

const fileInput = (container) => container.querySelector('input[type="file"]');
const choose = (container, files) =>
  fireEvent.change(fileInput(container), { target: { files } });

describe("ImageUpload", () => {
  let blobCount;

  beforeEach(() => {
    vi.clearAllMocks();
    blobCount = 0;
    URL.createObjectURL = vi.fn(() => `blob:${++blobCount}`);
    URL.revokeObjectURL = vi.fn();
    validateImageFile.mockReturnValue(true);
    getSignedImageUrl.mockResolvedValue(null);
  });

  test("shows saved images with signed URLs, main first", () => {
    render(<Harness initial={[saved("a"), saved("b")]} />);
    expect(screen.getByAltText("a.jpg")).toHaveAttribute(
      "src",
      "signed:u/r/a.jpg"
    );
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("drag_images_to_reorder")).toBeInTheDocument();
  });

  test("crops each chosen file in turn before adding it", () => {
    const { container } = render(<Harness />);
    choose(container, [file("one.jpg"), file("two.jpg")]);

    expect(screen.getByTestId("crop")).toHaveAttribute("data-src", "blob:1");
    expect(screen.getByText("one.jpg")).toBeInTheDocument();

    fireEvent.click(screen.getByText("save crop"));
    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({
      filename: "cropped-one.jpg",
      is_main: true,
      isLocal: true,
      crop_area: { x: 1 },
    });
    expect(latest[0].originalFile.name).toBe("one.jpg");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:1");

    expect(screen.getByText("two.jpg")).toBeInTheDocument();
    fireEvent.click(screen.getByText("cancel crop"));
    expect(latest).toHaveLength(1);
    expect(screen.queryByTestId("crop")).not.toBeInTheDocument();
    expect(fileInput(container).value).toBe("");
  });

  test("stops at the first invalid file", () => {
    validateImageFile.mockReturnValueOnce(true).mockImplementationOnce(() => {
      throw new Error("Invalid file type");
    });
    const { container } = render(<Harness />);
    choose(container, [file("ok.jpg"), file("bad.gif"), file("skip.jpg")]);

    expect(toast.add).toHaveBeenCalledWith({
      title: "Invalid file type",
      type: "error",
    });
    expect(validateImageFile).toHaveBeenCalledTimes(2);
    expect(screen.getByText("ok.jpg")).toBeInTheDocument();
  });

  test("does nothing when every file is invalid or none chosen", () => {
    validateImageFile.mockImplementation(() => {
      throw new Error("bad");
    });
    const { container } = render(<Harness />);
    choose(container, [file("bad.gif")]);
    choose(container, []);
    expect(screen.queryByTestId("crop")).not.toBeInTheDocument();
  });

  test("the add tile opens the file picker unless disabled", () => {
    const { container, rerender } = render(<Harness />);
    const click = vi.spyOn(fileInput(container), "click");
    fireEvent.click(container.querySelector('[data-state="idle"]'));
    expect(click).toHaveBeenCalledTimes(1);

    rerender(<Harness disabled />);
    fireEvent.click(container.querySelector('[data-state="idle"]'));
    expect(click).toHaveBeenCalledTimes(1);
  });

  test("deleting keeps the first image as main and frees local previews", () => {
    const local = { id: "l", url: "blob:x", isLocal: true, filename: "l.jpg" };
    render(<Harness initial={[saved("a", { is_main: true }), local]} />);

    fireEvent.click(screen.getAllByLabelText("delete_image")[0]);
    expect(latest).toEqual([
      expect.objectContaining({ id: "l", is_main: true }),
    ]);

    fireEvent.click(screen.getByLabelText("delete_image"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x");
    expect(latest).toEqual([]);
  });

  test("ignores deletes while disabled", () => {
    render(<Harness initial={[saved("a")]} disabled />);
    fireEvent.click(screen.getByLabelText("delete_image"));
    expect(latest).toHaveLength(1);
  });

  describe("re-cropping", () => {
    test("crops a saved image from its stored original", async () => {
      getSignedImageUrl.mockResolvedValue("signed:original");
      const image = saved("a", {
        original_path: "u/r/originals/a.jpg",
        crop_area: { x: 5 },
        is_main: true,
        caption: "hi",
      });
      render(<Harness initial={[image]} />);

      fireEvent.click(screen.getByLabelText("crop_image"));
      const dialog = await screen.findByTestId("crop");
      expect(getSignedImageUrl).toHaveBeenCalledWith("u/r/originals/a.jpg");
      expect(dialog).toHaveAttribute("data-src", "signed:original");
      expect(screen.getByTestId("initial-crop")).toHaveTextContent('{"x":5}');

      fireEvent.click(screen.getByText("save crop"));
      expect(latest[0]).toMatchObject({
        filename: "cropped-a.jpg",
        existingOriginalPath: "u/r/originals/a.jpg",
        crop_area: { x: 1 },
        is_main: true,
        caption: "hi",
        isLocal: true,
      });
      expect(screen.queryByTestId("crop")).not.toBeInTheDocument();
    });

    test("falls back to the displayed image without an original", async () => {
      render(<Harness initial={[saved("a", { crop_area: { x: 5 } })]} />);
      fireEvent.click(screen.getByLabelText("crop_image"));
      expect(await screen.findByTestId("crop")).toHaveAttribute(
        "data-src",
        "signed:u/r/a.jpg"
      );
      expect(getSignedImageUrl).not.toHaveBeenCalled();
      expect(screen.getByTestId("initial-crop")).toBeEmptyDOMElement();

      fireEvent.click(screen.getByText("save crop"));
      expect(latest[0].crop_area).toBeUndefined();
      expect(latest[0].caption).toBe("");
    });

    test("re-crops a local image from its original file", async () => {
      const original = file("orig.jpg");
      const local = {
        id: "l",
        url: "blob:old",
        isLocal: true,
        filename: "l.jpg",
        originalFile: original,
      };
      render(<Harness initial={[local]} />);

      fireEvent.click(screen.getByLabelText("crop_image"));
      const dialog = await screen.findByTestId("crop");
      expect(URL.createObjectURL).toHaveBeenCalledWith(original);
      const src = dialog.getAttribute("data-src");

      fireEvent.click(screen.getByText("save crop"));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:old");
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(src);
      expect(latest[0].originalFile).toBe(original);
    });

    test("cancelling leaves the image unchanged", async () => {
      render(<Harness initial={[saved("a")]} />);
      fireEvent.click(screen.getByLabelText("crop_image"));
      fireEvent.click(await screen.findByText("cancel crop"));
      expect(screen.queryByTestId("crop")).not.toBeInTheDocument();
      expect(latest[0].id).toBe("a");
    });
  });

  describe("dropping files", () => {
    const dataTransfer = (files, types = ["Files"]) => ({ files, types });

    test("highlights while dragging files and crops dropped ones", () => {
      const { container } = render(<Harness />);
      const zone = container.firstChild;
      const list = zone.querySelector(".flex-wrap");

      fireEvent.dragEnter(zone, { dataTransfer: dataTransfer([]) });
      fireEvent.dragOver(zone, { dataTransfer: dataTransfer([]) });
      expect(list).toHaveClass("ring-2");

      fireEvent.dragLeave(zone, { dataTransfer: dataTransfer([]) });
      expect(list).not.toHaveClass("ring-2");

      fireEvent.drop(zone, { dataTransfer: dataTransfer([file("d.jpg")]) });
      expect(screen.getByText("d.jpg")).toBeInTheDocument();
    });

    test("ignores non-file drags and drops while disabled", () => {
      const { container, rerender } = render(<Harness />);
      const zone = container.firstChild;
      const list = zone.querySelector(".flex-wrap");

      fireEvent.dragEnter(zone, {
        dataTransfer: dataTransfer([], ["text/plain"]),
      });
      fireEvent.dragLeave(zone, {
        dataTransfer: dataTransfer([], ["text/plain"]),
      });
      fireEvent.drop(zone, { dataTransfer: dataTransfer([], ["text/plain"]) });
      expect(list).not.toHaveClass("ring-2");

      rerender(<Harness disabled />);
      fireEvent.dragEnter(zone, { dataTransfer: dataTransfer([]) });
      expect(list).not.toHaveClass("ring-2");
      fireEvent.drop(zone, { dataTransfer: dataTransfer([file("d.jpg")]) });
      expect(screen.queryByTestId("crop")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    test("shows images once loaded, after a short minimum", () => {
      render(<Harness initial={[saved("a"), saved("b")]} />);
      const a = screen.getByAltText("a.jpg");
      const b = screen.getByAltText("b.jpg");
      expect(a).toHaveClass("invisible");

      fireEvent.load(a);
      fireEvent.error(b);
      act(() => vi.advanceTimersByTime(500));
      expect(a).not.toHaveClass("invisible");
      expect(b).not.toHaveClass("invisible");
    });

    test("keeps uploading images in the loading state", () => {
      render(
        <Harness initial={[saved("a")]} uploadingImageIds={new Set(["a"])} />
      );
      const a = screen.getByAltText("a.jpg");
      fireEvent.load(a);
      act(() => vi.advanceTimersByTime(500));
      expect(a).toHaveClass("invisible");
    });
  });

  test("starts with no loading images when empty", async () => {
    const { container } = render(<Harness />);
    await waitFor(() =>
      expect(container.querySelector('[data-state="idle"]')).toBeInTheDocument()
    );
  });
});
