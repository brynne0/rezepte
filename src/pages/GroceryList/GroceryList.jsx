import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trash2, Pencil, ArrowBigLeft, Plus } from "lucide-react";

import "./GroceryList.css";
import { useGroceryList } from "../../hooks/data/useGroceryList";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import AutoResizeTextArea from "../../components/AutoResizeTextArea/AutoResizeTextArea";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import { getUserPreferredLanguage } from "../../services/userService";
import { normaliseIngredientName } from "../../services/groceryListService";

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

  // Helper function to get unit display with translation and smart fallback
  const getUnitDisplay = (unit, quantity) => {
    if (!unit) return "";

    // Find the unit object in the units array
    const unitObj = units?.find((u) => u.value === unit);
    const translated = unitObj?.label || unit;

    // Simple fallback for singular/plural
    if (translated.includes("/")) {
      const [singular, pluralSuffix] = translated.split("/");
      return parseFloat(quantity) > 1 ? singular + pluralSuffix : singular;
    }

    return translated;
  };

  // Use prop-based editing state, fallback to local state if props not provided
  const isEditing = propIsEditing !== undefined ? propIsEditing : false;
  const setIsEditing = propSetIsEditing || (() => {});

  const [editedList, setEditedList] = useState([]);
  const [checkedItems, setCheckedItems] = useState(new Set());

  const currentList = isEditing ? editedList : groceryList;

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

  const startEditing = async () => {
    try {
      // Get user's preferred language and switch to it
      const preferredLanguage = await getUserPreferredLanguage();
      if (i18n.language !== preferredLanguage) {
        i18n.changeLanguage(preferredLanguage);
      }

      setIsEditing(true);
      setEditedList([...groceryList]); // Create a copy to edit
    } catch (error) {
      console.error("Error switching to preferred language:", error);
      setIsEditing(true);
      setEditedList([...groceryList]);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedList([]);
  };

  const saveChanges = () => {
    updateGroceryList(editedList);
    setIsEditing(false);
    setEditedList([]);
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
    <div className="card card-page">
      <header className="page-header flex-between">
        {!isEditing ? (
          <ArrowBigLeft
            className="back-arrow"
            size={30}
            onClick={() => navigate(-1)}
          />
        ) : (
          <div style={{ width: 30, height: 30 }}></div>
        )}
        <h1>{t("grocery_list")}</h1>
        {!isEditing ? (
          <Pencil onClick={startEditing} className="btn btn-icon" />
        ) : (
          <div style={{ width: 24, height: 24 }}></div>
        )}
      </header>

      <div className={`flex-column${isEditing ? " flex-center" : ""}`}>
        {currentList.length === 0 && !isEditing ? (
          <div className="flex-center">
            <button
              className="btn btn-icon btn-icon-success"
              onClick={addNewItem}
            >
              <Plus size={20} />
            </button>
          </div>
        ) : (
          <ul>
            {isEditing
              ? // Edit mode - show individual items
                currentList.map((item, index) => {
                  // Generate a unique key using id or tempId or index as fallback
                  const itemKey = item.id || item.tempId || `item-${index}`;
                  const itemId = item.id || item.tempId || index;

                  return (
                    <li className="list-item" key={itemKey}>
                      <AutoResizeTextArea
                        id={`item-name-${itemId}`}
                        value={item.name || ""}
                        className="input input--borderless input--full-width input--textarea"
                        readOnly={!isEditing}
                        placeholder={t("item_name")}
                        onChange={(e) =>
                          handleInputChange(index, "name", e.target.value)
                        }
                      />
                      <input
                        id={`item-quantity-${itemId}`}
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.quantity || ""}
                        className="input input--borderless input--full-width"
                        readOnly={!isEditing}
                        placeholder={t("quantity")}
                        onChange={(e) =>
                          handleInputChange(
                            index,
                            "quantity",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                      <select
                        id={`item-unit-${itemId}`}
                        value={item.unit || ""}
                        className="input input--borderless input--full-width input--select"
                        disabled={!isEditing}
                        onChange={(e) =>
                          handleInputChange(index, "unit", e.target.value)
                        }
                      >
                        {units &&
                          Array.isArray(units) &&
                          units.map((unit) => (
                            <option key={unit.value} value={unit.value}>
                              {unit.label}
                            </option>
                          ))}
                      </select>

                      {isEditing ? (
                        <button
                          className="btn btn-icon btn-icon-remove"
                          onClick={() => removeItemFromEdit(index)}
                          title={t("remove_item")}
                          aria-label={t("remove_item")}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <div
                          className="spacer"
                          style={{ width: 16, height: 16 }}
                        ></div>
                      )}
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
                        className={`flex-row grocery-item ${
                          isGroupChecked ? "checked" : ""
                        }`}
                        key={groupKey}
                      >
                        <input
                          type="checkbox"
                          checked={isGroupChecked}
                          onChange={() => toggleItemChecked(item.itemId)}
                          id={`grocery-item-${item.itemId}`}
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

                              const displayUnit = unit
                                ? getUnitDisplay(unit, qty)
                                : "";
                              return `${qty}${
                                qty && displayUnit ? " " : ""
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

                        const displayUnit = unit
                          ? getUnitDisplay(unit, qty)
                          : "";
                        const measurement = `${qty}${
                          qty && displayUnit ? " " : ""
                        }${displayUnit}`.trim();
                        return measurement || null;
                      })
                      .filter(Boolean)
                      .join(" + ");

                    return (
                      <li
                        className={`flex-row grocery-item ${
                          isGroupChecked ? "checked" : ""
                        }`}
                        key={groupKey}
                      >
                        <input
                          type="checkbox"
                          checked={isGroupChecked}
                          onChange={() => toggleItemChecked(firstItemId)}
                          id={`grocery-item-${firstItemId}`}
                        />
                        <span className="item-name">{group.displayName}</span>
                        <span className="item-details">{measurements} </span>
                      </li>
                    );
                  }
                })}
          </ul>
        )}

        {isEditing && (
          <button
            className="btn btn-icon btn-icon-success"
            onClick={addNewItem}
          >
            <Plus size={20} />
          </button>
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
            onClick={cancelEditing}
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
          setIsClearModalOpen(false);
        }}
        message={t("grocery_list_clear_confirmation")}
        confirmText={t("clear_list")}
        cancelText={t("cancel")}
        confirmButtonType="danger"
      />
    </div>
  );
};

export default GroceryList;
