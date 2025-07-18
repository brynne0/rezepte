import RecipeForm from "../components/RecipeForm/RecipeForm";
import { useTranslation } from "react-i18next";

const AddRecipePage = ({ categories }) => {
  const { t } = useTranslation();
  return <RecipeForm categories={categories} title={t("add_new_recipe")} />;
};

export default AddRecipePage;
