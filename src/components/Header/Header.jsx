import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Menu,
  User,
  Users,
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
import { signOut } from "../../services/auth";
import { useAuth } from "../../hooks/data/useAuth";
import { useUserProfile } from "../../hooks/data/useUserProfile";
import { useTranslation } from "react-i18next";
import { useInstallPrompt } from "../../hooks/ui/useInstallPrompt";
import { useMainScrollRef } from "../../hooks/ui/useMainScrollRef";
import { useOnlineStatus } from "../../hooks/ui/useOnlineStatus";
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

const Header = ({ friendBar }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isLoggedIn } = useAuth();
  const { installPrompt, isIOS, triggerInstall } = useInstallPrompt();
  const isOnline = useOnlineStatus();

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

  const isAuthPage = ["/login", "/forgot-password"].includes(location.pathname);

  const isActivePage = (path) => location.pathname === path;
  const isFriendsPageActive = location.pathname.startsWith("/friends/");

  const [showNavMenu, setShowNavMenu] = useState(false);

  const { t, i18n } = useTranslation();

  // Display name - cached offline via useUserProfile
  const { profile } = useUserProfile();
  const firstName = isLoggedIn ? profile?.first_name || "" : "";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Logged-out only; logged in, the language comes from Settings
  const nextLanguage = i18n.language === "en" ? "de" : "en";
  const languageToggle = !isLoggedIn && (
    <Button
      variant="ghost"
      className="text-base"
      onClick={() => i18n.changeLanguage(nextLanguage)}
      aria-label={
        nextLanguage === "en" ? t("switch_to_english") : t("switch_to_german")
      }
    >
      {nextLanguage.toUpperCase()}
    </Button>
  );

  // Shared user dropdown menu
  const UserMenu = ({ align = "center" }) => (
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
                  className={isActivePage("/settings") ? "text-accent-red" : ""}
                  aria-label={isLoggedIn ? t("user_menu") : t("login")}
                >
                  <User className="size-7" />
                </Button>
              }
            />
          }
        />
        <DropdownMenuContent align={align}>
          {isLoggedIn ? (
            <>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="size-4" />
                {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={handleLogout}
                disabled={!isOnline}
              >
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
          "sticky top-0 z-20 border-b bg-background",
          isScrolled && !friendBar ? "border-border/60" : "border-transparent"
        )}
      >
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-3 py-4 md:px-8 md:pt-8 md:pb-6">
          {/* User Icon, always on the left; min-h keeps header height stable */}
          <div className="flex min-h-9 shrink-0 items-center">
            {!isAuthPage && <UserMenu align="start" />}
          </div>

          {/* Language Selection, logged out only */}
          {!isLoggedIn && (
            <div className="flex shrink-0 items-center">{languageToggle}</div>
          )}

          {/* Title */}
          <div className="absolute inset-0 m-auto flex h-max w-max flex-col items-center">
            {/* Display user's first name above header */}
            {firstName && (
              <span className="text-primary text-sm leading-none md:text-base">{`${firstName}'s`}</span>
            )}
            <Button
              variant="ghost"
              className="h-auto select-none p-0 font-forta text-3xl leading-none text-foreground transition-none hover:bg-transparent hover:text-foreground active:translate-y-0 dark:hover:bg-transparent md:text-5xl"
              onClick={() => {
                navigate("/");
              }}
              aria-label={t("go_to_home")}
            >
              Rezepte
            </Button>
          </div>

          {/* Desktop Navigation */}
          {isLoggedIn && (
            <nav className="hidden items-center gap-2 md:flex md:gap-4">
              <>
                <FriendsPanel
                  tooltipLabel={
                    isOnline ? t("friends") : t("action_requires_internet")
                  }
                  renderTrigger={(pendingCount) => (
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      disabled={!isOnline}
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
                        disabled={!isOnline}
                        className={
                          isActivePage("/add-recipe") ? "text-accent-red" : ""
                        }
                        aria-label={t("add_new_recipe")}
                      >
                        <Plus className="size-7" />
                      </Button>
                    }
                  />
                  <TooltipContent>
                    {isOnline
                      ? t("add_new_recipe")
                      : t("action_requires_internet")}
                  </TooltipContent>
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
            </nav>
          )}

          {/* Mobile Menu */}
          {isLoggedIn && (
            <div className="flex items-center md:hidden">
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
                  <DropdownMenuContent align="end">
                    <FriendsPanel
                      onNavigate={() => setShowNavMenu(false)}
                      renderTrigger={(pendingCount) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!isOnline}
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
                      disabled={!isOnline}
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
            </div>
          )}
        </div>
      </header>

      {/* Viewing a friend's content */}
      {friendBar && (
        <div className="border-t border-b">
          <div className="relative mx-auto flex max-w-7xl items-center justify-center px-3 pt-2 pb-2 md:px-8">
            <Button
              variant="printed"
              className="absolute left-0.5 md:left-5.5"
              onClick={() => navigate("/")}
            >
              <ArrowLeft />
              {t("my_recipes")}
            </Button>
            {friendBar.loading ? (
              <Skeleton className="h-7 w-40 rounded-full" />
            ) : (
              friendBar.name && (
                <Badge variant="secondary" size="lg">
                  <User className="size-3.5" />
                  {t("friends_recipes_title", { name: friendBar.name })}
                </Badge>
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
