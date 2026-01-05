import "./CategoryFilter.css";

const CategoryFilter = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  setSearchTerm,
}) => {
  return (
    <div className="categories-wrapper " data-nosnippet>
      {categories.map((category) => (
        <button
          key={category.value}
          className={`subheading-wrapper${
            category.value === selectedCategory ? " selected" : ""
          }`}
          onClick={() => {
            setSearchTerm("");
            setSelectedCategory(category.value);
          }}
        >
          <h2 className="forta">{category.label}</h2>
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
