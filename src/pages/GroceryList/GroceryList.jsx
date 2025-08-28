import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2, Pencil, ArrowBigLeft, Plus } from "lucide-react";

import "./GroceryList.css";
import { useGroceryList } from "../../hooks/data/useGroceryList";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import { getUserPreferredLanguage } from "../../services/userService";
import { normaliseIngredientName } from "../../services/groceryListService";
import {
  formatQuantityForUnit,
  formatUnitDisplay,
} from "../../utils/ingredientFormatting";
import Selector from "../../components/Selector/Selector";

const GroceryList = ({
  isEditing: propIsEditing,
  setIsEditing: propSetIsEditing,
}) => {
  const { groceryList, updateGroceryList, clearGroceryList, loading } =
    useGroceryList();
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const units = t("units", { returnObjects: true });
  const originalUserLanguage = useRef(null);

  // Use prop-based editing state, fallback to local state if props not provided
  const isEditing = propIsEditing !== undefined ? propIsEditing : false;
  const setIsEditing = propSetIsEditing || (() => {});

  const [editedList, setEditedList] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [originalGroceryList, setOriginalGroceryList] = useState([]);

  const currentList = isEditing ? editedList : groceryList;

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    if (!isEditing) return false;

    // If arrays are empty, no changes
    if (editedList.length === 0 && originalGroceryList.length === 0)
      return false;

    // Compare current edited list with original list
    if (editedList.length !== originalGroceryList.length) return true;

    return editedList.some((editedItem, index) => {
      const originalItem = originalGroceryList[index];
      if (!originalItem) return true;

      // Normalize values for comparison (handle null/undefined/empty string)
      const normalize = (val) => (val == null ? "" : String(val));

      // Don't compare names as they may be translated when entering edit mode
      // Only compare the user-editable fields: quantity, unit, notes
      return (
        normalize(editedItem.quantity) !== normalize(originalItem.quantity) ||
        normalize(editedItem.unit) !== normalize(originalItem.unit) ||
        normalize(editedItem.notes) !== normalize(originalItem.notes)
      );
    });
  };

  // Unsaved changes detection
  const {
    isModalOpen: isUnsavedChangesModalOpen,
    navigate: navigateWithConfirmation,
    confirmNavigation,
    cancelNavigation,
    message: unsavedChangesMessage,
  } = useUnsavedChanges(hasUnsavedChanges(), t("unsaved_changes_warning"));

  // Group ingredients by normalised name for display
  const groupIngredients = (items) => {
    const groups = {};

    items.forEach((item, index) => {
      const normalisedName = normaliseIngredientName(item.name);
      const itemId = item.id || item.tempId || index;

      if (!groups[normalisedName]) {
        groups[normalisedName] = {
          displayName: item.name, // Use first occurrence for display
          items: [],
        };
      }

      groups[normalisedName].items.push({
        ...item,
        itemId,
        originalIndex: index,
      });
    });

    return Object.values(groups);
  };

  // Sync editedList with groceryList when language changes during edit mode
  useEffect(() => {
    if (isEditing && groceryList.length > 0) {
      setEditedList([...groceryList]);
    }
  }, [groceryList, isEditing]);

  // Restore user's original language when component unmounts while editing
  useEffect(() => {
    return () => {
      if (
        originalUserLanguage.current &&
        originalUserLanguage.current !== i18n.language
      ) {
        i18n.changeLanguage(originalUserLanguage.current);
      }
    };
  }, [i18n]);

  const startEditing = async () => {
    try {
      // Get user's preferred language and switch to it
      const preferredLanguage = await getUserPreferredLanguage();
      if (i18n.language !== preferredLanguage) {
        // Store the user's current language before switching
        originalUserLanguage.current = i18n.language;
        i18n.changeLanguage(preferredLanguage);
      }

      setIsEditing(true);
      setEditedList([...groceryList]); // Create a copy to edit
      setOriginalGroceryList([...groceryList]); // Store original for comparison
    } catch (error) {
      console.error("Error switching to preferred language:", error);
      setIsEditing(true);
      setEditedList([...groceryList]);
      setOriginalGroceryList([...groceryList]);
    }
  };

  // Helper function to restore user's original language
  const restoreOriginalLanguage = () => {
    if (
      originalUserLanguage.current &&
      originalUserLanguage.current !== i18n.language
    ) {
      i18n.changeLanguage(originalUserLanguage.current);
      originalUserLanguage.current = null; // Clear the stored language
    }
  };

  const saveChanges = () => {
    updateGroceryList(editedList);
    setIsEditing(false);
    setEditedList([]);
    setOriginalGroceryList([]);
    restoreOriginalLanguage();
  };

  const handleCancel = () => {
    // Exit edit mode and stay on grocery list page
    setIsEditing(false);
    setEditedList([]);
    setOriginalGroceryList([]);
    setCheckedItems(new Set());
    restoreOriginalLanguage();
  };

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const handleCancelClick = () => {
    const hasChanges = hasUnsavedChanges();

    if (hasChanges) {
      setIsCancelModalOpen(true);
    } else {
      handleCancel();
    }
  };

  const confirmCancel = () => {
    setIsCancelModalOpen(false);
    handleCancel();
  };

  const handleInputChange = (index, field, value) => {
    const updatedList = [...editedList];
    updatedList[index] = {
      ...updatedList[index],
      [field]: value,
    };
    setEditedList(updatedList);
  };

  const removeItemFromEdit = (index) => {
    const updatedList = editedList.filter((_, i) => i !== index);
    setEditedList(updatedList);
  };

  const addNewItem = async () => {
    if (!isEditing) {
      await startEditing();
    }

    const newTempId = `temp-${Date.now()}`;
    const newItem = {
      tempId: newTempId,
      name: "",
      quantity: "",
      unit: "",
      notes: "",
      source_recipes: [],
    };

    const updatedList = isEditing
      ? [...editedList, newItem]
      : [...groceryList, newItem];
    setEditedList(updatedList);

    if (!isEditing) {
      setIsEditing(true);
    }

    // Focus on the new item's name input
    setTimeout(() => {
      const newItemNameInput = document.getElementById(
        `item-name-${newTempId}`
      );
      if (newItemNameInput) {
        newItemNameInput.focus();
        newItemNameInput.click(); // For Mobile
      }
    }, 10);
  };

  const toggleItemChecked = (itemId) => {
    const newCheckedItems = new Set(checkedItems);
    const clickedItem = currentList.find(
      (item) => (item.id || item.tempId || currentList.indexOf(item)) === itemId
    );

    if (!clickedItem) {
      return;
    }

    const normalisedClickedName = normaliseIngredientName(clickedItem.name);

    // Find all items with the same normalised ingredient name
    const relatedItems = currentList.filter(
      (item) => normaliseIngredientName(item.name) === normalisedClickedName
    );

    const isCurrentlyChecked = newCheckedItems.has(itemId);

    if (isCurrentlyChecked) {
      // Unchecking - remove all related items
      relatedItems.forEach((item) => {
        const relatedItemId =
          item.id || item.tempId || currentList.indexOf(item);
        newCheckedItems.delete(relatedItemId);
      });
    } else {
      // Checking - add all related items
      relatedItems.forEach((item) => {
        const relatedItemId =
          item.id || item.tempId || currentList.indexOf(item);
        newCheckedItems.add(relatedItemId);
      });
    }

    setCheckedItems(newCheckedItems);
  };

  if (loading) {
    return <LoadingAcorn />;
  }

  return (
    <div className="card card-grocery">
      <header className={`page-header ${!isEditing ? "flex-between" : ""}`}>
        {!isEditing ? (
          <button
            className="btn-unstyled back-arrow"
            onClick={() => navigate(-1)}
            aria-label={t("go_back")}
          >
            <ArrowBigLeft size={28} />
          </button>
        ) : (
          <button
            className="btn-unstyled back-arrow-left"
            onClick={() => navigateWithConfirmation(-1)}
            aria-label={t("go_back")}
          >
            <ArrowBigLeft size={28} />
          </button>
        )}
        <h1 className="forta">{t("grocery_list")}</h1>
        {!isEditing && (
          <button
            className="btn-unstyled"
            onClick={startEditing}
            aria-label={t("edit_list")}
          >
            <Pencil size={24} />
          </button>
        )}
      </header>

      <div className={`flex-column${isEditing ? " flex-center" : ""}`}>
        {currentList.length === 0 && !isEditing ? (
          <div className="flex-center">
            <button
              className="btn btn-icon btn-icon-green"
              onClick={addNewItem}
              aria-label={t("add_item")}
            >
              <Plus size={20} />
            </button>
          </div>
        ) : (
          <ul className="grocery-list">
            {isEditing
              ? // Edit mode - show individual items
                currentList.map((item, index) => {
                  // Generate a unique key using id or tempId or index as fallback
                  const itemKey = item.id || item.tempId || `item-${index}`;
                  const itemId = item.id || item.tempId || index;

                  return (
                    <li className="grocery-edit-item" key={itemKey}>
                      <div className="item-content">
                        <input
                          id={`item-name-${itemId}`}
                          value={item.name || ""}
                          className="input input--edit input--full-width"
                          readOnly={!isEditing}
                          placeholder={t("item_name")}
                          onChange={(e) =>
                            handleInputChange(index, "name", e.target.value)
                          }
                        />
                        <div className="item-details">
                          <input
                            id={`item-quantity-${itemId}`}
                            type="text"
                            value={formatQuantityForUnit(item.quantity)}
                            className="input input--edit input--full-width"
                            readOnly={!isEditing}
                            placeholder={t("quantity")}
                            onChange={(e) =>
                              handleInputChange(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                          />
                          <Selector
                            id={`item-unit-${itemId}`}
                            value={item.unit || ""}
                            onChange={(unitValue) =>
                              handleInputChange(index, "unit", unitValue)
                            }
                            type="unit"
                            className="input--full-width"
                          />

                          <input
                            id={`item-notes-${itemId}`}
                            value={item.notes || ""}
                            className="input input--edit input--full-width input--textarea"
                            readOnly={!isEditing}
                            placeholder={t("notes")}
                            onChange={(e) =>
                              handleInputChange(index, "notes", e.target.value)
                            }
                          />
                          <button
                            className="btn btn-icon btn-icon-remove"
                            onClick={() => removeItemFromEdit(index)}
                            title={t("remove_item")}
                            aria-label={t("remove_item")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })
              : // View mode - show grouped ingredients
                groupIngredients(currentList).map((group, groupIndex) => {
                  const groupKey = `group-${groupIndex}`;
                  const firstItem = group.items[0];
                  const firstItemId = firstItem.itemId;
                  const isGroupChecked = checkedItems.has(firstItemId);

                  if (group.items.length === 1) {
                    // Single item - display normally
                    const item = group.items[0];
                    return (
                      <li
                        className={`flex-row grocery-view-item ${
                          isGroupChecked ? "checked" : ""
                        }`}
                        key={groupKey}
                      >
                        <input
                          type="checkbox"
                          checked={isGroupChecked}
                          onChange={() => toggleItemChecked(item.itemId)}
                          id={`grocery-view-item-${item.itemId}`}
                        />
                        <span className="item-name">{item.name}</span>
                        {(item.quantity || item.unit) && (
                          <span className="item-details">
                            {(() => {
                              let qty = item.quantity || "";
                              let unit = item.unit || "";

                              // Smart conversion for large quantities
                              if (qty >= 1000) {
                                if (unit === "ml") {
                                  qty = qty / 1000;
                                  unit = "l";
                                } else if (unit === "g") {
                                  qty = qty / 1000;
                                  unit = "kg";
                                }
                              }

                              const displayQuantity =
                                formatQuantityForUnit(qty);
                              const displayUnit = unit
                                ? formatUnitDisplay(unit, qty, units)
                                : "";
                              return `${displayQuantity}${
                                displayQuantity && displayUnit ? " " : ""
                              }${displayUnit}`;
                            })()}
                          </span>
                        )}
                      </li>
                    );
                  } else {
                    // Multiple items - show grouped
                    const measurements = group.items
                      .map((item) => {
                        let qty = item.quantity || "";
                        let unit = item.unit || "";

                        // Smart conversion for large quantities
                        if (qty >= 1000) {
                          if (unit === "ml") {
                            qty = qty / 1000;
                            unit = "l";
                          } else if (unit === "g") {
                            qty = qty / 1000;
                            unit = "kg";
                          }
                        }

                        const displayQuantity = formatQuantityForUnit(qty);
                        const displayUnit = unit
                          ? formatUnitDisplay(unit, qty, units)
                          : "";
                        const measurement = `${displayQuantity}${
                          displayQuantity && displayUnit ? " " : ""
                        }${displayUnit}`.trim();
                        return measurement || null;
                      })
                      .filter(Boolean)
                      .join(" + ");

                    return (
                      <li
                        className={`flex-row grocery-view-item ${
                          isGroupChecked ? "checked" : ""
                        }`}
                        key={groupKey}
                      >
                        <input
                          type="checkbox"
                          checked={isGroupChecked}
                          onChange={() => toggleItemChecked(firstItemId)}
                          id={`grocery-view-item-${firstItemId}`}
                        />
                        <span className="item-name">{group.displayName}</span>
                        <span className="item-details">{measurements} </span>
                      </li>
                    );
                  }
                })}
            {isEditing && (
              <button
                className="btn btn-icon btn-icon-green"
                onClick={addNewItem}
                aria-label={t("add_item")}
              >
                <Plus size={20} />
              </button>
            )}
          </ul>
        )}
      </div>

      {isEditing && (
        <div className="btn-wrapper edit">
          {/* Clear Button */}
          <button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            className="btn btn-action btn-danger"
          >
            {t("clear_list")}
          </button>
          {/* Cancel Button */}
          <button
            className="btn btn-action btn-secondary"
            onClick={handleCancelClick}
          >
            {t("cancel")}
          </button>
          {/* Save Button */}
          <button className="btn btn-action btn-primary" onClick={saveChanges}>
            {t("save")}
          </button>
        </div>
      )}

      {/* Clear List Modal */}
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={() => {
          clearGroceryList();
          setEditedList([]);
          setOriginalGroceryList([]);
          setIsClearModalOpen(false);
        }}
        message={t("grocery_list_clear_confirmation")}
        confirmText={t("clear_list")}
        cancelText={t("cancel")}
        confirmButtonType="danger"
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={confirmCancel}
        message={t("unsaved_changes_warning")}
        confirmText={t("leave_page")}
        cancelText={t("stay")}
        confirmButtonType="danger"
      />

      {/* Unsaved Changes Modal */}
      <ConfirmationModal
        isOpen={isUnsavedChangesModalOpen}
        onClose={confirmNavigation}
        onConfirm={cancelNavigation}
        message={unsavedChangesMessage}
        confirmText={t("stay")}
        cancelText={t("leave_page")}
        confirmButtonType="primary"
      />
    </div>
  );
};

export default GroceryList;
