import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Toggleable category chips plus an inline "add new category" flow. New
// names are kept locally until the caller's submit persists them.
const CategoryPicker = ({
  categories,
  selected,
  onChange,
  disabled = false,
  labelledBy,
}) => {
  const { t } = useTranslation();

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addCategoryError, setAddCategoryError] = useState("");
  const [pendingNewCategories, setPendingNewCategories] = useState([]);

  const displayCategories = [
    ...(categories || []),
    ...pendingNewCategories
      .filter((name) => !categories?.some((c) => c.value === name))
      .map((name) => ({ value: name, label: name })),
  ];

  const handleStartAddCategory = () => {
    setIsAddingCategory(true);
    setNewCategoryName("");
    setAddCategoryError("");
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
    setNewCategoryName("");
    setAddCategoryError("");
  };

  const handleSaveNewCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      setAddCategoryError(t("category_name_required"));
      return;
    }

    const isDuplicate = displayCategories.some(
      (category) => category.label.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setAddCategoryError(t("category_name_already_exists"));
      return;
    }

    setPendingNewCategories((prev) => [...prev, trimmedName]);
    onChange([...selected, trimmedName]);
    setIsAddingCategory(false);
    setNewCategoryName("");
    setAddCategoryError("");
  };

  return (
    <>
      <ToggleGroup
        variant="outline"
        multiple
        value={selected}
        onValueChange={onChange}
        aria-labelledby={labelledBy}
        className="flex flex-wrap"
        disabled={disabled}
      >
        {displayCategories
          .filter((category) => category.value !== "all_recipes")
          .map((category) => (
            <ToggleGroupItem
              key={category.value}
              value={category.value}
              className="aria-pressed:border-accent-red aria-pressed:bg-accent-red/10 aria-pressed:text-accent-red"
            >
              {category.label}
            </ToggleGroupItem>
          ))}
      </ToggleGroup>

      {!disabled &&
        (isAddingCategory ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                autoFocus
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  if (addCategoryError) setAddCategoryError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveNewCategory();
                  } else if (e.key === "Escape") {
                    handleCancelAddCategory();
                  }
                }}
                placeholder={t("category_name")}
                aria-invalid={!!addCategoryError}
              />
              <Button type="button" size="sm" onClick={handleSaveNewCategory}>
                {t("add_category")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelAddCategory}
              >
                {t("cancel")}
              </Button>
            </div>
            {addCategoryError && (
              <span className="text-sm text-destructive">
                {addCategoryError}
              </span>
            )}
          </div>
        ) : (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleStartAddCategory}
            >
              <Plus size={16} />
              {t("add_category")}
            </Button>
          </div>
        ))}
    </>
  );
};

export default CategoryPicker;
