import { useParams } from "react-router-dom";
import { useRecipe } from "../hooks/useRecipe";

const Recipe = () => {
  const { id } = useParams();
  const { recipe, loading } = useRecipe(id);

  if (loading) return <div>Loading...</div>;
  if (!recipe) return <div>Recipe not found</div>;

  return (
    <div>
      <h1 className="recipe-title">{recipe.title}</h1>
    </div>
  );
};

export default Recipe;
