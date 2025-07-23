import "./App.css";
import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
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
import ChangePasswordPage from "./pages/ChangePasswordPage/ChangePasswordPage";
import { useAuth } from "./hooks/useAuth";

function App() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loginMessage, setLoginMessage] = useState("");
  const { recipes, loading, refreshRecipes } = useRecipes();
  const [searchTerm, setSearchTerm] = useState("");
  const [language, setLanguage] = useState("en");
  const { t } = useTranslation();

  // Categories
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
        <AppRoutes
          language={language}
          setLanguage={setLanguage}
          setSelectedCategory={setSelectedCategory}
          setSearchTerm={setSearchTerm}
          setLoginMessage={setLoginMessage}
          loginMessage={loginMessage}
          refreshRecipes={refreshRecipes}
          t={t}
          categories={categories}
          selectedCategory={selectedCategory}
          recipes={recipes}
          searchTerm={searchTerm}
        />
      </Router>
    </div>
  );
}

function AppRoutes(props) {
  const location = useLocation();
  const { refreshRecipes } = props;
  const { isLoggedIn } = useAuth();

  // Refresh recipes when navigating to home page
  useEffect(() => {
    if (location.pathname === "/") {
      refreshRecipes();
    }
  }, [location.pathname, refreshRecipes]);

  // Refresh recipes when login state changes
  useEffect(() => {
    refreshRecipes();
  }, [isLoggedIn, refreshRecipes]);

  return (
    <>
      <Header
        language={props.language}
        setLanguage={props.setLanguage}
        setSelectedCategory={props.setSelectedCategory}
        setSearchTerm={props.setSearchTerm}
        setLoginMessage={props.setLoginMessage}
        loginMessage={props.loginMessage}
        refreshRecipes={props.refreshRecipes}
        t={props.t}
      />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <CategoryFilter
                categories={props.categories}
                selectedCategory={props.selectedCategory}
                setSelectedCategory={props.setSelectedCategory}
                setSearchTerm={props.setSearchTerm}
              />
              <RecipeList
                selectedCategory={props.selectedCategory}
                recipes={props.recipes}
                searchTerm={props.searchTerm}
              />
            </>
          }
        />
        <Route path="/:id/:slug" element={<Recipe />} />
        <Route
          path="/add-recipe"
          element={<AddRecipePage categories={props.categories} />}
        />
        <Route
          path="/edit-recipe/:id/:slug"
          element={<EditRecipePage categories={props.categories} />}
        />
        <Route path="/grocery-list" element={<GroceryList />} />
        <Route
          path="/auth-page"
          element={<AuthPage setLoginMessage={props.setLoginMessage} />}
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Routes>
    </>
  );
}

export default App;
