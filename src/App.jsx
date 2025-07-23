import "./App.css";
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import RecipeList from "./components/RecipeList/RecipeList";
import Recipe from "./components/Recipe/Recipe";
import { useRecipes } from "./hooks/useRecipes";
import AddRecipePage from "./pages/AddRecipe";
import CategoryFilter from "./components/CategoryFilter/CategoryFilter";
import { Squirrel } from "lucide-react";
import EditRecipePage from "./pages/EditRecipe";
import { useTranslation } from "react-i18next";
import GroceryList from "./pages/GroceryList/GroceryList";
import AuthPage from "./pages/AuthPage/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";

function App() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loginMessage, setLoginMessage] = useState("");
  const { recipes, loading, refreshRecipes } = useRecipes();
  const [searchTerm, setSearchTerm] = useState("");
  const [language, setLanguage] = useState("en");
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState("");

  const categoryKeys = [
    "all",
    "baking",
    "dessert",
    "brunch",
    "dinner",
    "snacks",
    "staples",
  ];

  const categories = categoryKeys.map((key) => ({
    value: key,
    label: t(key),
  }));

  // Show loading screen
  if (loading) {
    return (
      <div className={"loading-animation"}>
        <Squirrel />
      </div>
    );
  }

  return (
    <div className="app">
      <Router>
        <Header
          language={language}
          setLanguage={setLanguage}
          setSelectedCategory={setSelectedCategory}
          setSearchTerm={setSearchTerm}
          setLoginMessage={setLoginMessage}
          loginMessage={loginMessage}
          refreshRecipes={refreshRecipes}
          setDisplayName={setDisplayName}
          displayName={displayName}
          t={t}
        />
        <Routes>
          <Route
            path="/"
            element={
              <>
                <CategoryFilter
                  categories={categories}
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
          <Route path="/:id/:slug" element={<Recipe />} />
          <Route
            path="/add-recipe"
            element={<AddRecipePage categories={categories} />}
          />
          <Route
            path="/edit-recipe/:id/:slug"
            element={<EditRecipePage categories={categories} />}
          />

          <Route path="/grocery-list" element={<GroceryList />} />
          <Route
            path="/auth-page"
            element={
              <AuthPage
                setLoginMessage={setLoginMessage}
                refreshRecipes={refreshRecipes}
                setDisplayName={setDisplayName}
              />
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
