// React & hooks
import { useState, useEffect, useRef, useContext } from "react";

// Data hooks
import { useRecipesPagination } from "./hooks/data/useRecipesPagination";
import { useAuth } from "./hooks/data/useAuth";
import { useCategories } from "./hooks/data/useCategories";
import { readCachedValue, writeCachedValue } from "./utils/localStorageCache";

// Routing
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useLocation,
  Navigate,
} from "react-router-dom";

// i18n
import { useTranslation } from "react-i18next";

// Hooks
import { useOnlineStatus } from "./hooks/ui/useOnlineStatus";

// Components
import { Toaster } from "@/components/ui/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MainScrollProvider } from "./contexts/MainScrollContext";
import { AppStateContext } from "./contexts/AppStateContext";
import { useMainScrollRef } from "./hooks/ui/useMainScrollRef";
import Header from "./components/Header/Header";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import RouteError from "./components/RouteError/RouteError";

// Features
import Home from "./features/Home/Home";
import AddRecipePage from "./features/AddRecipe/AddRecipe";
import EditRecipePage from "./features/EditRecipe/EditRecipe";
import CookingTimes from "./features/CookingTimes/CookingTimes";
import Auth from "./features/Auth/Auth";
import Recipe from "./features/Recipe/Recipe";
import ForgotPassword from "./features/ForgotPassword/ForgotPassword";
import ChangePassword from "./features/ChangePassword/ChangePassword";
import ChangeEmail from "./features/ChangeEmail/ChangeEmail";
import Settings from "./features/Settings/Settings";
import FriendRecipes from "./features/FriendRecipes/FriendRecipes";

function HomeRoute() {
  return (
    <ProtectedRoute>
      <Home />
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
      <ChangeEmail />
    </ProtectedRoute>
  );
}

function SettingsRoute() {
  const { setSelectedCategory } = useContext(AppStateContext);
  return (
    <ProtectedRoute>
      <Settings
        resetCategoryFilter={() => setSelectedCategory("all_recipes")}
      />
    </ProtectedRoute>
  );
}

function Layout() {
  const { t, isCookingTimesEditing, setIsCookingTimesEditing, friendBar } =
    useContext(AppStateContext);
  const location = useLocation();
  const mainScrollRef = useMainScrollRef();
  const isCookingTimesPage = location.pathname === "/cooking-times";
  const isOnline = useOnlineStatus();

  // Reset cooking times editing state when leaving the cooking times page
  useEffect(() => {
    if (!isCookingTimesPage && isCookingTimesEditing) {
      setIsCookingTimesEditing(false);
    }
  }, [isCookingTimesPage, isCookingTimesEditing, setIsCookingTimesEditing]);

  return (
    <>
      <Header
        t={t}
        disableLanguageSwitch={isCookingTimesEditing}
        friendBar={friendBar}
      />
      {!isOnline && (
        <Alert variant="destructive" className="rounded-none border-x-0">
          <AlertDescription>{t("no_internet_connection")}</AlertDescription>
        </Alert>
      )}
      <ScrollArea
        className="min-h-0 flex-1"
        viewportClassName="pb-8"
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
  const { t, i18n } = useTranslation();
  const { isLoggedIn } = useAuth();
  const mainScrollRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState("all_recipes");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState(
    () => readCachedValue("recipe_sort_preference") ?? "last_viewed_at_desc"
  );
  const [showImages, setShowImages] = useState(
    () => readCachedValue("show_images_preference") ?? false
  );
  const [isCookingTimesEditing, setIsCookingTimesEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [friendBar, setFriendBar] = useState(null);

  // Remove the static HTML splash once React has mounted and painted
  useEffect(() => {
    document.getElementById("splash")?.remove();
  }, []);

  // Apply the language requested by an auth email link (e.g. ?lang=de), then
  // drop the param so it doesn't linger in the address bar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("lang");
    if (lang && ["en", "de"].includes(lang)) {
      i18n.changeLanguage(lang);
      params.delete("lang");
      const query = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (query ? `?${query}` : "")
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeCachedValue("recipe_sort_preference", sortBy);
  }, [sortBy]);

  useEffect(() => {
    writeCachedValue("show_images_preference", showImages);
  }, [showImages]);

  const { recipes, isFetchingRecipes, totalRecipeCount, paginationInfo } =
    useRecipesPagination(
      currentPage,
      36,
      selectedCategory,
      searchTerm,
      sortBy,
      isLoggedIn
    );

  // Categories from database
  const { categories } = useCategories();

  // Clear search/filter/paging state on logout
  useEffect(() => {
    if (!isLoggedIn) {
      setSearchTerm("");
      setSelectedCategory("all_recipes");
      setCurrentPage(1);
    }
  }, [isLoggedIn]);

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
        errorElement: <RouteError />,
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
          { path: "/cooking-times", element: <CookingTimesRoute /> },
          { path: "/login", element: <Auth /> },
          { path: "/forgot-password", element: <ForgotPassword /> },
          { path: "/change-password", element: <ChangePassword /> },
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
        ].map((route) =>
          route.path === "*"
            ? route
            : { ...route, errorElement: <RouteError /> }
        ),
      },
    ])
  );

  const appStateValue = {
    setSelectedCategory: handleCategoryChange,
    setSearchTerm: handleSearchChange,
    sortBy,
    setSortBy,
    showImages,
    setShowImages,
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
