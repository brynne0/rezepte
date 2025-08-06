import { useRef, useEffect } from "react";

const AutoResizeTextArea = ({
  value,
  onChange,
  onKeyDown,
  className,
  placeholder,
  readOnly,
  id,
}) => {
  const textareaRef = useRef(null);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  const handleChange = (e) => {
    onChange(e);
    resizeTextarea();
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      className={className}
      placeholder={placeholder}
      readOnly={readOnly}
      id={id}
    />
  );
};

export default AutoResizeTextArea;
