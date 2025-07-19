import { useGroceryList } from "../hooks/useGroceryList";

const GroceryList = () => {
  const { groceryList, removeFromGroceryList } = useGroceryList();

  return (
    <div>
      {groceryList.map((item) => (
        <div key={item.id}>
          {item.name} - {item.quantity} {item.unit}
          <button onClick={() => removeFromGroceryList(item.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
};

export default GroceryList;
