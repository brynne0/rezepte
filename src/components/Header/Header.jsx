import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Plus,
  Squirrel,
  Menu,
  User,
  Users,
  Sun,
  Moon,
  Clock,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import FriendsPanel from "../FriendsPanel/FriendsPanel";
import { signOut, getFirstName } from "../../services/auth";
import { useAuth } from "../../hooks/data/useAuth";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/ui/useTheme";
import { useInstallPrompt } from "../../hooks/ui/useInstallPrompt";
import ConfirmationModal from "../ConfirmationModal/ConfirmationModal";
import SortButtons from "../SortButtons/SortButtons";

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
  const LanguageSelector = ({ onLanguageChange = null }) => {
    const nextLanguage = i18n.language === "en" ? "de" : "en";
    return (
      <Button
        variant="ghost"
        className="text-base"
        onClick={() => {
          if (!disableLanguageSwitch) {
            i18n.changeLanguage(nextLanguage);
            if (onLanguageChange) onLanguageChange();
          }
        }}
        disabled={disableLanguageSwitch}
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
    return theme === "light" ? (
      <Moon className="size-5" />
    ) : (
      <Sun className="size-5" />
    );
  };

  const ThemeToggle = () => (
    <Button
      variant="ghost"
      size="icon"
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
              <Settings className="size-4" />
              {t("settings")}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" />
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
      <header className="relative flex items-center justify-between pt-2 pb-4 bg-background">
        {/* Language and Theme Selection */}
        <div className="flex shrink-0 items-center md:gap-2">
          {/* <Squirrel className="hidden md:block md:size-14 md:pr-4" /> */}
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
        <nav className="hidden items-center gap-2 md:flex md:gap-4">
          {/* Desktop User Icon */}
          <UserMenu />

          {/* Only display if user logged in */}
          {isLoggedIn && (
            <>
              <FriendsPanel
                renderTrigger={(pendingCount) => (
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="relative"
                    aria-label={t("friends")}
                  >
                    <Users className="size-7" />
                    {pendingCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 size-4 justify-center rounded-full p-0 text-[0.625rem]"
                      >
                        {pendingCount}
                      </Badge>
                    )}
                  </Button>
                )}
              />
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
            <DropdownMenuContent align="center">
              {/* Navigation options for logged in users */}
              {isLoggedIn && (
                <>
                  <FriendsPanel
                    onNavigate={() => setShowNavMenu(false)}
                    renderTrigger={(pendingCount) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-1.5"
                        aria-label={t("friends")}
                      >
                        <Users className="size-4" />
                        {t("friends")}
                        {pendingCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="ml-auto size-4 justify-center rounded-full p-0 text-[0.625rem]"
                          >
                            {pendingCount}
                          </Badge>
                        )}
                      </Button>
                    )}
                  />
                  <DropdownMenuItem onClick={() => navigate("/add-recipe")}>
                    <Plus className="size-4" />
                    {t("add_new_recipe")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/cooking-times")}>
                    <Clock className="size-4" />
                    {t("cooking_times", "Cooking Times")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/*  Search Recipe - visible on home page for logged in users  */}
      {isHomePage && isLoggedIn && (
        <div className="flex justify-center px-4 py-3 md:px-6">
          <div className="flex w-full max-w-2xl flex-col items-stretch gap-3 md:flex-row md:items-center">
            <form
              className="w-full md:flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                setSearchTerm(currentSearchInput);
                navigate("/");
              }}
            >
              <InputGroup className="h-12">
                <InputGroupAddon
                  align="inline-start"
                  className="text-foreground"
                >
                  <Search className="size-5" />
                </InputGroupAddon>
                <InputGroupInput
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
                  className="text-base"
                  placeholder={t("search")}
                />
                {currentSearchInput && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      aria-label={t("clear_search")}
                      onClick={() => {
                        setCurrentSearchInput("");
                        setSearchTerm("");
                      }}
                    >
                      <X />
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>
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
