import { Button } from "@/components/ui/button";

const CategoryFilter = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  setSearchTerm,
}) => {
  return (
    <div className="block flex-nowrap overflow-x-auto pb-4" data-nosnippet>
      {categories.map((category) => (
        <Button
          key={category.value}
          variant="text"
          aria-pressed={category.value === selectedCategory}
          className="mx-4 my-2 h-auto rounded-md px-2 py-1"
          onClick={() => {
            setSearchTerm("");
            setSelectedCategory(category.value);
          }}
        >
          <h2 className="forta">{category.label}</h2>
        </Button>
      ))}
    </div>
  );
};

export default CategoryFilter;
