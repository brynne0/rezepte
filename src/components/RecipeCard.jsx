import "./Recipe.css";

const RecipeCard = ({ recipe, onClick }) => {
  return (
    <div className="recipe-card" onClick={() => onClick(recipe)}>
      <img className="recipe-image" src={recipe.image} />
      <h3 className="recipe-title">{recipe.title}</h3>
    </div>
  );
};

export default RecipeCard;
