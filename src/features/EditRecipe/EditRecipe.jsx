import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";
import { useRecipe } from "../../hooks/data/useRecipe";
import { useOnlineStatus } from "../../hooks/ui/useOnlineStatus";
import RecipeForm from "../../components/RecipeForm/RecipeForm";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const EditRecipePage = ({ categories }) => {
  const { id } = useParams();
  const { recipe, loading } = useRecipe(id);
  const { t, i18n } = useTranslation();
  const isOnline = useOnlineStatus();
  const originalUserLanguage = useRef(null);
  const [isEditingTranslation, setIsEditingTranslation] = useState(false);

  // Determine if editing a recipe translation
  useEffect(() => {
    if (
      recipe &&
      recipe.original_language &&
      recipe.original_language !== i18n.language.split("-")[0] // Normalize region codes
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
    if (!isOnline) {
      return (
        <Empty className="mt-20">
          <EmptyHeader>
            <EmptyMedia>
              <WifiOff />
            </EmptyMedia>
            <EmptyTitle>{t("recipe_unavailable_offline")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      );
    }
    return <div>{t("recipe_not_found")}</div>;
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
