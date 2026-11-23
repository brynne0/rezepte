import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
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
import FilterStrip from "../FilterStrip/FilterStrip";

const RecipeFilters = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  onSearchSubmit,
}) => {
  const { t } = useTranslation();

  const [currentSearchInput, setCurrentSearchInput] = useState(
    searchTerm || ""
  );
  const searchInputRef = useRef(null);

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
            <InputGroup variant="paper" className="h-10">
              <InputGroupAddon align="inline-start">
                <Search className="size-5" />
              </InputGroupAddon>
              <InputGroupInput
                id="search"
                ref={searchInputRef}
                type="text"
                value={currentSearchInput}
                onChange={(e) => {
                  setCurrentSearchInput(e.target.value);
                  setSearchTerm(e.target.value);
                  if (e.target.value.length > 0) {
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
                            searchInputRef.current?.focus();
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
        </div>
      </div>

      <FilterStrip
        className="px-2 pb-4 md:px-0"
        items={categories}
        selected={selectedCategory}
        onSelect={(value) => {
          setSearchTerm("");
          setSelectedCategory(value);
        }}
        labelAs="h3"
        data-nosnippet
      />
    </>
  );
};

export default RecipeFilters;
