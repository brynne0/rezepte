import { useParams } from "react-router-dom";
import RecipeForm from "../components/RecipeForm/RecipeForm";
import { useRecipe } from "../hooks/useRecipe";
import { useTranslation } from "react-i18next";

const EditRecipePage = ({ categories }) => {
  const { slug } = useParams();
  const { recipe, loading } = useRecipe(slug);
  const { t } = useTranslation();

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
      title={t("edit_recipe")}
    />
  );
};

export default EditRecipePage;
