import { useGroceryList } from "../../hooks/useGroceryList";
import { Trash2, Pencil } from "lucide-react";
import "./GroceryList.css";

const GroceryList = () => {
  const { groceryList, removeFromGroceryList } = useGroceryList();

  return (
    <div className="grocery-list-wrapper">
      <div className="list-items">
        {groceryList.map((item) => (
          <div className="list-item" key={item.id}>
            {item.name} - {item.quantity} {item.unit}
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
