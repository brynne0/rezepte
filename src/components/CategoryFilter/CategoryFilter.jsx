import { Button } from "@/components/ui/button";

const CategoryFilter = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  setSearchTerm,
}) => {
  return (
    <div
      className="flex flex-wrap justify-center gap-x-2 gap-y-2 pb-4 md:gap-x-4"
      data-nosnippet
    >
      {categories.map((category) => (
        <Button
          key={category.value}
          variant="text"
          aria-pressed={category.value === selectedCategory}
          onClick={() => {
            setSearchTerm("");
            setSelectedCategory(category.value);
          }}
        >
          <h3 className="font-forta uppercase">{category.label}</h3>
        </Button>
      ))}
    </div>
  );
};

export default CategoryFilter;
