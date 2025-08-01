import { useRef, useEffect } from "react";

const AutoResizeInput = ({
  value,
  onChange,
  className,
  minWidth = 20,
  maxWidth = 120,
  syncWidth,
  ...props
}) => {
  const inputRef = useRef(null);
  const measureRef = useRef(null);

  const resizeInput = () => {
    const input = inputRef.current;
    const measure = measureRef.current;

    if (input && measure) {
      // Set the measuring span's text to the current value or placeholder
      measure.textContent = value || props.placeholder || "0";

      // Get the width needed for the content
      const contentWidth = measure.offsetWidth;

      // Calculate new width with more padding, constrained by min/max
      const calculatedWidth = Math.min(
        Math.max(contentWidth + 24, minWidth),
        maxWidth
      );

      // Use syncWidth if provided (for synchronized widths), otherwise use calculated
      const newWidth = syncWidth || calculatedWidth;

      input.style.width = newWidth + "px";

      // If syncWidth callback is provided, report our calculated width
      if (typeof syncWidth === "function") {
        syncWidth(calculatedWidth);
      }
    }
  };

  useEffect(() => {
    resizeInput();
  }, [value, syncWidth]);

  const handleChange = (e) => {
    onChange(e);
    resizeInput();
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        className={className}
        {...props}
      />
      {/* Hidden measuring element */}
      <span
        ref={measureRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "nowrap",
          fontSize: "inherit",
          fontFamily: "inherit",
          fontWeight: "inherit",
          padding: "0",
          border: "0",
          left: "-9999px",
          top: "0",
        }}
      />
    </div>
  );
};

export default AutoResizeInput;
