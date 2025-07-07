import { useNavigate } from "react-router-dom";
import "./CategoryFilter.css";

const CategoryFilter = ({
  categories,
  selectedCategory,
  setSelectedCategory,
}) => {
  const navigate = useNavigate();

  return (
    <div className="categories">
      <div className="category-list">
        {categories.map((category) => (
          <button
            key={category}
            className={`category-item${
              category === selectedCategory ? " selected" : ""
            }`}
            onClick={() => {
              // Don't refresh if current category already selected
              if (category !== selectedCategory) {
                setSelectedCategory(category);
                navigate("/"); // Go to home page
              }
            }}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
