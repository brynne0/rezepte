import "../src/styles/App.css";

// React & hooks
import { useState, useEffect } from "react";

// Data hooks
import { useRecipes } from "./hooks/data/useRecipes";
import { useAuth } from "./hooks/data/useAuth";

// Routing
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

// i18n
import { useTranslation } from "react-i18next";

// Components
import Header from "./components/Header/Header";
import CategoryFilter from "./components/CategoryFilter/CategoryFilter";
import RecipeList from "./components/RecipeList/RecipeList";
import { Squirrel } from "lucide-react";

// Pages
import AddRecipePage from "./pages/AddRecipe/AddRecipe";
import EditRecipePage from "./pages/EditRecipe/EditRecipe";
import GroceryList from "./pages/GroceryList/GroceryList";
import AuthPage from "./pages/AuthPage/AuthPage";
import Recipe from "./pages/Recipe/Recipe";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";
import ChangePasswordPage from "./pages/ChangePasswordPage/ChangePasswordPage";

function App() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loginMessage, setLoginMessage] = useState("");
  const { recipes, loading, refreshRecipes } = useRecipes();
  const [searchTerm, setSearchTerm] = useState("");
  const [language, setLanguage] = useState("en");
  const [isGroceryListEditing, setIsGroceryListEditing] = useState(false);
  const { t } = useTranslation();

  // Categories
  const categoryKeys = [
    "all",
    "brunch",
    "dinner",
    "sides",
    "sauces",
    "snacks",
    "baking",
    "bread",
    "staples",
  ];

  const categories = categoryKeys.map((key) => ({
    value: key,
    label: t(key),
  }));

  // Show loading screen
  if (loading) {
    return (
      <div className={"loading-squirrel"}>
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
          loading={loading}
          isGroceryListEditing={isGroceryListEditing}
          setIsGroceryListEditing={setIsGroceryListEditing}
        />
      </Router>
    </div>
  );
}

function AppRoutes(props) {
  const location = useLocation();
  const { refreshRecipes, isGroceryListEditing, setIsGroceryListEditing } =
    props;
  const { isLoggedIn } = useAuth();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const isEditRecipePage = location.pathname.startsWith("/edit-recipe/");
  const isGroceryListPage = location.pathname === "/grocery-list";

  // Reset grocery list editing state when leaving the grocery list page
  useEffect(() => {
    if (!isGroceryListPage && isGroceryListEditing) {
      setIsGroceryListEditing(false);
    }
  }, [isGroceryListPage, isGroceryListEditing, setIsGroceryListEditing]);

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

  // Refresh recipes when language changes
  useEffect(() => {
    refreshRecipes();
  }, [currentLanguage, refreshRecipes]);

  // Scroll to top on all navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
        disableLanguageSwitch={isEditRecipePage || isGroceryListEditing}
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
        <Route
          path="/grocery-list"
          element={
            <GroceryList
              isEditing={isGroceryListEditing}
              setIsEditing={setIsGroceryListEditing}
            />
          }
        />
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
