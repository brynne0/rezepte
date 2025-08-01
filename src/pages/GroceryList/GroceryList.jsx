import "./GroceryList.css";
import { useGroceryList } from "../../hooks/data/useGroceryList";
import { Trash2, Pencil, ArrowBigLeft, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import { getUserPreferredLanguage } from "../../services/userService";
import AutoResizeTextArea from "../../components/AutoResizeTextArea";
import AutoResizeInput from "../../components/AutoResizeInput";

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

  const currentList = isEditing ? editedList : groceryList;

  // Calculate the maximum width needed for quantity fields
  const calculateQuantityWidth = () => {
    if (currentList.length === 0) return 40;
    const testValues = currentList.map((item) => String(item.quantity || "0"));
    const longestValue = testValues.reduce((a, b) =>
      a.length > b.length ? a : b
    );
    return Math.min(Math.max(longestValue.length * 10 + 30, 40), 100);
  };

  const quantityWidth = calculateQuantityWidth();

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
            <button
              className="btn btn-icon btn-icon-success"
              onClick={addNewItem}
            >
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
                <AutoResizeTextArea
                  value={item.name || ""}
                  className="input input--borderless input--full-width input--textarea"
                  readOnly={!isEditing}
                  placeholder={t("item_name")}
                  onChange={(e) =>
                    handleInputChange(index, "name", e.target.value)
                  }
                />
                <AutoResizeInput
                  id={`item-quantity-${itemId}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={item.quantity || ""}
                  className="input input--borderless"
                  readOnly={!isEditing}
                  placeholder={t("quantity")}
                  minWidth={20}
                  maxWidth={80}
                  syncWidth={quantityWidth}
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
              </div>
            );
          })
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
