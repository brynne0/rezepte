import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import supabase from "../../lib/supabase";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  GripVertical,
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Check,
  X,
  Trash2,
} from "lucide-react";
import {
  saveUserCategoryPreferences,
  getAllCategoriesForManagement,
} from "../../services/categoryPreferencesService";
import {
  createCategory,
  updateCategoryName,
} from "../../services/categoriesService";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";

const CategoriesTab = ({
  t,
  saveMessage,
  setSaveMessage,
  onUnsavedChangesChange,
  refreshCategories,
  resetCategoryFilter,
}) => {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryPreferences, setCategoryPreferences] = useState([]);
  const [originalCategoryPreferences, setOriginalCategoryPreferences] =
    useState([]);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const [deleteCategoryName, setDeleteCategoryName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    // Check if currently adding or editing
    if (isAddingCategory || editingCategoryId !== null) {
      return true;
    }

    if (categoryPreferences.length !== originalCategoryPreferences.length) {
      return true;
    }

    return categoryPreferences.some((pref, index) => {
      const original = originalCategoryPreferences[index];
      return (
        pref.isVisible !== original.isVisible || pref.order !== original.order
      );
    });
  }, [
    categoryPreferences,
    originalCategoryPreferences,
    isAddingCategory,
    editingCategoryId,
  ]);

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

      // First, create any pending categories in the database
      const updatedPreferences = [...categoryPreferences];

      for (let i = 0; i < updatedPreferences.length; i++) {
        const cat = updatedPreferences[i];
        if (cat.pendingCreation && cat.isTemp) {
          try {
            const newCategory = await createCategory(
              cat.value,
              cat.translations || {}
            );

            // Replace temp category with real category
            updatedPreferences[i] = {
              id: newCategory.id,
              value: newCategory.name,
              label: cat.label,
              isSystem: false,
              isVisible: cat.isVisible,
              order: cat.order,
              isTemp: false,
              pendingCreation: false,
            };
          } catch (error) {
            throw new Error(
              `Error creating category "${cat.label}": ${error.message}`
            );
          }
        }
      }

      // Filter out any remaining temporary categories before saving
      const validCategoryPreferences = updatedPreferences.filter(
        (cat) => !cat.isTemp && !cat.id?.startsWith("temp-new-category-")
      );

      // Normalise orders to be sequential (0, 1, 2, 3, ...)
      validCategoryPreferences.forEach((cat, index) => {
        cat.order = index;
      });

      await saveUserCategoryPreferences(validCategoryPreferences);

      // Update state with the final categories
      setCategoryPreferences(validCategoryPreferences);
      setOriginalCategoryPreferences([...validCategoryPreferences]);

      // Refresh categories in the main app to reflect preference changes
      if (refreshCategories) {
        refreshCategories();
      }

      // Reset selected category to "all" so user sees all recipes when going back
      if (resetCategoryFilter) {
        resetCategoryFilter();
      }

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

  // Add new category
  const handleAddCategory = () => {
    // Generate unique ID for each new temporary category
    const tempId = `temp-new-category-${Date.now()}`;

    // Add temporary category to the list in edit mode
    const tempCategory = {
      id: tempId,
      value: "",
      label: "",
      isSystem: false,
      isVisible: true,
      order: categoryPreferences.length,
      isTemp: true,
    };

    setCategoryPreferences([...categoryPreferences, tempCategory]);
    setEditingCategoryId(tempId);
    setEditingCategoryName("");
    setIsAddingCategory(true);
    setCategoryError("");
  };

  const handleSaveNewCategory = async () => {
    if (!editingCategoryName.trim()) {
      setCategoryError(t("category_name_required"));
      return;
    }

    const trimmedName = editingCategoryName.trim();

    // Check for duplicates in local preferences first
    const localDuplicate = categoryPreferences.some((cat) => {
      const catName = cat.value || cat.label || "";
      return (
        cat.id !== editingCategoryId &&
        catName.toLowerCase() === trimmedName.toLowerCase()
      );
    });

    if (localDuplicate) {
      setCategoryError(t("category_name_already_exists"));
      return;
    }

    // Check if this category already exists in the database
    try {
      const { data: existingCategory } = await supabase
        .from("categories")
        .select("id, name, is_system, translated_category")
        .eq("name", trimmedName.toLowerCase())
        .single();

      if (existingCategory) {
        // Category exists! Add it to user's preferences instead of creating new one
        let label = existingCategory.name;
        if (
          existingCategory.translated_category &&
          existingCategory.translated_category[i18n.language]
        ) {
          label = existingCategory.translated_category[i18n.language];
        }

        // Replace temp category with existing category
        setCategoryPreferences((prev) =>
          prev.map((cat) =>
            cat.id === editingCategoryId
              ? {
                  id: existingCategory.id,
                  value: existingCategory.name,
                  label: label,
                  isSystem: existingCategory.is_system || false,
                  isVisible: true,
                  order: cat.order,
                  isTemp: false,
                  pendingCreation: false,
                }
              : cat
          )
        );

        // Reset add state
        setIsAddingCategory(false);
        setEditingCategoryId(null);
        setEditingCategoryName("");
        return;
      }
    } catch (error) {
      // If it's not a "not found" error, log warning but continue with creation
      if (
        !error.message.includes("No rows") &&
        !error.message.includes("PGRST116")
      ) {
        console.warn("Could not check for existing categories:", error);
      }
    }

    try {
      setCategoryError("");

      // Keep as temporary category with the name - don't create in database yet
      setCategoryPreferences((prev) =>
        prev.map((cat) =>
          cat.id === editingCategoryId
            ? {
                ...cat,
                label: editingCategoryName.trim(),
                value: editingCategoryName.trim().toLowerCase(),
                isTemp: true,
                pendingCreation: true,
                translations: {
                  [i18n.language]: editingCategoryName.trim(),
                },
              }
            : cat
        )
      );

      // Reset add state
      setIsAddingCategory(false);
      setEditingCategoryId(null);
      setEditingCategoryName("");
    } catch (error) {
      console.error("Error preparing category:", error);
      setCategoryError(error.message);
    }
  };

  const handleCancelAddCategory = () => {
    // Remove temporary category from list
    setCategoryPreferences((prev) =>
      prev.filter((cat) => cat.id !== editingCategoryId)
    );
    setIsAddingCategory(false);
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setCategoryError("");
  };

  // Edit existing category
  const handleEditCategory = (category) => {
    if (category.isSystem) return; // Can't edit system categories
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.label);
    setCategoryError("");
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategoryName.trim()) {
      setCategoryError(t("category_name_required"));
      return;
    }

    // Handle new category creation vs editing existing category
    if (editingCategoryId?.startsWith("temp-new-category-")) {
      await handleSaveNewCategory();
      return;
    }

    const trimmedName = editingCategoryName.trim();

    // For existing categories, only check for duplicates in local preferences
    const localDuplicate = categoryPreferences.some((cat) => {
      const catName = cat.value || cat.label || "";
      return (
        cat.id !== editingCategoryId &&
        catName.toLowerCase() === trimmedName.toLowerCase()
      );
    });

    if (localDuplicate) {
      setCategoryError(t("category_name_already_exists"));
      return;
    }

    try {
      setCategoryError("");

      // Update category with new name and translation
      const translations = {
        [i18n.language]: editingCategoryName.trim(),
      };

      await updateCategoryName(
        editingCategoryId,
        editingCategoryName.trim(),
        translations
      );

      // Update in preferences list
      setCategoryPreferences((prev) =>
        prev.map((cat) =>
          cat.id === editingCategoryId
            ? { ...cat, label: editingCategoryName.trim() }
            : cat
        )
      );

      // Reset edit state
      setEditingCategoryId(null);
      setEditingCategoryName("");

      // Note: Don't auto-refresh - let user save preferences manually
    } catch (error) {
      console.error("Error updating category:", error);
      setCategoryError(error.message);
    }
  };

  const handleCancelEditCategory = () => {
    // If canceling new category creation, remove temp category
    if (editingCategoryId?.startsWith("temp-new-category-")) {
      handleCancelAddCategory();
      return;
    }

    setEditingCategoryId(null);
    setEditingCategoryName("");
    setCategoryError("");
  };

  // Show delete confirmation modal for custom categories
  const handleDeleteCategory = (categoryId, categoryName) => {
    setDeleteCategoryId(categoryId);
    setDeleteCategoryName(categoryName);
    setShowDeleteModal(true);
  };

  // Remove category from user preferences and their recipes
  const handleConfirmDeleteCategory = async () => {
    try {
      setCategoryError("");

      // Remove this category from all of the user's recipes
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // First get all the user's recipe IDs
        const { data: userRecipes, error: recipesError } = await supabase
          .from("recipes")
          .select("id")
          .eq("user_id", user.id);

        if (recipesError) {
          throw new Error(
            `Failed to get user recipes: ${recipesError.message}`
          );
        }

        if (userRecipes && userRecipes.length > 0) {
          const recipeIds = userRecipes.map((recipe) => recipe.id);

          // Remove this category from the user's recipes
          const { error: recipeCategoryError } = await supabase
            .from("recipe_categories")
            .delete()
            .eq("categoriy_id", deleteCategoryId)
            .in("recipe_id", recipeIds);

          if (recipeCategoryError) {
            throw new Error(
              `Failed to remove category from your recipes: ${recipeCategoryError.message}`
            );
          }
        }
      }

      // Remove from preferences list (local state only - user must save manually)
      setCategoryPreferences((prev) =>
        prev.filter((cat) => cat.id !== deleteCategoryId)
      );

      // Reset edit state if we were editing this category
      if (editingCategoryId === deleteCategoryId) {
        setEditingCategoryId(null);
        setEditingCategoryName("");
        setIsAddingCategory(false);
      }

      setShowDeleteModal(false);
      setDeleteCategoryId(null);
      setDeleteCategoryName("");
    } catch (error) {
      console.error("Error removing category:", error);
      setCategoryError(error.message);
    }
  };

  // Cancel delete modal
  const handleCancelDeleteCategory = () => {
    setShowDeleteModal(false);
    setDeleteCategoryId(null);
    setDeleteCategoryName("");
  };

  if (categoriesLoading || categoryPreferences.length === 0) {
    return <LoadingAcorn />;
  }

  return (
    <form
      className="flex-column"
      onSubmit={(e) => {
        e.preventDefault();
        // Only submit if explicitly clicking Save Preferences
      }}
    >
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
                    <div className="flex-column">
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
                          {editingCategoryId === category.id ? (
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => {
                                setEditingCategoryName(e.target.value);
                                setCategoryError("");
                              }}
                              className={`input input--edit ${
                                categoryError &&
                                editingCategoryId === category.id
                                  ? "input--error"
                                  : ""
                              }`}
                              placeholder={t("category_name")}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleSaveEditCategory();
                                } else if (e.key === "Escape") {
                                  handleCancelEditCategory();
                                }
                              }}
                            />
                          ) : (
                            <>
                              <span className="category-name">
                                {category.label}
                              </span>
                              {category.isSystem && (
                                <span className="category-system-badge">
                                  {t("system")}
                                </span>
                              )}

                              {!category.isSystem && (
                                <button
                                  type="button"
                                  className="btn-unstyled  btn-icon-neutral"
                                  onClick={() => handleEditCategory(category)}
                                  aria-label={t("edit_category_name")}
                                  style={{ marginLeft: "0.5rem" }}
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        <div className="category-actions">
                          {editingCategoryId === category.id ? (
                            <>
                              <button
                                type="button"
                                className="btn-unstyled btn-icon-green"
                                onClick={handleSaveEditCategory}
                                disabled={false}
                                aria-label={t("save_changes")}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                className="btn-unstyled btn-icon-red"
                                onClick={handleCancelEditCategory}
                                aria-label={t("cancel")}
                              >
                                <X size={16} />
                              </button>
                              {!category.isTemp && !category.isSystem && (
                                <button
                                  type="button"
                                  className="btn-unstyled btn-icon-remove"
                                  onClick={() =>
                                    handleDeleteCategory(
                                      category.id,
                                      category.label
                                    )
                                  }
                                  disabled={false}
                                  aria-label={t("delete_category")}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              type="button"
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
                          )}
                        </div>
                      </div>
                      {categoryError && editingCategoryId === category.id && (
                        <span className="error-message-small category-error">
                          {categoryError}
                        </span>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add New Category Button */}
      {!isAddingCategory && (
        <div className="add-category-section flex-center">
          <button
            type="button"
            className="btn btn-section-dotted"
            onClick={handleAddCategory}
            disabled={false}
          >
            <Plus size={16} />
            {t("add_category")}
          </button>
        </div>
      )}

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
          type="button"
          className="btn btn-action btn-primary"
          onClick={handleSavePreferences}
          disabled={preferencesLoading}
        >
          {preferencesLoading ? t("saving") : t("save_category_preferences")}
        </button>
      </div>

      {/* Delete Category Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleCancelDeleteCategory}
        onConfirm={handleConfirmDeleteCategory}
        message={t("delete_category_confirmation", {
          categoryName: deleteCategoryName,
        })}
        secondaryMessage={t("delete_category_warning")}
        confirmText={t("delete_category")}
        cancelText={t("cancel")}
        confirmButtonType="danger"
      />
    </form>
  );
};

export default CategoriesTab;
