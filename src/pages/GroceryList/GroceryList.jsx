import "./GroceryList.css";
import { useGroceryList } from "../../hooks/data/useGroceryList";
import { Trash2, Pencil, ArrowBigLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import { getUserPreferredLanguage } from "../../services/userService";
import { normaliseIngredientName } from "../../services/groceryListService";
import AutoResizeTextArea from "../../components/AutoResizeTextArea";

const GroceryList = ({
  isEditing: propIsEditing,
  setIsEditing: propSetIsEditing,
}) => {
  const { groceryList, updateGroceryList, loading } = useGroceryList();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const units = t("units", { returnObjects: true });

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

    const newItem = {
      tempId: `temp-${Date.now()}`,
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
    return (
      <div className="loading-acorn">
        <LoadingAcorn />
      </div>
    );
  }

  return (
    <div className="card card-padded">
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
          <Pencil onClick={startEditing} />
        ) : (
          <div style={{ width: 24, height: 24 }}></div>
        )}
      </header>

      <div className={`grocery-list-wrapper${isEditing ? " flex-center" : ""}`}>
        {currentList.length === 0 && !isEditing ? (
          <div>
            <button
              className="btn btn-icon btn-icon-success"
              onClick={addNewItem}
            >
              <Plus size={20} />
            </button>
          </div>
        ) : (
          <ul className={` ${isEditing ? "edit-list-items" : "list-items"}`}>
            {isEditing
              ? // Edit mode - show individual items
                currentList.map((item, index) => {
                  // Generate a unique key using id or tempId or index as fallback
                  const itemKey = item.id || item.tempId || `item-${index}`;
                  const itemId = item.id || item.tempId || index;

                  return (
                    <li className="list-item" key={itemKey}>
                      <AutoResizeTextArea
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
                        className={`list-view-item ${
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
                        {item.quantity && item.unit && (
                          <span className="item-details">
                            {item.quantity} {t(`units.${item.unit}`, item.unit)}
                          </span>
                        )}
                      </li>
                    );
                  } else {
                    // Multiple items - show grouped
                    const measurements = group.items
                      .map((item) =>
                        `${item.quantity || ""} ${
                          t(`units.${item.unit}`, item.unit) || ""
                        }`.trim()
                      )
                      .filter(Boolean)
                      .join(" + ");

                    return (
                      <li
                        className={`list-view-item ${
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
        // TODO
        <div className="btn-wrapper">
          <button
            className="btn btn-action btn-secondary"
            onClick={cancelEditing}
          >
            {t("cancel")}
          </button>
          <button className="btn btn-action btn-primary" onClick={saveChanges}>
            {t("save")}
          </button>
        </div>
      )}
    </div>
  );
};

export default GroceryList;
