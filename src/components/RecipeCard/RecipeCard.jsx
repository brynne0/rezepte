import "./RecipeCard.css";

const RecipeCard = ({ recipe, onClick }) => {
  return (
    <div className="recipe-card" onClick={() => onClick(recipe)}>
      {/* <img className="recipe-image" src={recipe.image} /> */}
      <h4>{recipe.title}</h4>
    </div>
  );
};

export default RecipeCard;
