import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import { fetchRecipes } from "../../services/recipes";
import { getTranslatedRecipeTitle } from "../../services/translationService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const RecipeLinkDropdown = ({
  isOpen,
  onClose,
  onSelectRecipe,
  currentRecipeId,
}) => {
  const { t, i18n } = useTranslation();
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchRecipes()
        .then(async (recipeList) => {
          // Filter out current recipe to prevent self-linking
          const filteredList = recipeList.filter(
            (recipe) => recipe.id !== currentRecipeId
          );

          // Translate recipe titles for current language (like home page does)
          const currentLanguage = i18n.language.split("-")[0]; // Normalize region codes
          const translatedRecipes = await Promise.all(
            filteredList.map((recipe) =>
              getTranslatedRecipeTitle(recipe, currentLanguage)
            )
          );

          setRecipes(translatedRecipes);
          setFilteredRecipes(translatedRecipes);
        })
        .catch((error) => {
          console.error("Error fetching recipes:", error);
        })
        .finally(() => {
          setLoading(false);
        });

      // Focus search input when dropdown opens
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    } else {
      // Reset state when closed
      setSearchTerm("");
      setRecipes([]);
      setFilteredRecipes([]);
    }
  }, [isOpen, currentRecipeId, i18n.language]);

  useEffect(() => {
    // Filter recipes based on search term
    if (searchTerm.trim() === "") {
      setFilteredRecipes(recipes);
    } else {
      const filtered = recipes.filter((recipe) =>
        recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRecipes(filtered);
    }
  }, [searchTerm, recipes]);

  const handleRecipeSelect = (recipe) => {
    onSelectRecipe(recipe);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("link_to_recipe")}</DialogTitle>
        </DialogHeader>

        <InputGroup>
          <InputGroupAddon>
            <Search size={16} />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("search_recipes")}
          />
        </InputGroup>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {loading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {t("loading_recipes")}
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {searchTerm
                ? t("no_recipes_found", { searchTerm })
                : t("no_recipes_available")}
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => handleRecipeSelect(recipe)}
                className="rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                {recipe.title}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecipeLinkDropdown;
