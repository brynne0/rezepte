import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AutoResizeTextArea from "./AutoResizeTextArea";

// Mock scrollHeight property since jsdom doesn't implement it
Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
  configurable: true,
  get() {
    return this._scrollHeight || 0;
  },
  set(val) {
    this._scrollHeight = val;
  },
});

describe("AutoResizeTextArea", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    onKeyDown: vi.fn(),
    className: "test-class",
    placeholder: "Enter text...",
    readOnly: false,
    id: "test-textarea",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with all props correctly", () => {
    render(<AutoResizeTextArea {...defaultProps} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("");
    expect(textarea).toHaveClass("test-class");
    expect(textarea).toHaveAttribute("placeholder", "Enter text...");
    expect(textarea).toHaveAttribute("id", "test-textarea");
    expect(textarea).not.toHaveAttribute("readonly");
  });

  it("renders as readonly when readOnly prop is true", () => {
    render(<AutoResizeTextArea {...defaultProps} readOnly={true} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("readonly");
  });

  it("displays the correct value", () => {
    const testValue = "Test content";
    render(<AutoResizeTextArea {...defaultProps} value={testValue} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue(testValue);
  });

  it("calls onChange when text is typed", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();

    render(<AutoResizeTextArea {...defaultProps} onChange={mockOnChange} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Hello");

    expect(mockOnChange).toHaveBeenCalledTimes(5); // Once for each character
  });

  it("calls onKeyDown when a key is pressed", async () => {
    const user = userEvent.setup();
    const mockOnKeyDown = vi.fn();

    render(<AutoResizeTextArea {...defaultProps} onKeyDown={mockOnKeyDown} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "a");

    expect(mockOnKeyDown).toHaveBeenCalled();
  });

  it("triggers resize effect when value changes", () => {
    const { rerender } = render(
      <AutoResizeTextArea {...defaultProps} value="Short" />
    );

    const textarea = screen.getByRole("textbox");

    // Mock scrollHeight for longer content
    textarea.scrollHeight = 150;

    // Rerender with longer content to trigger useEffect
    rerender(
      <AutoResizeTextArea
        {...defaultProps}
        value="Much longer content that should trigger a resize"
      />
    );

    expect(textarea.style.height).toBe("150px");
  });

  it("resets height to auto before setting new height", () => {
    const { rerender } = render(
      <AutoResizeTextArea {...defaultProps} value="" />
    );

    const textarea = screen.getByRole("textbox");
    textarea.scrollHeight = 150;

    // Set initial height
    rerender(<AutoResizeTextArea {...defaultProps} value="Content" />);
    expect(textarea.style.height).toBe("150px");

    // Change content and verify height is reset to auto first
    textarea.scrollHeight = 200;
    rerender(<AutoResizeTextArea {...defaultProps} value="More content" />);

    expect(textarea.style.height).toBe("200px");
  });

  it("handles change event and triggers resize", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();

    render(<AutoResizeTextArea {...defaultProps} onChange={mockOnChange} />);

    const textarea = screen.getByRole("textbox");
    textarea.scrollHeight = 80;

    await user.type(textarea, "Test");

    expect(mockOnChange).toHaveBeenCalled();
    expect(textarea.style.height).toBe("80px");
  });

  it("works without optional props", () => {
    render(<AutoResizeTextArea value="test" onChange={() => {}} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue("test");
  });

  it("handles empty value", () => {
    render(<AutoResizeTextArea {...defaultProps} value="" />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("");
  });

  it("handles multiline content", () => {
    const multilineValue = "Line 1\nLine 2\nLine 3";
    render(<AutoResizeTextArea {...defaultProps} value={multilineValue} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue(multilineValue);
  });

  it("triggers resize effect when value changes", () => {
    const { rerender } = render(
      <AutoResizeTextArea {...defaultProps} value="Short" />
    );

    const textarea = screen.getByRole("textbox");

    // Mock scrollHeight for longer content
    textarea.scrollHeight = 150;

    // Rerender with longer content to trigger useEffect
    rerender(
      <AutoResizeTextArea
        {...defaultProps}
        value="Much longer content that should trigger a resize"
      />
    );

    expect(textarea.style.height).toBe("150px");
  });

  it("handles null textarea ref gracefully", () => {
    // This test verifies the component doesn't crash when ref is null
    // Can't easily mock useRef after import, so test the resize function
    // with a scenario where the textarea might not be available

    const { rerender } = render(
      <AutoResizeTextArea {...defaultProps} value="" />
    );

    // Should not throw an error when re-rendering
    expect(() => {
      rerender(<AutoResizeTextArea {...defaultProps} value="test content" />);
    }).not.toThrow();

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
  });

  it("preserves event object properties in onChange", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();

    render(<AutoResizeTextArea {...defaultProps} onChange={mockOnChange} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "a");

    const changeEvent = mockOnChange.mock.calls[0][0];
    expect(changeEvent).toHaveProperty("target");
    expect(changeEvent).toHaveProperty("type", "change");
  });

  it("maintains focus after typing", async () => {
    const user = userEvent.setup();

    render(<AutoResizeTextArea {...defaultProps} />);

    const textarea = screen.getByRole("textbox");
    await user.click(textarea);
    await user.type(textarea, "test");

    expect(textarea).toHaveFocus();
  });

  it("handles rapid successive changes", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();

    render(<AutoResizeTextArea {...defaultProps} onChange={mockOnChange} />);

    const textarea = screen.getByRole("textbox");
    textarea.scrollHeight = 100;

    await user.type(textarea, "rapid");

    expect(mockOnChange).toHaveBeenCalledTimes(5);
    expect(textarea.style.height).toBe("100px");
  });
});
