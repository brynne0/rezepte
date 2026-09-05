import { useTranslation } from "react-i18next";
import {
  Clock,
  ArrowDownAZ,
  ArrowDownZA,
  ClockArrowDown,
  ClockArrowUp,
  Image,
  ImageOff,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Toggle } from "@/components/ui/toggle";

const SortButtons = ({
  sortBy,
  onSortChange,
  showImages,
  onShowImagesChange,
  onPageReset,
  isLoggedIn = false,
}) => {
  const { t } = useTranslation();

  const handleTitleSort = () => {
    if (sortBy === "title_asc") {
      onSortChange("title_desc");
    } else {
      onSortChange("title_asc");
    }
    onPageReset && onPageReset();
  };

  const handleRecentSort = () => {
    if (sortBy === "last_viewed_at_desc") {
      onSortChange("last_viewed_at_asc");
    } else {
      onSortChange("last_viewed_at_desc");
    }
    onPageReset && onPageReset();
  };

  const getTitleIcon = () => {
    if (sortBy === "title_asc") return <ArrowDownAZ />;
    if (sortBy === "title_desc") return <ArrowDownZA />;
    return <ArrowDownAZ />;
  };

  const getRecentIcon = () => {
    if (sortBy === "last_viewed_at_asc") return <ClockArrowUp />;
    if (sortBy === "last_viewed_at_desc") return <ClockArrowDown />;
    return <Clock />;
  };

  const getImageIcon = () => {
    if (showImages) return <Image />;
    else return <ImageOff />;
  };

  const isTitleActive = sortBy === "title_asc" || sortBy === "title_desc";
  const isRecentActive =
    sortBy === "last_viewed_at_asc" || sortBy === "last_viewed_at_desc";

  return (
    <div className="flex shrink-0 items-center justify-center gap-2">
      <ToggleGroup
        value={isRecentActive ? ["recent"] : isTitleActive ? ["title"] : []}
        variant="outline"
      >
        <ToggleGroupItem
          value="recent"
          onClick={handleRecentSort}
          aria-label={t("sort_by_recently_used")}
          title={t("sort_by_recently_used")}
        >
          {getRecentIcon()}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="title"
          onClick={handleTitleSort}
          aria-label={t("sort_by_title")}
          title={t("sort_by_title")}
        >
          {getTitleIcon()}
        </ToggleGroupItem>
      </ToggleGroup>
      {isLoggedIn && (
        <Toggle
          variant="outline"
          pressed={showImages}
          onPressedChange={onShowImagesChange}
          aria-label={showImages ? t("hide_images") : t("show_images")}
          title={showImages ? t("hide_images") : t("show_images")}
        >
          {getImageIcon()}
        </Toggle>
      )}
    </div>
  );
};

export default SortButtons;
