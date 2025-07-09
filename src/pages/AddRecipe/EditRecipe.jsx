import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import RecipeForm from "../../components/RecipeForm/RecipeForm";
import { useRecipeActions } from "../../hooks/useRecipeActions";

const EditRecipePage = ({ categories }) => {
  const { slug } = useParams();
  const { getRecipe, loading } = useRecipeActions();
  const [recipe, setRecipe] = useState(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        console.log("Fetching recipe with slug:", slug); // Log the slug
        const recipeData = await getRecipe(slug);
        console.log("Fetched recipe data:", recipeData); // Log the result
        setRecipe(recipeData);
      } catch (error) {
        console.error("Failed to fetch recipe:", error);
      }
    };

    if (slug) {
      console.log(slug);
      fetchRecipe();
    }
  }, [slug]);

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
