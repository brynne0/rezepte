import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import useClickOutside from "../../hooks/ui/useClickOutside";
import "./Selector.css";

const Selector = ({ 
  value, 
  onChange, 
  id, 
  className, 
  options = [],
  placeholder,
  type = "generic" // "unit", "category", or "generic"
}) => {
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef(null);

  // Get options based on type
  const getOptions = () => {
    switch (type) {
      case "unit":
        return t("units", { returnObjects: true }) || [];
      case "category":
        // Filter out "all" category for category selector
        return options?.filter((cat) => cat.value.toLowerCase() !== "all") || [];
      default:
        return options || [];
    }
  };

  const allOptions = getOptions();

  // Filter options based on search term
  const filteredOptions = allOptions.filter(
    (option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get current option display
  const currentOption = allOptions.find((option) => option.value === value);
  const displayValue = currentOption ? (currentOption.label || currentOption.value) : value || "";

  // Get placeholder text based on type
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (type) {
      case "unit":
        return t("unit");
      case "category":
        return t("select_category");
      default:
        return t("select_option");
    }
  };

  // Close dropdown when clicking outside
  const dropdownRef = useClickOutside(() => {
    setIsOpen(false);
    setSearchTerm("");
    setSelectedIndex(-1);
  });

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    setSearchTerm("");
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setIsOpen(true);
    setSelectedIndex(-1);

    // If user types exact match, select it immediately
    const exactMatch = filteredOptions.find(
      (option) =>
        option.label.toLowerCase() === newSearchTerm.toLowerCase() ||
        option.value.toLowerCase() === newSearchTerm.toLowerCase()
    );

    if (exactMatch && exactMatch.value !== value) {
      onChange(exactMatch.value);
    }
  };

  // Handle option selection
  const handleOptionSelect = (selectedOption) => {
    onChange(selectedOption.value);
    setIsOpen(false);
    setSearchTerm("");
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
          handleOptionSelect(filteredOptions[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Update search term when opening dropdown
  useEffect(() => {
    if (isOpen && !searchTerm) {
      setSearchTerm("");
    }
  }, [isOpen]);

  return (
    <div className={`selector ${className || ""}`} ref={dropdownRef}>
      <div className="relative-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="selector-input input input--full-width input--edit"
          placeholder={getPlaceholder()}
          autoComplete="off"
        />
        <ChevronDown
          size={16}
          className={`selector-chevron ${isOpen ? "open" : ""}`}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setSearchTerm("");
            } else {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
        />
      </div>

      {isOpen && (
        <div className="selector-dropdown">
          {filteredOptions.map((option, index) => (
            <div
              key={option.value}
              className={`selector-option ${
                option.value === value ? "selected" : ""
              } ${index === selectedIndex ? "selected" : ""}`}
              onClick={() => handleOptionSelect(option)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {option.label || option.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Selector;