import "./GroceryList.css";
import { useGroceryList } from "../../hooks/useGroceryList";
import { Trash2, Pencil, ArrowBigLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const GroceryList = () => {
  const { groceryList, removeFromGroceryList } = useGroceryList();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const units = t("units", { returnObjects: true });

  return (
    <div className="grocery-list-wrapper">
      <header className="page-header-wrapper">
        <ArrowBigLeft
          className="back-arrow"
          size={30}
          onClick={() => {
            navigate(-1);
          }}
        />
        <h1>{t("grocery_list")}</h1>
      </header>
      <div className="list-items">
        {groceryList.map((item) => (
          // FIX TEMP ID - undefined
          <div className="list-item" key={item.id}>
            <input
              id={`item-name-${item.tempId}`}
              type="text"
              value={item.name}
              className="item-input"
            />
            <input
              id={`item-quantity-${item.tempId}`}
              type="text"
              value={item.quantity}
              className="item-input"
            />
            <select
              id={`ingredient-unit-${item.tempId}`}
              value={item.unit}
              className={"item-input"}
            >
              {units.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>

            <button
              className="remove-btn"
              onClick={() => removeFromGroceryList(item.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroceryList;
