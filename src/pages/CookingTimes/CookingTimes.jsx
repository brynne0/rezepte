import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Timer,
  ArrowLeftRight,
  ArrowLeft,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CookingTimeRow from "../../components/CookingTimeRow/CookingTimeRow";
import {
  createCookingTime,
  updateCookingTime,
  deleteCookingTime,
  getTranslatedCookingTimes,
  updateCookingTimeTranslations,
} from "../../services/cookingTimesService";
import { getUserPreferredLanguage } from "../../services/userService";
import ConversionsTab from "../../components/ConversionsTab/ConversionsTab";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
import { cn } from "cn";

const CookingTimes = ({
  isEditMode: externalIsEditMode,
  setIsEditMode: externalSetIsEditMode,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("cooking-times");
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState("all");
  const [showExitEditModeModal, setShowExitEditModeModal] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const originalUserLanguage = useRef(null);
  const HAS_LOADED_ONCE = useRef(false);

  // Form data structure (matching RecipeForm pattern exactly)
  const [formData, setFormData] = useState({
    ungroupedCookingTimes: [],
    cookingTimeSections: [],
  });

  // Track original data to identify deletions
  const [originalData, setOriginalData] = useState({
    ungroupedCookingTimes: [],
    cookingTimeSections: [],
  });

  // Filtered data for search
  const [filteredData, setFilteredData] = useState({
    ungroupedCookingTimes: [],
    cookingTimeSections: [],
  });

  // Use external edit mode state from App.jsx (for disabling language switching)
  // or internal state if not provided (for standalone usage)
  const [internalIsEditMode, setInternalIsEditMode] = useState(false);
  const isEditMode =
    externalIsEditMode !== undefined ? externalIsEditMode : internalIsEditMode;
  const setIsEditMode = externalSetIsEditMode || setInternalIsEditMode;

  // Unsaved changes detection
  const hasUnsavedChanges = useCallback(() => {
    if (!isEditMode) return false;
    const currentData = JSON.stringify(formData);
    const initial = JSON.stringify(originalData);
    return currentData !== initial;
  }, [formData, originalData, isEditMode]);

  // Unsaved changes hook
  const {
    isModalOpen: isUnsavedChangesModalOpen,
    confirmNavigation,
    cancelNavigation,
    message: unsavedChangesMessage,
  } = useUnsavedChanges(hasUnsavedChanges(), t("unsaved_changes_warning"));

  // Generate unique IDs like RecipeForm
  const generateTempId = useCallback(() => {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }, []);

  const organizeCookingTimesIntoSections = useCallback(
    (data) => {
      const ungrouped = [];
      const sections = new Map();

      data.forEach((item) => {
        // Add tempId for consistency with RecipeForm pattern - ALL items get tempId
        const itemWithTempId = {
          ...item,
          tempId: generateTempId(),
        };

        if (!item.section_name) {
          ungrouped.push(itemWithTempId);
        } else {
          if (!sections.has(item.section_name)) {
            sections.set(item.section_name, {
              id: `section-${item.section_name}`,
              subheading: item.section_name,
              cookingTimes: [],
            });
          }
          sections.get(item.section_name).cookingTimes.push(itemWithTempId);
        }
      });

      const newFormData = {
        ungroupedCookingTimes: ungrouped,
        cookingTimeSections: Array.from(sections.values()),
      };

      setFormData(newFormData);
      setOriginalData(newFormData);
      setFilteredData(newFormData);
    },
    [generateTempId]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentLanguage = i18n.language.split("-")[0]; // Normalize region codes
      const preferredLanguage = await getUserPreferredLanguage();

      // Fetch cooking times with translations
      const cookingTimesData = await getTranslatedCookingTimes(
        currentLanguage,
        preferredLanguage // Use preferred language as fallback for items without original_language
      );

      // Organize data into sections exactly like RecipeForm
      organizeCookingTimesIntoSections(cookingTimesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [organizeCookingTimesIntoSections, i18n.language]);

  useEffect(() => {
    // Always load data on first render, then don't reload when in edit mode to preserve user's edits
    if (!HAS_LOADED_ONCE.current || !isEditMode) {
      loadData();
      // Reset selected section when language changes to avoid mismatched section names
      if (HAS_LOADED_ONCE.current) {
        setSelectedSection("all");
      }
      HAS_LOADED_ONCE.current = true;
    }
  }, [loadData, isEditMode]); // Reload when language changes (unless in edit mode)

  // Restore original language when exiting edit mode
  useEffect(() => {
    return () => {
      // On unmount, restore original language if it was changed
      if (
        originalUserLanguage.current &&
        originalUserLanguage.current !== i18n.language
      ) {
        i18n.changeLanguage(originalUserLanguage.current);
        originalUserLanguage.current = null; // Clear the stored language
      }
    };
  }, [i18n]);

  // Filter data based on selected section
  useEffect(() => {
    if (selectedSection === "all") {
      setFilteredData(formData);
      return;
    }

    // Filter by selected section
    const selectedSectionData = formData.cookingTimeSections.find(
      (section) => section.subheading === selectedSection
    );
    setFilteredData({
      ungroupedCookingTimes: [],
      cookingTimeSections: selectedSectionData ? [selectedSectionData] : [],
    });
  }, [selectedSection, formData]);

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
    [generateTempId]
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
  }, [generateTempId]);

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
    [formData.cookingTimeSections]
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
    []
  );

  // Handle section change (matches RecipeForm handleSectionChange pattern)
  const handleSectionChange = useCallback((sectionId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      cookingTimeSections: prev.cookingTimeSections.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section
      ),
    }));
  }, []);

  // Remove cooking time (matches RecipeForm removeIngredient pattern - local state only)
  const removeCookingTime = useCallback((sectionId, tempId) => {
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
  }, []);

  // Save all changes when Save Changes is clicked (like RecipeForm submit)
  const saveAllChanges = useCallback(async () => {
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
    [formData, isEditMode]
  );

  // Render cooking time item (uses CookingTimeRow component like RecipeForm uses IngredientRow)
  const renderCookingTimeItem = (
    item,
    index,
    sectionId,
    provided,
    snapshot
  ) => (
    <CookingTimeRow
      key={item.tempId || item.id}
      item={item}
      index={index}
      sectionId={sectionId}
      isEditMode={isEditMode}
      provided={provided}
      snapshot={snapshot}
      handleItemChange={handleCookingTimeChange}
      handleItemFieldEnter={handleCookingTimeFieldEnter}
      removeItem={removeCookingTime}
    />
  );

  const hasAnyItems =
    formData.ungroupedCookingTimes.length > 0 ||
    formData.cookingTimeSections.length > 0;

  const enterEditMode = async () => {
    // Switch to preferred language first, then enter edit mode
    const preferredLanguage = await getUserPreferredLanguage();
    if (i18n.language !== preferredLanguage) {
      originalUserLanguage.current = i18n.language;
      await i18n.changeLanguage(preferredLanguage);
      // Wait for data to reload in new language before entering edit mode
      await new Promise((resolve) => setTimeout(resolve, 100));
      toast.add({
        title: t("switched_to_preferred_language_for_editing"),
        type: "info",
      });
    }
    setIsEditMode(true);
    setSelectedSection("all");
  };

  const handleBackNavigation = () => {
    if (activeTab === "conversions") {
      setActiveTab("cooking-times");
    } else if (isEditMode) {
      // Check for unsaved changes before exiting edit mode
      if (hasUnsavedChanges()) {
        setShowExitEditModeModal(true);
      } else {
        setIsEditMode(false);
      }
    } else {
      navigate(-1);
    }
  };

  const handleConfirmExitEditMode = () => {
    setShowExitEditModeModal(false);
    setIsEditMode(false);
    // Reset to original data
    setFormData(originalData);
  };

  const handleCancelExitEditMode = () => {
    setShowExitEditModeModal(false);
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges()) {
      setShowExitEditModeModal(true);
    } else {
      setIsEditMode(false);
    }
  };

  const handleSaveEdit = async () => {
    await saveAllChanges();
    setIsEditMode(false);
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="flex flex-col items-stretch gap-4">
        <div className="relative flex w-full items-center justify-center">
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute left-0"
            onClick={handleBackNavigation}
            aria-label={t("go_back", "Go Back")}
          >
            <ArrowLeft />
          </Button>

          {isEditMode ? (
            <h1 className="text-lg font-semibold">{t("cooking_times_tab")}</h1>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="cooking-times">
                  <Timer />
                  {t("cooking_times_tab")}
                </TabsTrigger>
                <TabsTrigger value="conversions">
                  <ArrowLeftRight />
                  {t("conversions_tab")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {activeTab === "cooking-times" && !isEditMode && hasAnyItems && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-0"
                    onClick={enterEditMode}
                    aria-label={t("edit_mode", "Edit Mode")}
                  >
                    <Pencil size={16} />
                  </Button>
                }
              />
              <TooltipContent>{t("edit_mode", "Edit Mode")}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Section Filter Chips - Only for cooking times tab */}
        {activeTab === "cooking-times" && !isEditMode && hasAnyItems && (
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
            <Button
              variant="text"
              aria-pressed={selectedSection === "all"}
              onClick={() => setSelectedSection("all")}
            >
              <span className="font-forta uppercase">{t("all", "All")}</span>
            </Button>
            {formData.cookingTimeSections.map((section) => (
              <Button
                key={section.id}
                variant="text"
                aria-pressed={selectedSection === section.subheading}
                onClick={() => setSelectedSection(section.subheading)}
              >
                <span className="font-forta uppercase">
                  {section.subheading}
                </span>
              </Button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-lg border border-primary/50 bg-muted/20 p-3"
              >
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : activeTab === "conversions" ? (
          <ConversionsTab />
        ) : !hasAnyItems ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <Timer />
              </EmptyMedia>
              <EmptyTitle>
                {t("no_cooking_times_title", "No cooking times yet")}
              </EmptyTitle>
              <EmptyDescription>
                {t("add_first_cooking_time", "Add your first cooking time")}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                onClick={async () => {
                  setIsEditMode(true);
                  const preferredLanguage = await getUserPreferredLanguage();
                  if (i18n.language !== preferredLanguage) {
                    originalUserLanguage.current = i18n.language;
                    await i18n.changeLanguage(preferredLanguage);
                    await new Promise((resolve) => setTimeout(resolve, 50));
                    toast.add({
                      title: t("switched_to_preferred_language_for_editing"),
                      type: "info",
                    });
                  }
                  addCookingTime("ungrouped");
                  setSelectedSection("all");
                }}
              >
                <Plus size={16} />
                {t("add_first_cooking_time")}
              </Button>
            </EmptyContent>
          </Empty>
        ) : filteredData.ungroupedCookingTimes.length === 0 &&
          filteredData.cookingTimeSections.length === 0 &&
          selectedSection !== "all" ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("no_items_in_category", "No items in this category.")}
          </p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            {isEditMode && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={addSection}
              >
                <Plus size={16} />
                {t("add_section")}
              </Button>
            )}

            {/* Ungrouped Cooking Times */}
            {(isEditMode
              ? formData.ungroupedCookingTimes.length > 0
              : filteredData.ungroupedCookingTimes.length > 0) && (
              <>
                {isEditMode ? (
                  <Droppable droppableId="ungrouped" type="cooking-time-item">
                    {(provided, snapshot) => (
                      <div
                        className={cn(
                          "flex flex-col gap-2 rounded-lg",
                          snapshot.isDraggingOver && "bg-muted/40"
                        )}
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {formData.ungroupedCookingTimes.map((item, index) => (
                          <Draggable
                            key={`ungrouped-${index}-${item.tempId || item.id}`}
                            draggableId={`ungrouped-${index}-${item.tempId || item.id}`}
                            index={index}
                            type="cooking-time-item"
                          >
                            {(provided, snapshot) =>
                              renderCookingTimeItem(
                                item,
                                index,
                                "ungrouped",
                                provided,
                                snapshot
                              )
                            }
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {filteredData.ungroupedCookingTimes.map((item, index) =>
                      renderCookingTimeItem(
                        item,
                        index,
                        "ungrouped",
                        null,
                        null
                      )
                    )}
                  </div>
                )}
              </>
            )}

            {/* Add Cooking Time Button for Ungrouped */}
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => addCookingTime("ungrouped")}
              >
                <Plus size={16} data-testid="add-cooking-time-btn" />
                {t("add_cooking_time")}
              </Button>
            )}

            {/* Cooking Time Sections */}
            {(isEditMode
              ? formData.cookingTimeSections.length > 0
              : filteredData.cookingTimeSections.length > 0) && (
              <Droppable droppableId="sections" type="cooking-time-section">
                {(provided) => (
                  <div
                    className="flex flex-col gap-4"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {(isEditMode
                      ? formData.cookingTimeSections
                      : filteredData.cookingTimeSections
                    ).map((section, sectionIndex) => (
                      <Draggable
                        key={section.id}
                        draggableId={section.id}
                        index={sectionIndex}
                        type="cooking-time-section"
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              isEditMode &&
                                "rounded-xl border border-border bg-muted/20 p-3",
                              snapshot.isDragging && "shadow-md"
                            )}
                          >
                            {/* Section Header */}
                            {isEditMode ? (
                              <div className="mb-3 flex items-center gap-2">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab text-muted-foreground active:cursor-grabbing"
                                >
                                  <GripVertical size={16} />
                                </div>
                                {editingSectionId === section.id ||
                                !section.subheading ? (
                                  <Input
                                    type="text"
                                    value={section.subheading}
                                    onChange={(e) =>
                                      handleSectionChange(
                                        section.id,
                                        "subheading",
                                        e.target.value
                                      )
                                    }
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Enter" &&
                                        section.subheading.trim()
                                      ) {
                                        e.preventDefault();
                                        setEditingSectionId(null);
                                      }
                                    }}
                                    onFocus={() =>
                                      setEditingSectionId(section.id)
                                    }
                                    onBlur={() => {
                                      if (section.subheading.trim()) {
                                        setEditingSectionId(null);
                                      }
                                    }}
                                    autoFocus={editingSectionId === section.id}
                                    className="section-title-input flex-1"
                                    placeholder={t("section_title")}
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingSectionId(section.id)
                                    }
                                    className="flex-1 truncate text-left font-medium [word-break:break-word]"
                                  >
                                    {section.subheading}
                                  </button>
                                )}
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost-destructive"
                                        size="icon-sm"
                                        onClick={() =>
                                          removeSection(section.id)
                                        }
                                        aria-label={t("remove_section")}
                                      >
                                        <Trash2 size={16} />
                                      </Button>
                                    }
                                  />
                                  <TooltipContent>
                                    {t("remove_section")}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            ) : (
                              // Only show section header in view mode if showing all sections
                              selectedSection === "all" && (
                                <h2 className="mb-2 flex items-center gap-3 font-medium [word-break:break-word] after:h-px after:flex-1 after:bg-border after:content-['']">
                                  {section.subheading}
                                </h2>
                              )
                            )}

                            {/* Section Cooking Times */}
                            {isEditMode ? (
                              <Droppable
                                droppableId={section.id}
                                type="cooking-time-item"
                              >
                                {(provided, snapshot) => (
                                  <div
                                    className={cn(
                                      "flex flex-col gap-2 rounded-lg",
                                      snapshot.isDraggingOver && "bg-muted/40"
                                    )}
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                  >
                                    {section.cookingTimes.map(
                                      (item, itemIndex) => (
                                        <Draggable
                                          key={`${section.id}-${itemIndex}-${item.tempId || item.id}`}
                                          draggableId={`${section.id}-${itemIndex}-${item.tempId || item.id}`}
                                          index={itemIndex}
                                          type="cooking-time-item"
                                        >
                                          {(provided, snapshot) =>
                                            renderCookingTimeItem(
                                              item,
                                              itemIndex,
                                              section.id,
                                              provided,
                                              snapshot
                                            )
                                          }
                                        </Draggable>
                                      )
                                    )}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            ) : (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {section.cookingTimes.map((item, itemIndex) =>
                                  renderCookingTimeItem(
                                    item,
                                    itemIndex,
                                    section.id,
                                    null,
                                    null
                                  )
                                )}
                              </div>
                            )}

                            {/* Add Cooking Time Button (like RecipeForm) */}
                            {isEditMode && (
                              <Button
                                type="button"
                                variant="outline"
                                className="mt-2 w-full"
                                onClick={() => addCookingTime(section.id)}
                                aria-label={t("add_cooking_time")}
                              >
                                <Plus
                                  size={16}
                                  data-testid="add-section-cooking-time-btn"
                                />
                                {t("add_cooking_time")}
                              </Button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}

            {/* Action buttons for edit mode */}
            {isEditMode && (
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleCancelEdit}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={handleSaveEdit}
                >
                  {t("save_changes", "Save Changes")}
                </Button>
              </div>
            )}
          </DragDropContext>
        )}
      </CardContent>

      {/* Unsaved Changes Modal - for page navigation */}
      <AlertDialog
        open={isUnsavedChangesModalOpen}
        onOpenChange={(open) => {
          if (!open) cancelNavigation();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{unsavedChangesMessage}</AlertDialogTitle>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("stay")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmNavigation}
            >
              {t("leave_page")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Edit Mode Modal - for exiting edit mode with unsaved changes */}
      <AlertDialog
        open={showExitEditModeModal}
        onOpenChange={(open) => {
          if (!open) handleCancelExitEditMode();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsaved_changes_warning")}</AlertDialogTitle>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("stay")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmExitEditMode}
            >
              {t("leave_page")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default CookingTimes;
