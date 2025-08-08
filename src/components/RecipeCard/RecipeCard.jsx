import "./RecipeCard.css";
import { Link } from "lucide-react";

const RecipeCard = ({ recipe, onClick }) => {
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
        <span
          className="recipe-card-link"
          role="link-icon"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the card click
            window.open(recipe.source, "_blank", "noopener,noreferrer");
          }}
        >
          <Link size={16} />
        </span>
      )}
    </div>
  );
};

export default RecipeCard;
