import "./RecipeCard.css";
import { Link } from "lucide-react";
import { useTranslation } from "react-i18next";

const RecipeCard = ({ recipe, onClick }) => {
  const { t } = useTranslation();
  // Check if recipe has a source link
  const hasSourceLink =
    recipe.source &&
    (recipe.source.startsWith("http://") ||
      recipe.source.startsWith("https://") ||
      recipe.source.startsWith("www."));

  return (
    <div className="recipe-card" onClick={() => onClick(recipe)}>
      {/* <img className="recipe-image" src={recipe.image} /> */}
      <h4 className="recipe-card-title">{recipe.title}</h4>
      {hasSourceLink && (
        <button
          className="btn-unstyled recipe-card-link"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the card click
            window.open(recipe.source, "_blank", "noopener,noreferrer");
          }}
          aria-label={t("open_recipe_source_link")}
          title={t("open_recipe_source_link")}
        >
          <Link size={16} />
        </button>
      )}
    </div>
  );
};

export default RecipeCard;
