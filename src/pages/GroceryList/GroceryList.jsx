import "./GroceryList.css";
import { useGroceryList } from "../../hooks/useGroceryList";
import { Trash2, Pencil, ArrowBigLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const GroceryList = () => {
  const { groceryList, updateGroceryList } = useGroceryList();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const units = t("units", { returnObjects: true });

  // Overall edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedList, setEditedList] = useState([]);

  const startEditing = () => {
    setIsEditing(true);
    setEditedList([...groceryList]); // Create a copy to edit
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

  const addNewItem = () => {
    if (!isEditing) {
      startEditing();
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

  const currentList = isEditing ? editedList : groceryList;

  return (
    <div className="grocery-list-wrapper">
      <header className="grocery-page-header-wrapper">
        <ArrowBigLeft
          className="back-arrow"
          size={30}
          onClick={() => navigate(-1)}
        />
        <h1>{t("grocery_list")}</h1>
        {!isEditing ? (
          <Pencil onClick={startEditing} />
        ) : (
          <div style={{ width: 24, height: 24 }}></div>
        )}
      </header>

      <div className="list-items">
        {currentList.length === 0 && !isEditing ? (
          <div>
            <button className="add-btn" onClick={addNewItem}>
              <Plus size={20} />
            </button>
          </div>
        ) : (
          currentList.map((item, index) => {
            // Generate a unique key using id or tempId or index as fallback
            const itemKey = item.id || item.tempId || `item-${index}`;
            const itemId = item.id || item.tempId || index;

            return (
              <div className="list-item" key={itemKey}>
                <input
                  id={`item-name-${itemId}`}
                  type="text"
                  value={item.name || ""}
                  className="item-input"
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
                  className="item-input"
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
                  className="item-input"
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
                    className="remove-btn"
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
              </div>
            );
          })
        )}
        {isEditing && (
          <button className="add-btn" onClick={addNewItem}>
            <Plus size={20} />
          </button>
        )}
      </div>

      {isEditing && (
        <div className="btn-wrapper">
          <button className="primary-btn cancel-btn" onClick={cancelEditing}>
            {t("cancel")}
          </button>
          <button className="primary-btn save-btn" onClick={saveChanges}>
            {t("save")}
          </button>
        </div>
      )}
    </div>
  );
};

export default GroceryList;
