import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Plus,
  Squirrel,
  Menu,
  User,
  Sun,
  Moon,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import FriendsDropdown from "../FriendsDropdown/FriendsDropdown";
import { signOut, getFirstName } from "../../services/auth";
import { useAuth } from "../../hooks/data/useAuth";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/ui/useTheme";
import { useInstallPrompt } from "../../hooks/ui/useInstallPrompt";
import ConfirmationModal from "../ConfirmationModal/ConfirmationModal";
import SortButtons from "../SortButtons/SortButtons";
import "./Header.css";

const Header = ({
  setSelectedCategory,
  setSearchTerm,
  searchTerm,
  disableLanguageSwitch = false,
  sortBy,
  setSortBy,
  showImages,
  setShowImages,
  onPageReset,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isLoggedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { installPrompt, isIOS, triggerInstall } = useInstallPrompt();

  const [showInstallModal, setShowInstallModal] = useState(false);

  // Show install modal once when prompt is available (or on iOS), and user is
  // logged in, unless previously dismissed
  useEffect(() => {
    if (
      (installPrompt || isIOS) &&
      isLoggedIn &&
      localStorage.getItem("pwa-install-dismissed") !== "true"
    ) {
      setShowInstallModal(true);
    }
  }, [installPrompt, isIOS, isLoggedIn]);

  const handleDismissInstall = () => {
    setShowInstallModal(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  const handleConfirmInstall = () => {
    setShowInstallModal(false);
    triggerInstall();
  };

  // Hide search bar on all pages except home
  const isHomePage = location.pathname === "/";

  const [showNavMenu, setShowNavMenu] = useState(false);
  const [currentSearchInput, setCurrentSearchInput] = useState("");

  // Language
  const { t, i18n } = useTranslation();

  // Display name
  const [firstName, setFirstName] = useState("");

  // Load display name on app startup
  useEffect(() => {
    const loadfirstName = async () => {
      const name = await getFirstName();
      if (name) {
        setFirstName(name);
      }
    };

    if (isLoggedIn) {
      loadfirstName();
    } else {
      setFirstName("");
    }
  }, [isLoggedIn, setFirstName]);

  // Sync search input with external search term changes
  useEffect(() => {
    setCurrentSearchInput(searchTerm || "");
  }, [searchTerm]);

  const handleLogout = async () => {
    await signOut();

    setFirstName("");
    setSearchTerm("");
    navigate("/");
  };

  // Language toggle
  const LanguageSelector = ({ className = "", onLanguageChange = null }) => {
    const nextLanguage = i18n.language === "en" ? "de" : "en";
    return (
      <Button
        variant="ghost"
        onClick={() => {
          if (!disableLanguageSwitch) {
            i18n.changeLanguage(nextLanguage);
            if (onLanguageChange) onLanguageChange();
          }
        }}
        disabled={disableLanguageSwitch}
        className={`language ${className}`}
        aria-label={
          nextLanguage === "en" ? t("switch_to_english") : t("switch_to_german")
        }
      >
        {nextLanguage.toUpperCase()}
      </Button>
    );
  };

  // Theme toggle
  const getThemeIcon = () => {
    return theme === "light" ? <Moon /> : <Sun />;
  };

  const ThemeToggle = () => (
    <Button
      variant="ghost"
      onClick={() => toggleTheme()}
      aria-label={theme === "light" ? t("theme_dark") : t("theme_light")}
    >
      {getThemeIcon()}
    </Button>
  );

  // Shared user dropdown menu
  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            disabled={location.pathname === "/auth-page"}
            aria-label={isLoggedIn ? t("user_menu") : t("login")}
          >
            <User className="size-7" />
          </Button>
        }
      />
      <DropdownMenuContent align="center">
        {isLoggedIn ? (
          <>
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              {t("settings")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              {t("logout")}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onClick={() => navigate("/auth-page")}>
            {t("login")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <header className="relative flex-between py-2 bg-background z-50">
        {/* Language and Theme Selection */}
        <div className="flex shrink-0 items-center">
          <Squirrel className="hidden md:block md:size-14 md:pr-4" />
          <LanguageSelector />
          <ThemeToggle />
        </div>

        {/* Title */}
        <div className="absolute inset-0 m-auto flex h-max w-max flex-col items-center">
          {/* Display user's first name above header */}
          {firstName && (
            <span className="text-sm leading-none md:text-base">{`${firstName}'s`}</span>
          )}
          <Button
            variant="ghost"
            className="h-auto select-none p-0 font-forta text-3xl leading-none text-foreground transition-none hover:bg-transparent active:translate-y-0 md:text-5xl"
            onClick={() => {
              navigate("/");
            }}
            aria-label={t("go_to_home")}
          >
            Rezepte
          </Button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 md:flex">
          {/* Desktop User Icon */}
          <UserMenu />

          {/* Only display if user logged in */}
          {isLoggedIn && (
            <>
              <FriendsDropdown />
              <Button
                data-testid="lucide-plus"
                variant="ghost"
                size="icon-lg"
                onClick={() => navigate("/add-recipe")}
                aria-label={t("add_new_recipe")}
              >
                <Plus className="size-7" />
              </Button>
              {/* Cooking Times */}
              <Button
                data-testid="lucide-clock"
                variant="ghost"
                size="icon-lg"
                onClick={() => navigate("/cooking-times")}
                aria-label={t("cooking_times", "Cooking Times")}
              >
                <Clock className="size-7" />
              </Button>
              {/* Grocery List */}
              {/* <button
                  data-testid="lucide-shopping-basket"
                  className={`btn btn-icon btn-icon-neutral ${
                    location.pathname === "/grocery-list" ? "selected" : ""
                  }`}
                  onClick={() => navigate("/grocery-list")}
                  aria-label={t("grocery_list")}
                >
                  <ShoppingBasket size={28} />
                </button> */}
            </>
          )}
        </nav>

        {/* Mobile User and Menu Icons */}
        <div className="flex items-center md:hidden">
          {/* Mobile User Icon */}
          <UserMenu />

          {/* Hamburger Menu */}
          <DropdownMenu open={showNavMenu} onOpenChange={setShowNavMenu}>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-lg" aria-label="Menu">
                  <Menu className="size-7" />
                </Button>
              }
            />
            <DropdownMenuContent align="center" className="overflow-visible">
              {/* Navigation options for logged in users */}
              {isLoggedIn && (
                <>
                  <div className="dropdown-item">
                    <FriendsDropdown onNavigate={() => setShowNavMenu(false)} />
                  </div>
                  <DropdownMenuItem
                    onClick={() => navigate("/add-recipe")}
                    aria-label={t("add_new_recipe")}
                  >
                    <Plus className="size-5" />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/cooking-times")}
                    aria-label={t("cooking_times", "Cooking Times")}
                  >
                    <Clock className="size-5" />
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/*  Search Recipe - Always visible on home page  */}
      {isHomePage && (
        <div className="search-bar-wrapper">
          <div className="search-and-sort-container">
            <form
              className="search-bar"
              onSubmit={(e) => {
                e.preventDefault();
                setSearchTerm(currentSearchInput);
                navigate("/");
              }}
            >
              <div className="search-input-wrapper">
                <input
                  id="search"
                  type="text"
                  value={currentSearchInput}
                  onChange={(e) => {
                    setCurrentSearchInput(e.target.value);
                    setSearchTerm(e.target.value);
                    if (e.target.value.length > 0) {
                      setSelectedCategory("all_recipes");
                    }
                  }}
                  className="input input--secondary search-input-with-icon"
                  placeholder={t("search")}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="btn-search"
                  type="submit"
                  aria-label={t("search")}
                >
                  <Search />
                </Button>
              </div>
            </form>
            {setSortBy && (
              <SortButtons
                sortBy={sortBy}
                onSortChange={setSortBy}
                showImages={showImages}
                onShowImagesChange={setShowImages}
                onPageReset={onPageReset}
                isLoggedIn={isLoggedIn}
              />
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showInstallModal}
        onClose={handleDismissInstall}
        onConfirm={isIOS ? handleDismissInstall : handleConfirmInstall}
        title={t("install_app")}
        message={isIOS ? t("install_app_ios") : t("install_app_prompt")}
        confirmText={isIOS ? t("got_it") : t("install_app")}
        cancelText={t("maybe_later")}
        confirmButtonType="primary"
      />
    </>
  );
};

export default Header;
