import { useTranslation } from "react-i18next";
import { ChevronDown, Image, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const RECENT_SORTS = ["last_viewed_at_desc", "last_viewed_at_asc"];
const TITLE_SORTS = ["title_asc", "title_desc"];

const ResultsBar = ({
  count,
  sortBy,
  onSortChange,
  onPageReset,
  showRecentSort = true,
  showImages,
  onShowImagesChange,
  showImageToggle = true,
}) => {
  const { t } = useTranslation();

  const sortOptions = [...(showRecentSort ? RECENT_SORTS : []), ...TITLE_SORTS];
  const currentSort = sortOptions.includes(sortBy) ? sortBy : sortOptions[0];

  const handleSortChange = (value) => {
    onSortChange(value);
    onPageReset?.();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-3 text-sm text-muted-foreground">
      <span>{t("recipe_count", { count })}</span>

      <div className="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-1 px-2 font-normal">
                <span className="text-muted-foreground">{t("sort_label")}</span>
                <span className="text-foreground">
                  {t(`sort_short_${currentSort}`)}
                </span>
                <ChevronDown />
              </Button>
            }
          />
          <DropdownMenuContent align="end" fit="content">
            <DropdownMenuRadioGroup
              value={currentSort}
              onValueChange={handleSortChange}
            >
              {sortOptions.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {t(`sort_${option}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {showImageToggle && (
          <ToggleGroup
            value={[showImages ? "photos" : "titles"]}
            onValueChange={(value) => {
              if (value.length) onShowImagesChange(value[0] === "photos");
            }}
            variant="segment"
            size="sm"
            spacing={0.5}
            aria-label={t("view_label")}
          >
            <ToggleGroupItem value="photos" aria-label={t("view_with_photos")}>
              <Image />
            </ToggleGroupItem>
            <ToggleGroupItem value="titles" aria-label={t("view_titles_only")}>
              <AlignLeft />
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
    </div>
  );
};

export default ResultsBar;
