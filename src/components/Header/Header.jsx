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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FriendsPanel from "../FriendsPanel/FriendsPanel";
import { signOut, getFirstName } from "../../services/auth";
import { useAuth } from "../../hooks/data/useAuth";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/ui/useTheme";
import { useInstallPrompt } from "../../hooks/ui/useInstallPrompt";
import { useMainScrollRef } from "../../hooks/ui/useMainScrollRef";
import { cn } from "cn";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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

  // Only show a border under the header once there's scrolled content above it
  const mainScrollRef = useMainScrollRef();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const node = mainScrollRef?.current;
    if (!node) return;

    const handleScroll = () => setIsScrolled(node.scrollTop > 0);
    handleScroll();
    node.addEventListener("scroll", handleScroll, { passive: true });
    return () => node.removeEventListener("scroll", handleScroll);
  }, [mainScrollRef]);

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

  const isActivePage = (path) => location.pathname === path;
  const isFriendsPageActive = location.pathname.startsWith("/friends/");

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
    <Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <TooltipTrigger
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
      <TooltipContent>{isLoggedIn ? t("profile") : t("login")}</TooltipContent>
    </Tooltip>
  );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-20 border-b",
          isScrolled ? "border-border/60" : "border-transparent"
        )}
      >
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-3 py-4 md:px-8 md:pt-6 md:pb-6">
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
              className="h-auto select-none p-0 font-forta text-3xl leading-none text-foreground transition-none hover:bg-transparent active:translate-y-0 dark:hover:bg-transparent md:text-5xl"
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
                  tooltipLabel={t("friends")}
                  renderTrigger={(pendingCount) => (
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      className={
                        isFriendsPageActive
                          ? "relative text-accent-red"
                          : "relative"
                      }
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
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        data-testid="lucide-plus"
                        variant="ghost"
                        size="icon-lg"
                        onClick={() => navigate("/add-recipe")}
                        className={
                          isActivePage("/add-recipe") ? "text-accent-red" : ""
                        }
                        aria-label={t("add_new_recipe")}
                      >
                        <Plus className="size-7" />
                      </Button>
                    }
                  />
                  <TooltipContent>{t("add_new_recipe")}</TooltipContent>
                </Tooltip>
                {/* Cooking Times */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        data-testid="lucide-clock"
                        variant="ghost"
                        size="icon-lg"
                        onClick={() => navigate("/cooking-times")}
                        className={
                          isActivePage("/cooking-times")
                            ? "text-accent-red"
                            : ""
                        }
                        aria-label={t("cooking_times", "Cooking Times")}
                      >
                        <Clock className="size-7" />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {t("cooking_times", "Cooking Times")}
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </nav>

          {/* Mobile User and Menu Icons */}
          <div className="flex items-center md:hidden">
            {/* Mobile User Icon */}
            <UserMenu />

            {/* Hamburger Menu - only shown when logged in */}
            {isLoggedIn && (
              <Tooltip>
                <DropdownMenu open={showNavMenu} onOpenChange={setShowNavMenu}>
                  <DropdownMenuTrigger
                    render={
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-lg"
                            aria-label="Menu"
                          >
                            <Menu className="size-7" />
                          </Button>
                        }
                      />
                    }
                  />
                  <DropdownMenuContent align="center">
                    <FriendsPanel
                      onNavigate={() => setShowNavMenu(false)}
                      renderTrigger={(pendingCount) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            isFriendsPageActive
                              ? "w-full justify-start gap-1.5 text-accent-red"
                              : "w-full justify-start gap-1.5"
                          }
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
                    <DropdownMenuItem
                      onClick={() => navigate("/add-recipe")}
                      className={
                        isActivePage("/add-recipe") ? "text-accent-red" : ""
                      }
                    >
                      <Plus className="size-4" />
                      {t("add_new_recipe")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate("/cooking-times")}
                      className={
                        isActivePage("/cooking-times") ? "text-accent-red" : ""
                      }
                    >
                      <Clock className="size-4" />
                      {t("cooking_times", "Cooking Times")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <TooltipContent>Menu</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </header>

      {/*  Search Recipe - visible on home page for logged in users  */}
      {isHomePage && isLoggedIn && (
        <div className="flex justify-center px-4 md:px-6">
          <div className="flex w-full max-w-xl flex-col items-stretch gap-3 md:flex-row md:items-center">
            <form
              className="w-full md:flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                setSearchTerm(currentSearchInput);
                navigate("/");
              }}
            >
              <InputGroup className="h-10">
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
                    <Tooltip>
                      <TooltipTrigger
                        render={
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
                        }
                      />
                      <TooltipContent>{t("clear_search")}</TooltipContent>
                    </Tooltip>
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

      <AlertDialog
        open={showInstallModal}
        onOpenChange={(open) => {
          if (!open) handleDismissInstall();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("install_app")}</AlertDialogTitle>
            <AlertDialogDescription>
              {isIOS ? t("install_app_ios") : t("install_app_prompt")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            {!isIOS && (
              <AlertDialogCancel>{t("maybe_later")}</AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={isIOS ? handleDismissInstall : handleConfirmInstall}
            >
              {isIOS ? t("got_it") : t("install_app")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Header;
