import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRecipe } from "../hooks/data/useRecipe";
import RecipeForm from "../components/RecipeForm/RecipeForm";
import LoadingAcorn from "../components/LoadingAcorn/LoadingAcorn";

const EditRecipePage = ({ categories }) => {
  const { id } = useParams();
  const { recipe, loading } = useRecipe(id);
  const { t, i18n } = useTranslation();

  // Switch to recipe's original language when recipe loads
  useEffect(() => {
    if (
      recipe &&
      recipe.original_language &&
      recipe.original_language !== i18n.language
    ) {
      i18n.changeLanguage(recipe.original_language);
    }
  }, [recipe, i18n]);

  if (loading) {
    return <LoadingAcorn />;
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
