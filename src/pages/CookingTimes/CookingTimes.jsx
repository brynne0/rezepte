import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import {
  Plus,
  Timer,
  ArrowLeftRight,
  GripVertical,
  ArrowBigLeft,
  Pencil,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CookingTimeRow from "../../components/CookingTimeRow/CookingTimeRow";
import "../../components/CookingTimeRow/CookingTimeRow.css";
import {
  createCookingTime,
  updateCookingTime,
  deleteCookingTime,
  getTranslatedCookingTimes,
  updateCookingTimeTranslations,
} from "../../services/cookingTimesService";
import { getUserPreferredLanguage } from "../../services/userService";
import ConversionsTab from "../../components/ConversionsTab/ConversionsTab";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
import "./CookingTimes.css";

const CookingTimes = ({
  isEditMode: externalIsEditMode,
  setIsEditMode: externalSetIsEditMode,
}) => {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("cooking-times");
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState("all");
  const [showExitEditModeModal, setShowExitEditModeModal] = useState(false);
  const originalUserLanguage = useRef(null);

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
    navigate: navigateWithConfirmation,
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
    loadData();
  }, [loadData]); // Reload when language changes

  // Switch to preferred language when entering edit mode
  useEffect(() => {
    const switchToPreferredLanguage = async () => {
      if (isEditMode) {
        const preferredLanguage = await getUserPreferredLanguage();
        if (i18n.language !== preferredLanguage) {
          // Store current language before switching
          originalUserLanguage.current = i18n.language;
          i18n.changeLanguage(preferredLanguage);
        }
      }
    };
    switchToPreferredLanguage();
  }, [isEditMode, i18n]);

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
    if (selectedSection === "ungrouped") {
      setFilteredData({
        ungroupedCookingTimes: formData.ungroupedCookingTimes,
        cookingTimeSections: [],
      });
    } else {
      const selectedSectionData = formData.cookingTimeSections.find(
        (section) => section.subheading === selectedSection
      );
      setFilteredData({
        ungroupedCookingTimes: [],
        cookingTimeSections: selectedSectionData ? [selectedSectionData] : [],
      });
    }
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
          cooking_time: item.cooking_time ? parseInt(item.cooking_time) : null,
          soaking_time: item.soaking_time ? parseInt(item.soaking_time) : null,
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
          cooking_time: item.cooking_time ? parseInt(item.cooking_time) : null,
          soaking_time: item.soaking_time ? parseInt(item.soaking_time) : null,
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
            item.section_name !== originalItem.section_name)
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

  const EmptyState = (
    { type, icon: IconComponent, onAddClick } // eslint-disable-line no-unused-vars
  ) => (
    <div className="empty-state">
      <div>
        <IconComponent size={40} />
      </div>
      <h3 className="empty-state-title">
        {type === "cooking-times" &&
          t("no_cooking_times_title", "No cooking times yet")}
      </h3>
      <button className="btn btn-tertiary" onClick={onAddClick}>
        <Plus size={20} />
        {t("add_first_cooking_time")}
      </button>
    </div>
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

  if (loading) {
    return <LoadingAcorn />;
  }

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
      navigateWithConfirmation(-1);
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

  return (
    <div className="card card-form">
      <div className="flex-column-center">
        <div className="cookingtimes-header flex-between ">
          <button
            className="btn-unstyled back-arrow"
            onClick={handleBackNavigation}
            aria-label={t("go_back", "Go Back")}
          >
            <ArrowBigLeft size={28} />
          </button>
          <div className="flex-row cookingtime-tabs-wrapper">
            <button
              className={`tab-button ${activeTab === "cooking-times" ? "active" : ""}`}
              onClick={() => setActiveTab("cooking-times")}
            >
              <Timer size={20} />
              {t("cooking_times_tab")}
            </button>
            <button
              className={`tab-button ${activeTab === "conversions" ? "active" : ""}`}
              onClick={() => setActiveTab("conversions")}
            >
              <ArrowLeftRight size={20} />
              {t("conversions_tab")}
            </button>
          </div>
          {/* Edit button - Only show on cooking times tab when not in edit mode */}
          {activeTab === "cooking-times" &&
          !isEditMode &&
          (formData.ungroupedCookingTimes.length > 0 ||
            formData.cookingTimeSections.length > 0) ? (
            <button
              className="btn-unstyled pencil-icon-right"
              onClick={() => setIsEditMode(true)}
              aria-label={t("edit_mode", "Edit Mode")}
            >
              <Pencil size={20} />
            </button>
          ) : (
            <div className="pencil-placeholder" />
          )}
        </div>

        {/* Cooking Times Tab Content */}
        <div className={`${isEditMode ? "flex-column-center" : ""}`}>
          {/* Category Filter Chips - Only for cooking times tab */}
          {activeTab === "cooking-times" &&
            !isEditMode &&
            (formData.ungroupedCookingTimes.length > 0 ||
              formData.cookingTimeSections.length > 0) && (
              <div className="cookingtime-categories-wrapper">
                <button
                  className={`subheading-wrapper${selectedSection === "all" ? " selected" : ""}`}
                  onClick={() => setSelectedSection("all")}
                >
                  <h3 className="forta">{t("all", "All")}</h3>
                </button>
                {formData.ungroupedCookingTimes.length > 0 && (
                  <button
                    className={`subheading-wrapper${selectedSection === "ungrouped" ? " selected" : ""}`}
                    onClick={() => setSelectedSection("ungrouped")}
                  >
                    <h3 className="forta">{t("ungrouped", "Ungrouped")}</h3>
                  </button>
                )}
                {formData.cookingTimeSections.map((section) => (
                  <button
                    key={section.id}
                    className={`subheading-wrapper${selectedSection === section.subheading ? " selected" : ""}`}
                    onClick={() => setSelectedSection(section.subheading)}
                  >
                    <h3 className="forta">{section.subheading}</h3>
                  </button>
                ))}
              </div>
            )}

          <DragDropContext onDragEnd={handleDragEnd}>
            {activeTab === "cooking-times" && (
              <>
                {formData.ungroupedCookingTimes.length === 0 &&
                formData.cookingTimeSections.length === 0 ? (
                  <EmptyState
                    type="cooking-times"
                    icon={Timer}
                    onAddClick={() => {
                      setIsEditMode(true);
                      addCookingTime("ungrouped");
                    }}
                  />
                ) : (
                  <>
                    {filteredData.ungroupedCookingTimes.length === 0 &&
                    filteredData.cookingTimeSections.length === 0 &&
                    selectedSection !== "all" ? (
                      <div className="no-results">
                        <p>
                          {t(
                            "no_items_in_category",
                            "No items in this category."
                          )}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Form header */}
                        <div className="flex-between add-section-wrapper">
                          {isEditMode && (
                            <button
                              type="button"
                              onClick={addSection}
                              className="btn btn-section"
                            >
                              {t("add_section")}
                            </button>
                          )}
                        </div>

                        {/* Ungrouped Cooking Times */}
                        {(isEditMode
                          ? formData.ungroupedCookingTimes.length > 0
                          : filteredData.ungroupedCookingTimes.length > 0) && (
                          <>
                            {isEditMode ? (
                              <Droppable
                                droppableId="ungrouped"
                                type="cooking-time-item"
                              >
                                {(provided, snapshot) => (
                                  <div
                                    className={`flex-column ${
                                      snapshot.isDraggingOver ? "drag-over" : ""
                                    }`}
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                  >
                                    {formData.ungroupedCookingTimes.map(
                                      (item, index) => (
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
                                      )
                                    )}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            ) : (
                              <div className="flex-column cooking-time-list">
                                {filteredData.ungroupedCookingTimes.map(
                                  (item, index) =>
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
                        {isEditMode &&
                          (formData.ungroupedCookingTimes.length > 0 ||
                            formData.cookingTimeSections.length === 0) && (
                            <div className="flex-center">
                              <button
                                type="button"
                                onClick={() => addCookingTime("ungrouped")}
                                className="btn btn-icon btn-icon-green"
                              >
                                <Plus
                                  size={16}
                                  data-testid="add-cooking-time-btn"
                                  aria-label={t("add_cooking_time")}
                                />
                              </button>
                            </div>
                          )}

                        {/* Cooking Time Sections */}
                        {(isEditMode
                          ? formData.cookingTimeSections.length > 0
                          : filteredData.cookingTimeSections.length > 0) && (
                          <Droppable
                            droppableId="sections"
                            type="cooking-time-section"
                          >
                            {(provided) => (
                              <div
                                className="flex-column"
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
                                        className={`cooking-time-section ${
                                          snapshot.isDragging ? "dragging" : ""
                                        }`}
                                      >
                                        {/* Section Header */}
                                        {isEditMode ? (
                                          <div className="flex-row">
                                            <div
                                              {...provided.dragHandleProps}
                                              className="drag-handle"
                                            >
                                              <GripVertical size={16} />
                                            </div>
                                            <input
                                              type="text"
                                              value={section.subheading}
                                              onChange={(e) =>
                                                handleSectionChange(
                                                  section.id,
                                                  "subheading",
                                                  e.target.value
                                                )
                                              }
                                              className="input input--borderless section-title-input"
                                              placeholder={t("section_title")}
                                            />
                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeSection(section.id)
                                              }
                                              className="btn btn-section"
                                            >
                                              {t("remove_section")}
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="cookingtime-section-subheading">
                                            <h3>{section.subheading}</h3>
                                          </div>
                                        )}

                                        {/* Section Cooking Times */}
                                        {isEditMode ? (
                                          <Droppable
                                            droppableId={section.id}
                                            type="cooking-time-item"
                                          >
                                            {(provided, snapshot) => (
                                              <div
                                                className={`flex-column cooking-time-list ${
                                                  snapshot.isDraggingOver
                                                    ? "drag-over"
                                                    : ""
                                                }`}
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
                                          <div className="flex-column cooking-time-list">
                                            {section.cookingTimes.map(
                                              (item, itemIndex) =>
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
                                          <div className="flex-center">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                addCookingTime(section.id)
                                              }
                                              className="btn btn-icon btn-icon-green"
                                              aria-label={t("add_cooking_time")}
                                            >
                                              <Plus
                                                size={16}
                                                data-testid="add-section-cooking-time-btn"
                                              />
                                            </button>
                                          </div>
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
                      </>
                    )}
                  </>
                )}

                {/* Action buttons for edit mode */}
                {isEditMode && (
                  <div className="action-buttons-end">
                    <button
                      type="button"
                      onClick={() => {
                        // Check for unsaved changes before canceling
                        if (hasUnsavedChanges()) {
                          setShowExitEditModeModal(true);
                        } else {
                          setIsEditMode(false);
                        }
                      }}
                      className="btn btn-action btn-secondary"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        // Save all changes and exit edit mode
                        await saveAllChanges();
                        setIsEditMode(false);
                      }}
                      className="btn btn-action btn-primary"
                    >
                      {t("save_changes", "Save Changes")}
                    </button>
                  </div>
                )}
              </>
            )}
          </DragDropContext>
        </div>
        {activeTab === "conversions" && <ConversionsTab />}
      </div>

      {/* Unsaved Changes Modal - for page navigation */}
      <ConfirmationModal
        isOpen={isUnsavedChangesModalOpen}
        onClose={cancelNavigation}
        onConfirm={confirmNavigation}
        message={unsavedChangesMessage}
        confirmText={t("leave_page")}
        cancelText={t("stay")}
        confirmButtonType="danger"
      />

      {/* Exit Edit Mode Modal - for exiting edit mode with unsaved changes */}
      <ConfirmationModal
        isOpen={showExitEditModeModal}
        onClose={handleCancelExitEditMode}
        onConfirm={handleConfirmExitEditMode}
        message={t("unsaved_changes_warning")}
        confirmText={t("leave_page")}
        cancelText={t("stay")}
        confirmButtonType="danger"
      />
    </div>
  );
};

export default CookingTimes;
