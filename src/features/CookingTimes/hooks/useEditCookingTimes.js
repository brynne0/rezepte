import { useState, useCallback } from "react";
import {
  createCookingTime,
  updateCookingTime,
  deleteCookingTime,
} from "../../../services/cookingTimesService";
import { updateCookingTimeTranslations } from "../../../services/cookingTimesTranslationService";
import { getUserPreferredLanguage } from "../../../services/userService";
import { useUnsavedChanges } from "../../../hooks/ui/useUnsavedChanges";

export const useEditCookingTimes = ({
  isEditMode,
  formData,
  setFormData,
  originalData,
  generateTempId,
  loadData,
  t,
}) => {
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Unsaved changes detection
  const hasUnsavedChanges = useCallback(() => {
    if (!isEditMode) return false;
    const currentData = JSON.stringify(formData);
    const initial = JSON.stringify(originalData);
    return currentData !== initial;
  }, [formData, originalData, isEditMode]);

  const {
    isModalOpen: isUnsavedChangesModalOpen,
    confirmNavigation,
    cancelNavigation,
    message: unsavedChangesMessage,
  } = useUnsavedChanges(hasUnsavedChanges(), t("unsaved_changes_warning"));

  // Add cooking time function (matches RecipeForm addIngredient pattern)
  const addCookingTime = useCallback(
    (sectionId) => {
      const newTempId = generateTempId();
      const newItem = {
        tempId: newTempId,
        ingredient_name: "",
        cooking_time: "",
        soaking_time: "",
        dry_weight: "",
        cooked_weight: "",
        notes: "",
      };

      if (sectionId === "ungrouped") {
        setFormData((prev) => ({
          ...prev,
          ungroupedCookingTimes: [...prev.ungroupedCookingTimes, newItem],
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          cookingTimeSections: prev.cookingTimeSections.map((section) =>
            section.id === sectionId
              ? { ...section, cookingTimes: [...section.cookingTimes, newItem] }
              : section
          ),
        }));
      }

      // Focus on the new item's name input (like RecipeForm)
      setTimeout(() => {
        const nameInput = document.querySelector(
          `[id*="${newTempId}"][id*="ingredient-name"]`
        );
        if (nameInput) {
          nameInput.focus();
        }
      }, 10);
    },
    [generateTempId, setFormData]
  );

  // Add section function (matches RecipeForm addSection pattern)
  const addSection = useCallback(() => {
    const newSectionId = `section-${Date.now()}`;
    const newTempId = generateTempId();

    const newSection = {
      id: newSectionId,
      subheading: "",
      cookingTimes: [
        {
          tempId: newTempId,
          ingredient_name: "",
          cooking_time: "",
          soaking_time: "",
          dry_weight: "",
          cooked_weight: "",
          notes: "",
        },
      ],
    };

    setFormData((prev) => ({
      ...prev,
      cookingTimeSections: [...prev.cookingTimeSections, newSection],
    }));

    // Focus on the section title input (like RecipeForm)
    setTimeout(() => {
      const sectionInputs = document.querySelectorAll(".section-title-input");
      if (sectionInputs.length > 0) {
        const lastInput = sectionInputs[sectionInputs.length - 1];
        lastInput.focus();
      }
    }, 10);
  }, [generateTempId, setFormData]);

  // Remove section function
  const removeSection = useCallback(
    (sectionId) => {
      const sectionToRemove = formData.cookingTimeSections.find(
        (s) => s.id === sectionId
      );
      if (sectionToRemove?.cookingTimes?.length > 0) {
        // Move items to ungrouped
        setFormData((prev) => ({
          ...prev,
          ungroupedCookingTimes: [
            ...prev.ungroupedCookingTimes,
            ...sectionToRemove.cookingTimes,
          ],
          cookingTimeSections: prev.cookingTimeSections.filter(
            (section) => section.id !== sectionId
          ),
        }));
      } else {
        // Just remove empty section
        setFormData((prev) => ({
          ...prev,
          cookingTimeSections: prev.cookingTimeSections.filter(
            (section) => section.id !== sectionId
          ),
        }));
      }
    },
    [formData.cookingTimeSections, setFormData]
  );

  // Handle cooking time change (matches RecipeForm handleIngredientChange pattern)
  const handleCookingTimeChange = useCallback(
    (sectionId, tempId, field, value) => {
      const updateItem = (item) =>
        item.tempId === tempId ? { ...item, [field]: value } : item;

      if (sectionId === "ungrouped") {
        setFormData((prev) => ({
          ...prev,
          ungroupedCookingTimes: prev.ungroupedCookingTimes.map(updateItem),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          cookingTimeSections: prev.cookingTimeSections.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  cookingTimes: section.cookingTimes.map(updateItem),
                }
              : section
          ),
        }));
      }
    },
    [setFormData]
  );

  // Handle section change (matches RecipeForm handleSectionChange pattern)
  const handleSectionChange = useCallback(
    (sectionId, field, value) => {
      setFormData((prev) => ({
        ...prev,
        cookingTimeSections: prev.cookingTimeSections.map((section) =>
          section.id === sectionId ? { ...section, [field]: value } : section
        ),
      }));
    },
    [setFormData]
  );

  // Remove cooking time (matches RecipeForm removeIngredient pattern - local state only)
  const removeCookingTime = useCallback(
    (sectionId, tempId) => {
      if (sectionId === "ungrouped") {
        setFormData((prev) => ({
          ...prev,
          ungroupedCookingTimes: prev.ungroupedCookingTimes.filter(
            (item) => item.tempId !== tempId
          ),
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          cookingTimeSections: prev.cookingTimeSections.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  cookingTimes: section.cookingTimes.filter(
                    (item) => item.tempId !== tempId
                  ),
                }
              : section
          ),
        }));
      }
    },
    [setFormData]
  );

  // Save all changes when Save Changes is clicked (like RecipeForm submit)
  const saveAllChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      // Get user's preferred language for new items
      const preferredLanguage = await getUserPreferredLanguage();

      // Step 1: Build a complete list of all current items with their positions
      let globalOrderIndex = 0;
      const allCurrentItems = [];

      // Add ungrouped items with order indices
      formData.ungroupedCookingTimes.forEach((item) => {
        allCurrentItems.push({
          ...item,
          section_name: null,
          order_index: globalOrderIndex++,
        });
      });

      // Add sectioned items with order indices
      formData.cookingTimeSections.forEach((section) => {
        section.cookingTimes.forEach((item) => {
          allCurrentItems.push({
            ...item,
            section_name: section.subheading,
            order_index: globalOrderIndex++,
          });
        });
      });

      // Step 2: Identify items to delete (were in original but not in current)
      const originalItems = new Map();

      // Build map of original items by their real ID
      originalData.ungroupedCookingTimes.forEach((item) => {
        if (item.id) originalItems.set(item.id, item);
      });
      originalData.cookingTimeSections.forEach((section) => {
        section.cookingTimes.forEach((item) => {
          if (item.id) originalItems.set(item.id, item);
        });
      });

      // Build set of current items by their real ID
      const currentIds = new Set();
      allCurrentItems.forEach((item) => {
        if (item.id) currentIds.add(item.id);
      });

      // Delete items that were removed
      for (const [originalId, originalItem] of originalItems) {
        if (!currentIds.has(originalId)) {
          console.log(
            "Deleting cooking time:",
            originalId,
            originalItem.ingredient_name
          );
          await deleteCookingTime(originalId);
        }
      }

      // Step 3: Create new items and update existing items
      const itemsToCreate = [];
      const itemsToUpdate = [];

      allCurrentItems.forEach((item) => {
        if (item.ingredient_name?.trim()) {
          if (!item.id) {
            // New item - needs to be created
            itemsToCreate.push(item);
          } else {
            // Existing item - always update to ensure order_index and section are correct
            const originalItem = originalItems.get(item.id);

            // Check if any field has changed (including order and section)
            const hasChanges =
              originalItem &&
              (item.ingredient_name !== originalItem.ingredient_name ||
                item.cooking_time !== originalItem.cooking_time ||
                item.soaking_time !== originalItem.soaking_time ||
                item.dry_weight !== originalItem.dry_weight ||
                item.cooked_weight !== originalItem.cooked_weight ||
                item.notes !== originalItem.notes ||
                item.order_index !== originalItem.order_index ||
                item.section_name !== originalItem.section_name);

            if (hasChanges) {
              itemsToUpdate.push(item);
            }
          }
        }
      });

      // Create new items
      console.log("Items to create:", itemsToCreate);
      for (const item of itemsToCreate) {
        const cookingTimeData = {
          ingredient_name: item.ingredient_name.trim(),
          cooking_time: item.cooking_time || null,
          soaking_time: item.soaking_time || null,
          dry_weight: item.dry_weight ? parseInt(item.dry_weight) : null,
          cooked_weight: item.cooked_weight
            ? parseInt(item.cooked_weight)
            : null,
          notes: item.notes?.trim() || null,
        };

        console.log(
          "Creating cooking time:",
          cookingTimeData,
          "in section:",
          item.section_name,
          "with order_index:",
          item.order_index
        );
        await createCookingTime(
          cookingTimeData,
          item.section_name,
          item.order_index,
          preferredLanguage
        );
      }

      // Update existing items
      console.log("Items to update:", itemsToUpdate);
      for (const item of itemsToUpdate) {
        const originalItem = originalItems.get(item.id);

        const cookingTimeData = {
          ingredient_name: item.ingredient_name.trim(),
          cooking_time: item.cooking_time || null,
          soaking_time: item.soaking_time || null,
          dry_weight: item.dry_weight ? parseInt(item.dry_weight) : null,
          cooked_weight: item.cooked_weight
            ? parseInt(item.cooked_weight)
            : null,
          notes: item.notes?.trim() || null,
          section_name: item.section_name,
          order_index: item.order_index,
        };

        console.log("Updating cooking time:", item.id, cookingTimeData);
        await updateCookingTime(item.id, cookingTimeData);

        // Update translations if any translatable field changed
        if (
          originalItem &&
          (item.ingredient_name !== originalItem.ingredient_name ||
            item.notes !== originalItem.notes ||
            item.section_name !== originalItem.section_name ||
            item.cooking_time !== originalItem.cooking_time ||
            item.soaking_time !== originalItem.soaking_time)
        ) {
          await updateCookingTimeTranslations(item.id, originalItem, item);
        }
      }

      // Reload data after saving
      await loadData();
    } catch (error) {
      console.error("Error saving changes:", error);
      alert(error.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [formData, originalData, loadData]);

  // Handle field enter navigation (matches RecipeForm handleIngredientFieldEnter pattern)
  const handleCookingTimeFieldEnter = useCallback(
    (e, currentField, sectionId, tempId, index) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();

        const fieldOrder = [
          "ingredient_name",
          "cooking_time",
          "soaking_time",
          "dry_weight",
          "cooked_weight",
          "notes",
        ];
        const currentFieldIndex = fieldOrder.indexOf(currentField);
        const nextFieldIndex = currentFieldIndex + 1;

        if (nextFieldIndex < fieldOrder.length) {
          // Move to next field in same item
          const nextField = fieldOrder[nextFieldIndex];
          const nextInput = document.getElementById(
            `cooking-time-${nextField.replace(/_/g, "-")}-${sectionId}-${index}-${tempId}`
          );
          if (nextInput) {
            nextInput.focus();
          }
        } else {
          // Move to first field of next item or create new one
          const items =
            sectionId === "ungrouped"
              ? formData.ungroupedCookingTimes
              : formData.cookingTimeSections.find((s) => s.id === sectionId)
                  ?.cookingTimes || [];

          const nextIndex = index + 1;
          const nextItem = items[nextIndex];

          if (nextItem) {
            const nextInput = document.getElementById(
              `cooking-time-ingredient-name-${sectionId}-${nextIndex}-${nextItem.tempId || nextItem.id}`
            );
            if (nextInput) {
              nextInput.focus();
            }
          } else {
            // No next item, add a new one
            addCookingTime(sectionId);
          }
        }
      }
    },
    [formData, addCookingTime]
  );

  // Handle drag and drop reordering (matches RecipeForm handleDragEnd pattern)
  const handleDragEnd = useCallback(
    (result) => {
      if (!result.destination || !isEditMode) return;

      const { source, destination, type } = result;

      if (type === "cooking-time-item") {
        const sourceDroppableId = source.droppableId;
        const destinationDroppableId = destination.droppableId;

        if (sourceDroppableId === destinationDroppableId) {
          // Same container reordering
          if (sourceDroppableId === "ungrouped") {
            const reorderedItems = Array.from(formData.ungroupedCookingTimes);
            const [reorderedItem] = reorderedItems.splice(source.index, 1);
            reorderedItems.splice(destination.index, 0, reorderedItem);
            setFormData((prev) => ({
              ...prev,
              ungroupedCookingTimes: reorderedItems,
            }));
          } else {
            // Within a section
            setFormData((prev) => ({
              ...prev,
              cookingTimeSections: prev.cookingTimeSections.map((section) => {
                if (section.id === sourceDroppableId) {
                  const reorderedItems = Array.from(section.cookingTimes);
                  const [reorderedItem] = reorderedItems.splice(
                    source.index,
                    1
                  );
                  reorderedItems.splice(destination.index, 0, reorderedItem);
                  return { ...section, cookingTimes: reorderedItems };
                }
                return section;
              }),
            }));
          }
        } else {
          // Different containers - move item between sections
          const sourceSection = formData.cookingTimeSections.find(
            (s) => s.id === sourceDroppableId
          );
          const destinationSection = formData.cookingTimeSections.find(
            (s) => s.id === destinationDroppableId
          );

          let sourceItems, itemToMove;

          if (sourceDroppableId === "ungrouped") {
            sourceItems = [...formData.ungroupedCookingTimes];
            [itemToMove] = sourceItems.splice(source.index, 1);
          } else {
            sourceItems = [...sourceSection.cookingTimes];
            [itemToMove] = sourceItems.splice(source.index, 1);
          }

          if (destinationDroppableId === "ungrouped") {
            const destinationItems = [...formData.ungroupedCookingTimes];
            destinationItems.splice(destination.index, 0, itemToMove);

            setFormData((prev) => ({
              ...prev,
              ungroupedCookingTimes: destinationItems,
              cookingTimeSections:
                sourceDroppableId === "ungrouped"
                  ? prev.cookingTimeSections
                  : prev.cookingTimeSections.map((section) =>
                      section.id === sourceDroppableId
                        ? { ...section, cookingTimes: sourceItems }
                        : section
                    ),
            }));
          } else {
            const destinationItems = [...destinationSection.cookingTimes];
            destinationItems.splice(destination.index, 0, itemToMove);

            setFormData((prev) => ({
              ...prev,
              ungroupedCookingTimes:
                sourceDroppableId === "ungrouped"
                  ? sourceItems
                  : prev.ungroupedCookingTimes,
              cookingTimeSections: prev.cookingTimeSections.map((section) => {
                if (section.id === sourceDroppableId) {
                  return { ...section, cookingTimes: sourceItems };
                } else if (section.id === destinationDroppableId) {
                  return { ...section, cookingTimes: destinationItems };
                }
                return section;
              }),
            }));
          }
        }
      } else if (type === "cooking-time-section") {
        // Handle section reordering
        const reorderedSections = Array.from(formData.cookingTimeSections);
        const [reorderedItem] = reorderedSections.splice(source.index, 1);
        reorderedSections.splice(destination.index, 0, reorderedItem);
        setFormData((prev) => ({
          ...prev,
          cookingTimeSections: reorderedSections,
        }));
      }
    },
    [formData, isEditMode, setFormData]
  );

  return {
    editingSectionId,
    setEditingSectionId,
    isSaving,
    hasUnsavedChanges,
    isUnsavedChangesModalOpen,
    confirmNavigation,
    cancelNavigation,
    unsavedChangesMessage,
    addCookingTime,
    addSection,
    removeSection,
    handleCookingTimeChange,
    handleSectionChange,
    removeCookingTime,
    saveAllChanges,
    handleCookingTimeFieldEnter,
    handleDragEnd,
  };
};
