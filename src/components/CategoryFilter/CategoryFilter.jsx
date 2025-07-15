import "./CategoryFilter.css";

const CategoryFilter = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  setSearchTerm,
}) => {
  return (
    <div className="categories">
      {categories.map((category) => (
        <button
          key={category}
          className={`category-item${
            category === selectedCategory ? " selected" : ""
          }`}
          onClick={() => {
            setSelectedCategory(category);
            setSearchTerm("");
          }}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
