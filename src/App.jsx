// React & hooks
import { useState, useEffect, useRef, useContext } from "react";

// Data hooks
import { useRecipesPagination } from "./hooks/data/useRecipesPagination";
import { useAuth } from "./hooks/data/useAuth";
import { useCategories } from "./hooks/data/useCategories";

// Routing
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";

// i18n
import { useTranslation } from "react-i18next";

// Hooks
import { useOnlineStatus } from "./hooks/ui/useOnlineStatus";

// Components
import { Toaster, toast } from "@/components/ui/toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MainScrollProvider } from "./contexts/MainScrollContext";
import { AppStateContext } from "./contexts/AppStateContext";
import { useMainScrollRef } from "./hooks/ui/useMainScrollRef";
import Header from "./components/Header/Header";
import RecipeFilters from "./components/RecipeFilters/RecipeFilters";
import RecipeList from "./components/RecipeList/RecipeList";
import Pagination from "./components/Pagination/Pagination";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import { Squirrel } from "lucide-react";

// Pages
import AddRecipePage from "./pages/AddRecipe/AddRecipe";
import EditRecipePage from "./pages/EditRecipe/EditRecipe";
import CookingTimes from "./pages/CookingTimes/CookingTimes";
import AuthPage from "./pages/AuthPage/AuthPage";
import Recipe from "./pages/Recipe/Recipe";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";
import ChangePasswordPage from "./pages/ChangePasswordPage/ChangePasswordPage";
import ChangeEmailPage from "./pages/ChangeEmailPage/ChangeEmailPage";
import Settings from "./pages/Settings/Settings";
import FriendRecipes from "./pages/FriendRecipes/FriendRecipes";
import ShowcasePage from "./pages/ShowcasePage/ShowcasePage";

function HomePage() {
  const {
    categories,
    selectedCategory,
    setSelectedCategory,
    setSearchTerm,
    recipes,
    searchTerm,
    sortBy,
    setSortBy,
    showImages,
    setShowImages,
    onPageReset,
    totalRecipeCount,
    isFetchingRecipes,
    paginationInfo,
    onPageChange,
  } = useContext(AppStateContext);
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();

  return (
    <>
      {isOnline && (
        <RecipeFilters
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSearchSubmit={() => navigate("/")}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showImages={showImages}
          setShowImages={setShowImages}
          onPageReset={onPageReset}
        />
      )}
      <RecipeList
        selectedCategory={selectedCategory}
        recipes={recipes}
        searchTerm={searchTerm}
        showImages={showImages}
        totalRecipeCount={totalRecipeCount}
        isPaginated={true}
        loading={isFetchingRecipes}
        isOnline={isOnline}
      />
      {isOnline && (
        <Pagination
          currentPage={paginationInfo.currentPage}
          totalPages={paginationInfo.totalPages}
          onPageChange={onPageChange}
          hasNextPage={paginationInfo.hasNextPage}
          hasPrevPage={paginationInfo.hasPrevPage}
        />
      )}
    </>
  );
}

function HomeRoute() {
  return (
    <ProtectedRoute>
      <HomePage />
    </ProtectedRoute>
  );
}

function AddRecipeRoute() {
  const { categories } = useContext(AppStateContext);
  return (
    <ProtectedRoute>
      <AddRecipePage categories={categories} />
    </ProtectedRoute>
  );
}

function EditRecipeRoute() {
  const { categories } = useContext(AppStateContext);
  return (
    <ProtectedRoute>
      <EditRecipePage categories={categories} />
    </ProtectedRoute>
  );
}

function CookingTimesRoute() {
  const { isCookingTimesEditing, setIsCookingTimesEditing } =
    useContext(AppStateContext);
  return (
    <ProtectedRoute>
      <CookingTimes
        isEditMode={isCookingTimesEditing}
        setIsEditMode={setIsCookingTimesEditing}
      />
    </ProtectedRoute>
  );
}

function ChangeEmailRoute() {
  return (
    <ProtectedRoute>
      <ChangeEmailPage />
    </ProtectedRoute>
  );
}

function SettingsRoute() {
  const { refreshCategories } = useContext(AppStateContext);
  return (
    <ProtectedRoute>
      <Settings refreshCategories={refreshCategories} />
    </ProtectedRoute>
  );
}

function AuthPageRoute() {
  const { setLoginMessage } = useContext(AppStateContext);
  return <AuthPage setLoginMessage={setLoginMessage} />;
}

