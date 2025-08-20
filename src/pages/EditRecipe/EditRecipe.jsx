import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRecipe } from "../../hooks/data/useRecipe";
import RecipeForm from "../../components/RecipeForm/RecipeForm";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";

const EditRecipePage = ({ categories }) => {
  const { id } = useParams();
  const { recipe, loading } = useRecipe(id);
  const { t, i18n } = useTranslation();
  const originalUserLanguage = useRef(null);
  const [isEditingTranslation, setIsEditingTranslation] = useState(false);

  // Determine if editing a recipe translation
  useEffect(() => {
    if (
      recipe &&
      recipe.original_language &&
      recipe.original_language !== i18n.language
    ) {
      setIsEditingTranslation(true);
      originalUserLanguage.current = i18n.language;
    } else {
      setIsEditingTranslation(false);
    }
  }, [recipe, i18n]);

  // Restore user's original language when component unmounts
  useEffect(() => {
    return () => {
      if (
        originalUserLanguage.current &&
        originalUserLanguage.current !== i18n.language
      ) {
        i18n.changeLanguage(originalUserLanguage.current);
      }
    };
  }, [i18n]);

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
      isEditingTranslation={isEditingTranslation}
    />
  );
};

export default EditRecipePage;
