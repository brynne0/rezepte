import { useTranslation } from "react-i18next";
import RecipeForm from "../../components/RecipeForm/RecipeForm";

const AddRecipePage = ({ categories }) => {
  const { t } = useTranslation();
  return <RecipeForm categories={categories} title={t("add_new_recipe")} />;
};

export default AddRecipePage;
