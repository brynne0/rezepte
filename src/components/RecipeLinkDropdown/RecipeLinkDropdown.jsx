import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import { fetchRecipes } from "../../services/recipes";
import "./RecipeLinkDropdown.css";

const RecipeLinkDropdown = ({
  isOpen,
  onClose,
  onSelectRecipe,
  currentRecipeId,
}) => {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchRecipes()
        .then((recipeList) => {
          // Filter out current recipe to prevent self-linking
          const filteredList = recipeList.filter(
            (recipe) => recipe.id !== currentRecipeId
          );
          setRecipes(filteredList);
          setFilteredRecipes(filteredList);
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
  }, [isOpen, currentRecipeId]);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRecipeSelect = (recipe) => {
    onSelectRecipe(recipe);
    onClose();
  };

  return (
    <div className="recipe-link-dropdown-overlay">
      <div className="recipe-link-dropdown" ref={dropdownRef}>
        <div className="recipe-link-dropdown-header">
          <h2 className="forta-red">{t("link_to_recipe")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-icon btn-icon-neutral btn-icon-right"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="recipe-search-container">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("search_recipes")}
              className="input input--full-width recipe-search-input"
            />
          </div>
        </div>

        <div className="recipe-list-container">
          {loading ? (
            <div className="recipe-loading">Loading recipes...</div>
          ) : filteredRecipes.length === 0 ? (
            <div>
              {/* TODO - add to locale files - more in this file  */}
              {searchTerm
                ? "No recipes found matching your search."
                : "No recipes available."}
            </div>
          ) : (
            <div className="flex-column">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  className="recipe-item"
                  onClick={() => handleRecipeSelect(recipe)}
                >
                  <span className="bold-small">{recipe.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeLinkDropdown;
