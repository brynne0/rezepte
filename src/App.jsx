import "./App.css";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import RecipeList from "./components/RecipeList/RecipeList";
import Recipe from "./components/Recipe/Recipe";
import { useRecipes } from "./hooks/useRecipes";
import AddRecipePage from "./pages/AddRecipe/AddRecipe";
import CategoryFilter from "./components/CategoryFilter/CategoryFilter";
import { Squirrel } from "lucide-react";
import EditRecipePage from "./pages/AddRecipe/EditRecipe";
import { useTranslation } from "react-i18next";

function App() {
  const [selectedCategory, setSelectedCategory] = useState("Alle Rezepte");
  const { recipes, loading } = useRecipes();
  const [searchTerm, setSearchTerm] = useState("");
  const [language, setLanguage] = useState("en");
  const { t } = useTranslation();

  const categories = [
    "all recipes",
    "baking",
    "dessert",
    "brunch",
    "dinner",
    "snacks",
    "staples",
  ];

  // Show loading screen
  if (loading) {
    return (
      <div className={"loading-animation"}>
        <Squirrel />
      </div>
    );
  }

  return (
    <Router>
      <Header language={language} setLanguage={setLanguage} t={t} />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <CategoryFilter
                categories={categories.map((cat) => t(cat))}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                setSearchTerm={setSearchTerm}
              />
              <RecipeList
                selectedCategory={selectedCategory}
                recipes={recipes}
                searchTerm={searchTerm}
              />
            </>
          }
        />
        <Route path="/:slug" element={<Recipe />} />
        <Route
          path="/add-recipe"
          element={
            <AddRecipePage categories={categories.map((cat) => t(cat))} />
          }
        />
        <Route
          path="/edit-recipe/:slug"
          element={
            <EditRecipePage categories={categories.map((cat) => t(cat))} />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
