import RecipeForm from "../../components/RecipeForm/RecipeForm";

const AddRecipePage = ({ categories }) => {
  return <RecipeForm categories={categories} title="Add New Recipe" />;
};

export default AddRecipePage;
