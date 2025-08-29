import "../src/styles/App.css";

// React & hooks
import { useState, useEffect } from "react";

// Data hooks
import { useRecipesPagination } from "./hooks/data/useRecipesPagination";
import { useAuth } from "./hooks/data/useAuth";
import { useCategories } from "./hooks/data/useCategories";

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
import Pagination from "./components/Pagination/Pagination";
import { Squirrel } from "lucide-react";

// Pages
import AddRecipePage from "./pages/AddRecipe/AddRecipe";
import EditRecipePage from "./pages/EditRecipe/EditRecipe";
import GroceryList from "./pages/GroceryList/GroceryList";
import AuthPage from "./pages/AuthPage/AuthPage";
import Recipe from "./pages/Recipe/Recipe";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";
import ChangePasswordPage from "./pages/ChangePasswordPage/ChangePasswordPage";
import AccountSettings from "./pages/AccountSettings/AccountSettings";

function App() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("title_asc");
  const [showImages, setShowImages] = useState(() => {
    const stored = localStorage.getItem("showImages");
    return stored !== null ? JSON.parse(stored) : true;
  });
  const [loginMessage, setLoginMessage] = useState("");
  const [isGroceryListEditing, setIsGroceryListEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { recipes, loading, refreshRecipes, paginationInfo } =
    useRecipesPagination(currentPage, 36, selectedCategory, searchTerm, sortBy);

  // Categories from database
  const { categories, loading: categoriesLoading } = useCategories();

  // Show loading screen only for home page where recipes and categories are needed
  const location = window.location;
  const isHomePage = location.pathname === "/";

  if (isHomePage && (loading || categoriesLoading)) {
    return (
      <div className="loading-squirrel">
        <Squirrel />
      </div>
    );
  }

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page when changing category
  };

  const handleSearchChange = (search) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  return (
    <div className="app">
      <Router>
        <AppRoutes
          setSelectedCategory={handleCategoryChange}
          setSearchTerm={handleSearchChange}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showImages={showImages}
          setShowImages={setShowImages}
          setLoginMessage={setLoginMessage}
          loginMessage={loginMessage}
          t={t}
          categories={categories}
          selectedCategory={selectedCategory}
          recipes={recipes}
          searchTerm={searchTerm}
          loading={loading}
          isGroceryListEditing={isGroceryListEditing}
          setIsGroceryListEditing={setIsGroceryListEditing}
          currentPage={currentPage}
          paginationInfo={paginationInfo}
          onPageChange={handlePageChange}
          refreshRecipes={refreshRecipes}
          isLoggedIn={isLoggedIn}
        />
      </Router>
    </div>
  );
}

function AppRoutes(props) {
  const location = useLocation();
  const {
    refreshRecipes,
    isGroceryListEditing,
    setIsGroceryListEditing,
    showImages,
    isLoggedIn,
  } = props;
  const isGroceryListPage = location.pathname === "/grocery-list";

  // Reset grocery list editing state when leaving the grocery list page
  useEffect(() => {
    if (!isGroceryListPage && isGroceryListEditing) {
      setIsGroceryListEditing(false);
    }
  }, [isGroceryListPage, isGroceryListEditing, setIsGroceryListEditing]);

  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

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

  // Persist showImages preference to localStorage
  useEffect(() => {
    localStorage.setItem("showImages", JSON.stringify(showImages));
  }, [showImages]);

  // Scroll to top on all navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <Header
        setSelectedCategory={props.setSelectedCategory}
        setSearchTerm={props.setSearchTerm}
        searchTerm={props.searchTerm}
        setLoginMessage={props.setLoginMessage}
        loginMessage={props.loginMessage}
        t={props.t}
        disableLanguageSwitch={isGroceryListEditing}
        sortBy={props.sortBy}
        setSortBy={props.setSortBy}
        showImages={props.showImages}
        setShowImages={props.setShowImages}
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
                showImages={props.showImages}
                isPaginated={true}
              />
              <Pagination
                currentPage={props.paginationInfo.currentPage}
                totalPages={props.paginationInfo.totalPages}
                onPageChange={props.onPageChange}
                hasNextPage={props.paginationInfo.hasNextPage}
                hasPrevPage={props.paginationInfo.hasPrevPage}
              />
            </>
          }
        />
        <Route path="/:id/:slug" element={<Recipe />} />
        <Route
          path="/shared/:shareToken/:slug?"
          element={<Recipe isSharedView={true} />}
        />
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
        <Route path="/account-settings" element={<AccountSettings />} />
      </Routes>
    </>
  );
}

export default App;