function Layout() {
  const {
    setLoginMessage,
    loginMessage,
    t,
    refreshRecipes,
    isCookingTimesEditing,
    setIsCookingTimesEditing,
    isLoggedIn,
    friendBar,
  } = useContext(AppStateContext);
  const location = useLocation();
  const mainScrollRef = useMainScrollRef();
  const isCookingTimesPage = location.pathname === "/cooking-times";
  const isOnline = useOnlineStatus();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  // Notify the user via toast when the connection drops
  useEffect(() => {
    if (!isOnline) {
      toast.add({
        title: t("no_internet_connection"),
        type: "error",
      });
    }
  }, [isOnline, t]);

  // Reset cooking times editing state when leaving the cooking times page
  useEffect(() => {
    if (!isCookingTimesPage && isCookingTimesEditing) {
      setIsCookingTimesEditing(false);
    }
  }, [isCookingTimesPage, isCookingTimesEditing, setIsCookingTimesEditing]);

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

  return (
    <>
      <Header
        setLoginMessage={setLoginMessage}
        loginMessage={loginMessage}
        t={t}
        disableLanguageSwitch={isCookingTimesEditing}
        friendBar={friendBar}
      />
      <ScrollArea
        className="min-h-0 flex-1"
        viewportClassName="pb-3 md:pb-8"
        viewportRef={mainScrollRef}
      >
        <div className="mx-auto w-full max-w-7xl px-3 pt-3 md:px-8 md:pt-4">
          <Outlet />
        </div>
      </ScrollArea>
    </>
  );
}

function App() {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const mainScrollRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState("all_recipes");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("last_viewed_at_desc");
  const [showImages, setShowImages] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [isCookingTimesEditing, setIsCookingTimesEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [friendBar, setFriendBar] = useState(null);
  const {
    recipes,
    loading,
    isFetchingRecipes,
    refreshRecipes,
    totalRecipeCount,
    paginationInfo,
  } = useRecipesPagination(
    currentPage,
    36,
    selectedCategory,
    searchTerm,
    sortBy,
    isLoggedIn
  );

  // Categories from database
  const {
    categories,
    loading: categoriesLoading,
    refreshCategories,
  } = useCategories();

  // Show loading screen only for home page where recipes and categories are needed
  const location = window.location;
  const isHomePage = location.pathname === "/";

  const handlePageChange = (page) => {
    setCurrentPage(page);
    mainScrollRef.current?.scrollTo(0, 0);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1); // Reset to first page when changing category
  };

  const handleSearchChange = (search) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageReset = () => {
    setCurrentPage(1);
  };

  const [router] = useState(() =>
    createBrowserRouter([
      {
        element: <Layout />,
        children: [
          { path: "/", element: <HomeRoute /> },
          {
            path: "/:id/:slug",
            element: (
              <ProtectedRoute>
                <Recipe />
              </ProtectedRoute>
            ),
          },
          { path: "/add-recipe", element: <AddRecipeRoute /> },
          { path: "/edit-recipe/:id/:slug", element: <EditRecipeRoute /> },
          // { path: "/cooking-times", element: <CookingTimesRoute /> },
          { path: "/showcase", element: <ShowcasePage /> },
          { path: "/login", element: <AuthPageRoute /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
          { path: "/change-password", element: <ChangePasswordPage /> },
          { path: "/change-email", element: <ChangeEmailRoute /> },
          { path: "/settings", element: <SettingsRoute /> },
          {
            path: "/friends/:username",
            element: (
              <ProtectedRoute>
                <FriendRecipes />
              </ProtectedRoute>
            ),
          },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ])
  );

  if (isHomePage && (loading || categoriesLoading)) {
    return (
      <div className="loading-squirrel">
        <Squirrel />
      </div>
    );
  }

  const appStateValue = {
    setSelectedCategory: handleCategoryChange,
    setSearchTerm: handleSearchChange,
    sortBy,
    setSortBy,
    showImages,
    setShowImages,
    setLoginMessage,
    loginMessage,
    t,
    categories,
    selectedCategory,
    recipes,
    totalRecipeCount,
    searchTerm,
    isFetchingRecipes,
    isCookingTimesEditing,
    setIsCookingTimesEditing,
    paginationInfo,
    onPageChange: handlePageChange,
    onPageReset: handlePageReset,
    refreshRecipes,
    refreshCategories,
    isLoggedIn,
    friendBar,
    setFriendBar,
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <MainScrollProvider value={mainScrollRef}>
        <AppStateContext.Provider value={appStateValue}>
          <RouterProvider router={router} />
        </AppStateContext.Provider>
      </MainScrollProvider>
      <Toaster />
    </div>
  );
}

export default App;
