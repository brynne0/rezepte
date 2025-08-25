import { useTranslation } from "react-i18next";
import {
  Calendar,
  ArrowDownAZ,
  ArrowDownZA,
  CalendarArrowDown,
  CalendarArrowUp,
} from "lucide-react";
import "./SortButtons.css";

const SortButtons = ({ sortBy, onSortChange }) => {
  const { t } = useTranslation();

  const handleTitleSort = () => {
    if (sortBy === "title_asc") {
      onSortChange("title_desc");
    } else {
      onSortChange("title_asc");
    }
  };

  const handleDateSort = () => {
    if (sortBy === "created_at_desc") {
      onSortChange("created_at_asc");
    } else {
      onSortChange("created_at_desc");
    }
  };

  const getTitleIcon = () => {
    if (sortBy === "title_asc") return <ArrowDownAZ size={20} />;
    if (sortBy === "title_desc") return <ArrowDownZA size={20} />;
    return <ArrowDownAZ size={20} />;
  };

  const getDateIcon = () => {
    if (sortBy === "created_at_asc") return <CalendarArrowUp size={20} />;
    if (sortBy === "created_at_desc") return <CalendarArrowDown size={20} />;
    return <Calendar size={20} />;
  };

  const isTitleActive = sortBy === "title_asc" || sortBy === "title_desc";
  const isDateActive =
    sortBy === "created_at_asc" || sortBy === "created_at_desc";

  return (
    <div className="sort-buttons">
      <button
        className={`btn-unstyled btn-sort ${isTitleActive ? "active" : ""}`}
        onClick={handleTitleSort}
        aria-label={t("sort_by_title")}
        title={t("sort_by_title")}
      >
        {getTitleIcon()}
      </button>
      <button
        className={`btn-unstyled btn-sort ${isDateActive ? "active" : ""}`}
        onClick={handleDateSort}
        aria-label={t("sort_by_date")}
        title={t("sort_by_date")}
      >
        {getDateIcon()}
      </button>
    </div>
  );
};

export default SortButtons;
