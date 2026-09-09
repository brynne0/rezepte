import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import SortButtons from "../SortButtons/SortButtons";

const RecipeFilters = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  onSearchSubmit,
  resetCategoryOnSearch = true,
  sortBy,
  setSortBy,
  showImages,
  setShowImages,
  onPageReset,
  showImageToggle = true,
}) => {
  const { t } = useTranslation();

  const [currentSearchInput, setCurrentSearchInput] = useState(
    searchTerm || ""
  );

  // Sync search input with external search term changes
  useEffect(() => {
    setCurrentSearchInput(searchTerm || "");
  }, [searchTerm]);

  return (
    <>
      <div className="flex justify-center px-4 pb-4 md:px-6">
        <div className="flex w-full max-w-xl flex-col items-stretch gap-3 md:flex-row md:items-center">
          <form
            className="w-full md:flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchTerm(currentSearchInput);
              onSearchSubmit?.();
            }}
          >
            <InputGroup className="h-10">
              <InputGroupAddon align="inline-start" className="text-foreground">
                <Search className="size-5" />
              </InputGroupAddon>
              <InputGroupInput
                id="search"
                type="text"
                value={currentSearchInput}
                onChange={(e) => {
                  setCurrentSearchInput(e.target.value);
                  setSearchTerm(e.target.value);
                  if (resetCategoryOnSearch && e.target.value.length > 0) {
                    setSelectedCategory("all_recipes");
                  }
                }}
                className="text-base"
                placeholder={t("search")}
              />
              {currentSearchInput && (
                <InputGroupAddon align="inline-end">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          aria-label={t("clear_search")}
                          onClick={() => {
                            setCurrentSearchInput("");
                            setSearchTerm("");
                          }}
                        >
                          <X />
                        </InputGroupButton>
                      }
                    />
                    <TooltipContent>{t("clear_search")}</TooltipContent>
                  </Tooltip>
                </InputGroupAddon>
              )}
            </InputGroup>
          </form>
          <SortButtons
            sortBy={sortBy}
            onSortChange={setSortBy}
            showImages={showImages}
            onShowImagesChange={setShowImages}
            onPageReset={onPageReset}
            showImageToggle={showImageToggle}
          />
        </div>
      </div>

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
    </>
  );
};

export default RecipeFilters;
