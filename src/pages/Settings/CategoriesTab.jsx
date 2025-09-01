import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import {
  saveUserCategoryPreferences,
  getAllCategoriesForManagement,
} from "../../services/categoryPreferencesService";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";

const CategoriesTab = ({
  t,
  saveMessage,
  setSaveMessage,
  onUnsavedChangesChange,
}) => {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryPreferences, setCategoryPreferences] = useState([]);
  const [originalCategoryPreferences, setOriginalCategoryPreferences] =
    useState([]);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const { i18n } = useTranslation();

  // Load all categories for management (including hidden ones)
  useEffect(() => {
    const loadAllCategories = async () => {
      try {
        setCategoriesLoading(true);
        const allCategories = await getAllCategoriesForManagement(
          i18n.language
        );
        setCategories(allCategories);
      } catch (error) {
        console.error("Error loading categories for management:", error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadAllCategories();
  }, [i18n.language]);

  useEffect(() => {
    // Categories already come with preference data from getAllCategoriesForManagement
    if (categories.length > 0) {
      setCategoryPreferences([...categories]);
      setOriginalCategoryPreferences([...categories]);
    }
  }, [categories]);

  // Check if preferences have changed
  const hasUnsavedChanges = useCallback(() => {
    if (categoryPreferences.length !== originalCategoryPreferences.length) {
      return true;
    }

    return categoryPreferences.some((pref, index) => {
      const original = originalCategoryPreferences[index];
      return (
        pref.isVisible !== original.isVisible || pref.order !== original.order
      );
    });
  }, [categoryPreferences, originalCategoryPreferences]);

  // Notify parent component about unsaved changes
  useEffect(() => {
    onUnsavedChangesChange?.(hasUnsavedChanges());
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  const toggleVisibility = (categoryId) => {
    setCategoryPreferences((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, isVisible: !cat.isVisible } : cat
      )
    );
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(categoryPreferences);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values
    items.forEach((cat, index) => {
      cat.order = index;
    });

    setCategoryPreferences(items);
  };

  const handleSavePreferences = async () => {
    try {
      setPreferencesLoading(true);
      setSaveMessage("");

      await saveUserCategoryPreferences(categoryPreferences);

      // Update original preferences to match current state
      setOriginalCategoryPreferences([...categoryPreferences]);

      setSaveMessage(t("category_preferences_saved"));
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving category preferences:", error);
      setSaveMessage(t("category_preferences_error"));
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setPreferencesLoading(false);
    }
  };

  if (categoriesLoading || categoryPreferences.length === 0) {
    return <LoadingAcorn />;
  }

  return (
    <div className="flex-column">
      <div className="flex-column-center">
        <p className="grey-small">{t("category_management_description")}</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="categories">
          {(provided, snapshot) => (
            <div
              className={`category-list ${
                snapshot.isDraggingOver ? "drag-over" : ""
              }`}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {categoryPreferences.map((category, index) => (
                <Draggable
                  key={category.id}
                  draggableId={category.id.toString()}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`category-item ${
                        !category.isVisible ? "category-hidden" : ""
                      } ${snapshot.isDragging ? "dragging" : ""}`}
                    >
                      <div
                        {...provided.dragHandleProps}
                        className="drag-handle"
                      >
                        <GripVertical size={16} />
                      </div>

                      <div className="category-info">
                        <span className="category-name">{category.label}</span>
                      </div>

                      <button
                        className="btn-unstyled category-visibility-toggle"
                        onClick={() => toggleVisibility(category.id)}
                        aria-label={
                          category.isVisible
                            ? t("hide_category")
                            : t("show_category")
                        }
                      >
                        {category.isVisible ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="success-message-wrapper">
        <span
          className={`red-small ${
            saveMessage?.includes("Error") ? "error-message" : ""
          }`}
        >
          {saveMessage || "\u00A0"}
        </span>
      </div>

      <div className="action-buttons">
        <button
          className="btn btn-action btn-primary"
          onClick={handleSavePreferences}
          disabled={preferencesLoading}
        >
          {preferencesLoading ? t("saving") : t("save_category_preferences")}
        </button>
      </div>
    </div>
  );
};

export default CategoriesTab;
