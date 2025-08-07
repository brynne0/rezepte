import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import useClickOutside from "../../hooks/ui/useClickOutside";
import "./UnitSelector.css";

const UnitSelector = ({ value, onChange, id, className }) => {
  const { t } = useTranslation();
  const units = t("units", { returnObjects: true });

  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setselectedIndex] = useState(-1);

  const inputRef = useRef(null);

  // Filter units based on search term
  const filteredUnits = units.filter(
    (unit) =>
      unit.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get current unit display
  const currentUnit = units.find((unit) => unit.value === value);
  const displayValue = currentUnit ? currentUnit.label : value || "";

  // Close dropdown when clicking outside
  const dropdownRef = useClickOutside(() => {
    setIsOpen(false);
    setSearchTerm("");
    setselectedIndex(-1);
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
    setselectedIndex(-1);

    // If user types exact match, select it immediately
    const exactMatch = units.find(
      (unit) =>
        unit.label.toLowerCase() === newSearchTerm.toLowerCase() ||
        unit.value.toLowerCase() === newSearchTerm.toLowerCase()
    );

    if (exactMatch && exactMatch.value !== value) {
      onChange(exactMatch.value);
    }
  };

  // Handle unit selection
  const handleUnitSelect = (selectedUnit) => {
    onChange(selectedUnit.value);
    setIsOpen(false);
    setSearchTerm("");
    setselectedIndex(-1);
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
        setselectedIndex((prev) =>
          prev < filteredUnits.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setselectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredUnits.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && filteredUnits[selectedIndex]) {
          handleUnitSelect(filteredUnits[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        setselectedIndex(-1);
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
    <div className={`unit-selector ${className || ""}`} ref={dropdownRef}>
      <div className="relative-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="unit-selector-input input input--full-width input--edit"
          placeholder={t("unit")}
          autoComplete="off"
        />
        <ChevronDown
          size={16}
          className={`unit-selector-chevron ${isOpen ? "open" : ""}`}
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
        <div className="unit-selector-dropdown">
          {filteredUnits.map((unit, index) => (
            <div
              key={unit.value}
              className={`unit-selector-option ${
                unit.value === value ? "selected" : ""
              } ${index === selectedIndex ? "selected" : ""}`}
              onClick={() => handleUnitSelect(unit)}
              onMouseEnter={() => setselectedIndex(index)}
            >
              {unit.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnitSelector;
