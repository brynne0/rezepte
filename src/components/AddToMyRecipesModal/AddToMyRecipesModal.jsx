import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useCategories } from "@/hooks/data/useCategories";
import CategoryPicker from "../CategoryPicker/CategoryPicker";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const AddToMyRecipesModal = ({ open, onOpenChange, isSaving, onConfirm }) => {
  const { t } = useTranslation();
  const { categories } = useCategories();
  const [selectedCategories, setSelectedCategories] = useState([]);

  const handleOpenChange = (next) => {
    if (!next) setSelectedCategories([]);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("add_to_my_recipes_modal_title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <span
            id="add-to-my-recipes-category-label"
            className="text-sm font-medium"
          >
            {t("category")}
          </span>
          <CategoryPicker
            categories={categories}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            labelledBy="add-to-my-recipes-category-label"
          />
          {selectedCategories.length === 0 && (
            <span className="text-sm text-muted-foreground">
              {t("add_to_my_recipes_select_category")}
            </span>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(selectedCategories)}
            disabled={isSaving || selectedCategories.length === 0}
          >
            {isSaving && <Spinner className="size-4" />}
            {t("add_to_my_recipes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddToMyRecipesModal;
