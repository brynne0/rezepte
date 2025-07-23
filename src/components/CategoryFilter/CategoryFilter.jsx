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
          key={category.value}
          className={`subheading${
            category.value === selectedCategory ? " selected" : ""
          }`}
          onClick={() => {
            setSelectedCategory(category.value);
            setSearchTerm("");
          }}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
