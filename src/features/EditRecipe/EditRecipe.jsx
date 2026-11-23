import { useParams, useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const editOriginal = searchParams.get("original") === "1";
  const { recipe, loading, switching } = useRecipe(id, {
    original: editOriginal,
  });
  const { t, i18n } = useTranslation();
  const isOnline = useOnlineStatus();

  // A recipe in another language edits your translation, unless editing the original
  const recipeLanguage = recipe?.original_language || "en";
  const isForeignRecipe = recipeLanguage !== i18n.language.split("-")[0];
  const isEditingTranslation = !!recipe && isForeignRecipe && !editOriginal;

  // Wait for the other version rather than filling the form with the old one
  if (loading || switching) {
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
      key={editOriginal ? "original" : "translation"}
      categories={categories}
      initialRecipe={recipe}
      title={t("edit_recipe")}
      isEditingTranslation={isEditingTranslation}
      isEditingOriginal={editOriginal && isForeignRecipe}
      onSwitchEditVersion={(version) =>
        setSearchParams(version === "original" ? { original: "1" } : {}, {
          replace: true,
        })
      }
    />
  );
};

export default EditRecipePage;
