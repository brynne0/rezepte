import { useParams } from "react-router-dom";
import RecipeForm from "../../components/RecipeForm/RecipeForm";
import { useRecipe } from "../../hooks/useRecipe";

const EditRecipePage = ({ categories }) => {
  const { slug } = useParams();
  const { recipe, loading } = useRecipe(slug);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!recipe) {
    return <div>Recipe not found</div>;
  }

  return (
    <RecipeForm
      categories={categories}
      initialRecipe={recipe}
      title="Edit Recipe"
    />
  );
};

export default EditRecipePage;
