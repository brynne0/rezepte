import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";

// Section heading that shows as text and turns into an input when clicked
const SectionTitleInput = ({
  value,
  isEditing,
  onChange,
  onEditingChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  if (!isEditing && value) {
    return (
      <button
        type="button"
        onClick={() => onEditingChange(true)}
        disabled={disabled}
        className="flex-1 truncate text-left font-medium [word-break:break-word]"
      >
        {value}
      </button>
    );
  }

  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && value.trim()) {
          e.preventDefault();
          onEditingChange(false);
        }
      }}
      onFocus={() => onEditingChange(true)}
      onBlur={() => {
        if (value.trim()) onEditingChange(false);
      }}
      autoFocus={isEditing}
      className="section-title-input flex-1"
      placeholder={t("section_title")}
    />
  );
};

export default SectionTitleInput;
