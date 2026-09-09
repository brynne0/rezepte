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
import { getUserPreferredLanguage } from "../../services/userService";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";

const CategoriesTab = ({
  t,
  onUnsavedChangesChange,
  refreshCategories,
  resetCategoryFilter,
}) => {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isEditingCategories, setIsEditingCategories] = useState(false);
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
  const [preferredLanguage, setPreferredLanguage] = useState(null);
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
    const loadPreferredLanguage = async () => {
      try {
        const lang = await getUserPreferredLanguage();
        setPreferredLanguage(lang);
      } catch (error) {
        console.error("Error loading preferred language:", error);
      }
    };

    loadPreferredLanguage();
  }, []);

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

      // Reset selected category to "all_recipes" so user sees all recipes when going back
      if (resetCategoryFilter) {
        resetCategoryFilter();
      }

      toast.add({
        title: t("category_preferences_saved"),
        type: "success",
      });
      setIsEditingCategories(false);
    } catch (error) {
      console.error("Error saving category preferences:", error);
      toast.add({
        title: t("category_preferences_error"),
        type: "error",
      });
    } finally {
      setPreferencesLoading(false);
    }
  };

  // Discard any pending reordering, visibility, or add/edit changes
  const handleCancelPreferences = () => {
    setCategoryPreferences([...originalCategoryPreferences]);
    setIsAddingCategory(false);
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setCategoryError("");
    setIsEditingCategories(false);
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

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      {isEditingCategories && i18n.language !== preferredLanguage && (
        <Alert variant="destructive">
          <AlertDescription>
            {t("category_edit_preferred_language_hint")}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("categories")}</h2>
        {!isEditingCategories &&
          (i18n.language !== preferredLanguage ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  // A disabled button blocks pointer events entirely, so the
                  // hover target has to be this wrapping span instead.
                  <span tabIndex={0} className="inline-flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="pointer-events-none"
                    >
                      <Pencil />
                      {t("edit_categories")}
                    </Button>
                  </span>
                }
              />
              <TooltipContent>
                {t("category_edit_preferred_language_hint")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingCategories(true)}
              disabled={categoriesLoading}
            >
              <Pencil />
              {t("edit_categories")}
            </Button>
          ))}
      </div>
      <div className="-mt-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t("category_management_description")}
        </p>
        {isEditingCategories && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCategory}
            disabled={
              isAddingCategory ||
              editingCategoryId !== null ||
              i18n.language !== preferredLanguage
            }
          >
            <Plus size={16} />
            {t("add_category")}
          </Button>
        )}
      </div>

      {categoriesLoading ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
            >
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided, snapshot) => (
              <div
                className={cn(
                  "flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-2",
                  snapshot.isDraggingOver && "bg-muted/50"
                )}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {categoryPreferences.map((category, index) => (
                  <Draggable
                    key={category.id}
                    draggableId={category.id.toString()}
                    index={index}
                    isDragDisabled={!isEditingCategories}
                  >
                    {(provided, snapshot) => (
                      <div className="flex flex-col">
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 transition-colors",
                            !category.isVisible && "bg-muted/50 opacity-60",
                            snapshot.isDragging && "shadow-md"
                          )}
                        >
                          {isEditingCategories && (
                            <div
                              {...provided.dragHandleProps}
                              className="flex cursor-grab items-center text-muted-foreground active:cursor-grabbing"
                            >
                              <GripVertical size={16} />
                            </div>
                          )}

                          <div className="flex flex-1 items-center gap-2">
                            {editingCategoryId === category.id ? (
                              <Input
                                type="text"
                                value={editingCategoryName}
                                onChange={(e) => {
                                  setEditingCategoryName(e.target.value);
                                  setCategoryError("");
                                }}
                                aria-invalid={
                                  !!categoryError &&
                                  editingCategoryId === category.id
                                }
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
                                <span className="text-sm font-medium">
                                  {category.label}
                                </span>
                                {category.isSystem && (
                                  <Badge variant="outline">{t("system")}</Badge>
                                )}
                              </>
                            )}
                          </div>

                          {isEditingCategories && (
                            <div className="flex shrink-0 items-center gap-1">
                              {editingCategoryId === category.id ? (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={handleSaveEditCategory}
                                          aria-label={t("save_changes")}
                                        >
                                          <Check size={16} />
                                        </Button>
                                      }
                                    />
                                    <TooltipContent>
                                      {t("save_changes")}
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={handleCancelEditCategory}
                                          aria-label={t("cancel")}
                                        >
                                          <X size={16} />
                                        </Button>
                                      }
                                    />
                                    <TooltipContent>
                                      {t("cancel")}
                                    </TooltipContent>
                                  </Tooltip>
                                  {!category.isTemp && !category.isSystem && (
                                    <Tooltip>
                                      <TooltipTrigger
                                        render={
                                          <Button
                                            type="button"
                                            variant="ghost-destructive"
                                            size="icon-sm"
                                            onClick={() =>
                                              handleDeleteCategory(
                                                category.id,
                                                category.label
                                              )
                                            }
                                            aria-label={t("delete_category")}
                                          >
                                            <Trash2 size={16} />
                                          </Button>
                                        }
                                      />
                                      <TooltipContent>
                                        {t("delete_category")}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </>
                              ) : (
                                <>
                                  {!category.isSystem &&
                                    i18n.language === preferredLanguage && (
                                      <Tooltip>
                                        <TooltipTrigger
                                          render={
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon-sm"
                                              onClick={() =>
                                                handleEditCategory(category)
                                              }
                                              aria-label={t(
                                                "edit_category_name"
                                              )}
                                            >
                                              <Pencil size={16} />
                                            </Button>
                                          }
                                        />
                                        <TooltipContent>
                                          {t("edit_category_name")}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() =>
                                            toggleVisibility(category.id)
                                          }
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
                                        </Button>
                                      }
                                    />
                                    <TooltipContent>
                                      {category.isVisible
                                        ? t("hide_category")
                                        : t("show_category")}
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {categoryError && editingCategoryId === category.id && (
                          <span className="mt-1 text-sm text-destructive">
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
      )}

      {isEditingCategories && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            type="button"
            variant="outline"
            onClick={handleCancelPreferences}
            disabled={preferencesLoading}
          >
            {t("cancel")}
          </Button>
          <Button
            className="w-full sm:w-auto"
            type="button"
            onClick={handleSavePreferences}
            disabled={
              preferencesLoading ||
              i18n.language !== preferredLanguage ||
              !hasUnsavedChanges()
            }
          >
            {preferencesLoading ? t("saving") : t("save_category_preferences")}
          </Button>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      <AlertDialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          if (!open) handleCancelDeleteCategory();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("delete_category_confirmation", {
                categoryName: deleteCategoryName,
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_category_warning")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDeleteCategory}
            >
              {t("delete_category")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};

export default CategoriesTab;
