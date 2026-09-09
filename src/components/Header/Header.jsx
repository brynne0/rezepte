import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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

const Header = ({ disableLanguageSwitch = false, friendBar }) => {
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

  const isAuthPage = location.pathname === "/login";

  const isActivePage = (path) => location.pathname === path;
  const isFriendsPageActive = location.pathname.startsWith("/friends/");

  const [showNavMenu, setShowNavMenu] = useState(false);

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

  const handleLogout = async () => {
    await signOut();

    setFirstName("");
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
                  disabled={location.pathname === "/login"}
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
            <DropdownMenuItem onClick={() => navigate("/login")}>
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
          isScrolled && !friendBar ? "border-border/60" : "border-transparent"
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
            {!isAuthPage && <UserMenu />}

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
                {/* <Tooltip>
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
                </Tooltip> */}
              </>
            )}
          </nav>

          {/* Mobile User and Menu Icons */}
          <div className="flex items-center md:hidden">
            {/* Mobile User Icon */}
            {!isAuthPage && <UserMenu />}

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

      {/* Viewing a friend's content */}
      {friendBar && (
        <div className="border-t border-b">
          <div className="relative mx-auto flex max-w-7xl items-center justify-center px-3 pt-2 pb-2 md:px-8">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute left-3 md:left-8"
              onClick={() => navigate("/")}
              aria-label={t("go_back")}
            >
              <ArrowLeft />
            </Button>
            {friendBar.loading ? (
              <Skeleton className="h-6 w-40 rounded-full" />
            ) : (
              friendBar.name && (
                <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium">
                  <User className="size-3.5" />
                  {t("friends_recipes_title", { name: friendBar.name })}
                </div>
              )
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
