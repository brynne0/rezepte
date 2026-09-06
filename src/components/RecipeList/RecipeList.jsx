import { useNavigate } from "react-router-dom";
import { ChefHat, LogIn } from "lucide-react";
import RecipeCard from "../RecipeCard/RecipeCard";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/data/useAuth";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
} from "@/components/ui/empty";

const RecipeList = ({
  selectedCategory,
  recipes,
  searchTerm,
  showImages = true,
  totalRecipeCount = 0,
  isPaginated = false,
  loading = false,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();

  // If using pagination, recipes are already filtered on the server side
  // Otherwise, apply client-side filtering for backward compatibility
  const filteredRecipes = isPaginated
    ? recipes
    : (() => {
        // First filter by search term if it exists
        const searchFilteredRecipes = searchTerm
          ? recipes.filter((recipe) =>
              recipe.title?.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : recipes;

        // Then filter by category (only if not searching or if all recipes are selected)
        return searchTerm
          ? searchFilteredRecipes // When searching, show all search results regardless of category
          : selectedCategory === "all_recipes"
            ? recipes
            : recipes.filter((r) => r.category === selectedCategory);
      })();

  return (
    <>
      {/* Display all recipes in selected category */}
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
        {filteredRecipes.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            showImages={showImages}
            onClick={() => {
              navigate(`/${r.id}/${r.slug}`);
            }}
          />
        ))}
      </div>
      {filteredRecipes.length === 0 && searchTerm && (
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyTitle>{t("no_recipes_found", { searchTerm })}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
      {totalRecipeCount === 0 && !searchTerm && !loading && (
        <Empty className="mx-auto mt-40 w-fit border border-primary bg-card shadow-sm">
          <EmptyHeader>
            <EmptyTitle>
              {isLoggedIn
                ? t("welcome_add_recipe")
                : `${t("logged_in_note_link")}${t("logged_in_note_suffix")}`}
            </EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button
              size="sm"
              onClick={() =>
                navigate(isLoggedIn ? "/add-recipe" : "/auth-page")
              }
            >
              {isLoggedIn ? <ChefHat /> : <LogIn />}
              {isLoggedIn ? t("add_new_recipe") : t("login")}
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </>
  );
};

export default RecipeList;
