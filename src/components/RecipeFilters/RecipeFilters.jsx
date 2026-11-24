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
import SeasonalSquirrel from "../SeasonalSquirrel/SeasonalSquirrel";
import { cn } from "cn";

const RecipeFilters = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchTerm,
  setSearchTerm,
  onSearchSubmit,
  showSquirrel = false,
}) => {
  const { t } = useTranslation();

  const [currentSearchInput, setCurrentSearchInput] = useState(
    searchTerm || ""
  );
  const searchInputRef = useRef(null);
  // Squirrel ducks while searching; tapping him toggles up/down
  const [squirrelDown, setSquirrelDown] = useState(false);

  // Sync search input with external search term changes
  useEffect(() => {
    setCurrentSearchInput(searchTerm || "");
  }, [searchTerm]);

  return (
    <>
      <div className="flex justify-center pb-4 md:px-6">
        <div className="flex w-full max-w-xl flex-col items-stretch gap-3 md:flex-row md:items-center">
          <form
            className={cn(
              "relative w-full md:flex-1",
              // Just enough room for the squirrel inside the scroll area's top padding
              showSquirrel && "mt-5 md:mt-4"
            )}
            onSubmit={(e) => {
              e.preventDefault();
              setSearchTerm(currentSearchInput);
              onSearchSubmit?.();
            }}
          >
            {/* Sits behind the search bar's top edge; decorative, so hidden from keyboard and screen readers */}
            {showSquirrel && (
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                data-down={squirrelDown || undefined}
                className="squirrel-perch absolute right-5 bottom-[calc(100%-3px)] cursor-pointer"
                // Keep focus in the search box when tapped mid-search
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSquirrelDown((down) => !down)}
              >
                <SeasonalSquirrel className="size-8 text-foreground" />
              </button>
            )}
            <InputGroup variant="paper" className="h-10">
              <InputGroupAddon align="inline-start">
                <Search className="size-5" />
              </InputGroupAddon>
              <InputGroupInput
                id="search"
                ref={searchInputRef}
                type="text"
                onFocus={() => setSquirrelDown(true)}
                onBlur={() => setSquirrelDown(false)}
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
