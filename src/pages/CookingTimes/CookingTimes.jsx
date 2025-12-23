import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import {
  Plus,
  Timer,
  ArrowLeftRight,
  Search,
  GripVertical,
  Pencil,
  ArrowBigLeft,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import CookingTimeRow from "../../components/CookingTimeRow/CookingTimeRow";
import "../../components/CookingTimeRow/CookingTimeRow.css";
import {
  fetchUserCookingTimes,
  createCookingTime,
  updateCookingTime,
  deleteCookingTime,
} from "../../services/cookingTimesService";
import ConversionsTab from "../../components/ConversionsTab/ConversionsTab";
import "./CookingTimes.css";

const CookingTimes = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("cooking-times");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Edit/View mode state
  const [isEditMode, setIsEditMode] = useState(false);

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
      const cookingTimesData = await fetchUserCookingTimes();

      // Organize data into sections exactly like RecipeForm
      organizeCookingTimesIntoSections(cookingTimesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [organizeCookingTimesIntoSections]);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter data based on search query (cooking times only)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredData(formData);
      return;
    }

    const query = searchQuery.toLowerCase();

    // Filter ungrouped items
    const filteredUngrouped = formData.ungroupedCookingTimes.filter(
      (item) =>
        item.ingredient_name.toLowerCase().includes(query) ||
        (item.notes && item.notes.toLowerCase().includes(query))
    );

    // Filter section items
    const filteredSections = formData.cookingTimeSections
      .map((section) => ({
        ...section,
        cookingTimes: section.cookingTimes.filter(
          (item) =>
            item.ingredient_name.toLowerCase().includes(query) ||
            (item.notes && item.notes.toLowerCase().includes(query))
        ),
      }))
      .filter((section) => section.cookingTimes.length > 0);

    setFilteredData({
      ungroupedCookingTimes: filteredUngrouped,
      cookingTimeSections: filteredSections,
    });
  }, [searchQuery, formData]);

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
      // Step 1: Identify items to delete (were in original but not in current)
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
      formData.ungroupedCookingTimes.forEach((item) => {
        if (item.id) currentIds.add(item.id);
      });
      formData.cookingTimeSections.forEach((section) => {
        section.cookingTimes.forEach((item) => {
          if (item.id) currentIds.add(item.id);
        });
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

      // Step 2: Create new items (items without real ID)
      const itemsToCreate = [];

      // Process ungrouped items
      formData.ungroupedCookingTimes.forEach((item) => {
        if (item.ingredient_name?.trim() && !item.id) {
          itemsToCreate.push({
            ...item,
            section_name: null, // ungrouped
          });
        }
      });

      // Process sectioned items
      formData.cookingTimeSections.forEach((section) => {
        if (section.subheading?.trim()) {
          section.cookingTimes.forEach((item) => {
            if (item.ingredient_name?.trim() && !item.id) {
              itemsToCreate.push({
                ...item,
                section_name: section.subheading,
              });
            }
          });
        }
      });

      // Create new items
      console.log("Items to create:", itemsToCreate);
      for (let i = 0; i < itemsToCreate.length; i++) {
        const item = itemsToCreate[i];
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

        // Calculate order index - get the highest existing order index and increment
        const existingItems = await fetchUserCookingTimes();
        const maxOrderIndex =
          existingItems.length > 0
            ? Math.max(...existingItems.map((item) => item.order_index || 0))
            : -1;
        const orderIndex = maxOrderIndex + 1 + i;

        console.log(
          "Creating cooking time:",
          cookingTimeData,
          "in section:",
          item.section_name,
          "with order_index:",
          orderIndex
        );
        await createCookingTime(cookingTimeData, item.section_name, orderIndex);
      }

      // Step 3: Handle updates for existing items
      const itemsToUpdate = [];

      // Process ungrouped items for updates
      formData.ungroupedCookingTimes.forEach((item) => {
        if (item.ingredient_name?.trim() && item.id) {
          // Find the original item to compare
          const originalItem =
            originalData.ungroupedCookingTimes.find(
              (orig) => orig.id === item.id
            ) ||
            originalData.cookingTimeSections
              .flatMap((s) => s.cookingTimes)
              .find((orig) => orig.id === item.id);

          if (originalItem) {
            // Check if any field has changed
            const hasChanges =
              item.ingredient_name !== originalItem.ingredient_name ||
              item.cooking_time !== originalItem.cooking_time ||
              item.soaking_time !== originalItem.soaking_time ||
              item.dry_weight !== originalItem.dry_weight ||
              item.cooked_weight !== originalItem.cooked_weight ||
              item.notes !== originalItem.notes;

            if (hasChanges) {
              itemsToUpdate.push({
                ...item,
                section_name: null, // ungrouped
              });
            }
          }
        }
      });

      // Process sectioned items for updates
      formData.cookingTimeSections.forEach((section) => {
        if (section.subheading?.trim()) {
          section.cookingTimes.forEach((item) => {
            if (item.ingredient_name?.trim() && item.id) {
              // Find the original item to compare
              const originalItem =
                originalData.ungroupedCookingTimes.find(
                  (orig) => orig.id === item.id
                ) ||
                originalData.cookingTimeSections
                  .flatMap((s) => s.cookingTimes)
                  .find((orig) => orig.id === item.id);

              if (originalItem) {
                // Check if any field has changed
                const hasChanges =
                  item.ingredient_name !== originalItem.ingredient_name ||
                  item.cooking_time !== originalItem.cooking_time ||
                  item.soaking_time !== originalItem.soaking_time ||
                  item.dry_weight !== originalItem.dry_weight ||
                  item.cooked_weight !== originalItem.cooked_weight ||
                  item.notes !== originalItem.notes ||
                  section.subheading !== originalItem.section_name;

                if (hasChanges) {
                  itemsToUpdate.push({
                    ...item,
                    section_name: section.subheading,
                  });
                }
              }
            }
          });
        }
      });

      // Update existing items
      console.log("Items to update:", itemsToUpdate);
      for (const item of itemsToUpdate) {
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
          order_index: item.order_index || 0,
        };

        console.log("Updating cooking time:", item.id, cookingTimeData);
        await updateCookingTime(item.id, cookingTimeData);
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
        t("add_first_cooking_time")
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

  return (
    <div className="card card-form">
      <div className="flex-column-center relative">
        <button
          className="btn-unstyled back-arrow-left"
          onClick={() => navigate(-1)}
          aria-label={t("go_back", "Go Back")}
        >
          <ArrowBigLeft size={28} />
        </button>
        <div className="cookingtime-tabs-wrapper flex-center ">
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

        {/* Cooking Times Tab Content */}
        <div className={`${isEditMode ? "flex-column-center" : ""}`}>
          {/* Search Bar and Controls - Only for cooking times tab */}
          {activeTab === "cooking-times" &&
            !isEditMode &&
            (formData.ungroupedCookingTimes.length > 0 ||
              formData.cookingTimeSections.length > 0) && (
              <div className="flex-between">
                <form
                  className="search-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                >
                  <div className="search-input-wrapper">
                    <input
                      id="cooking-times-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input input--secondary search-input-with-icon"
                      placeholder={t("search")}
                    />
                    <button
                      className="btn btn-icon btn-icon-neutral btn-search"
                      type="submit"
                      aria-label={t("search")}
                    >
                      <Search size={20} />
                    </button>
                  </div>
                </form>

                <button
                  className="btn btn-unstyled"
                  onClick={() => setIsEditMode(!isEditMode)}
                  aria-label={t("edit_mode", "Edit Mode")}
                >
                  <Pencil size={20} />
                </button>
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
                    searchQuery ? (
                      <div className="no-results">
                        <p>
                          {t(
                            "no_search_results",
                            "No results found for your search."
                          )}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Form header */}
                        <div className="add-section-wrapper flex-between">
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
                        {filteredData.ungroupedCookingTimes.length > 0 && (
                          <>
                            {isEditMode ? (
                              <Droppable
                                droppableId="ungrouped"
                                type="cooking-time-item"
                              >
                                {(provided, snapshot) => (
                                  <div
                                    className={`flex-column cooking-time-list ${
                                      snapshot.isDraggingOver ? "drag-over" : ""
                                    }`}
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                  >
                                    {filteredData.ungroupedCookingTimes.map(
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
                        {isEditMode && (
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
                        {filteredData.cookingTimeSections.length > 0 && (
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
                                {filteredData.cookingTimeSections.map(
                                  (section, sectionIndex) => (
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
                                            snapshot.isDragging
                                              ? "dragging"
                                              : ""
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
                                                aria-label={t(
                                                  "add_cooking_time"
                                                )}
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
                                  )
                                )}
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
                        // Cancel changes - reload original data and exit edit mode
                        loadData();
                        setIsEditMode(false);
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
    </div>
  );
};

export default CookingTimes;
