import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  ShoppingBasket,
  Plus,
  Squirrel,
  Menu,
  User,
  Sun,
  Moon,
  Clock,
} from "lucide-react";
import { signOut, getFirstName } from "../../services/auth";
import { useAuth } from "../../hooks/data/useAuth";
import { useTranslation } from "react-i18next";
import useClickOutside from "../../hooks/ui/useClickOutside";
import { useTheme } from "../../hooks/ui/useTheme";
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

  // Hide search bar on all pages except home
  const isHomePage = location.pathname === "/";

  const [showNavMenu, setShowNavMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
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

  // Refs for click outside detection

  const userDropdownRef = useClickOutside(() => {
    setShowUserDropdown(false);
  });

  const navMenuRef = useClickOutside(() => {
    setShowNavMenu(false);
  });

  const handleLogout = async () => {
    await signOut();

    setFirstName("");
    setSearchTerm("");
    navigate("/");
  };

  // Reusable Language Selector Component
  const LanguageSelector = ({ className = "", onLanguageChange = null }) => (
    <div className={`language-wrapper ${className}`}>
      <button
        className={`btn-unstyled language${
          i18n.language === "en" ? " selected" : ""
        }${disableLanguageSwitch ? " disabled" : ""}`}
        onClick={() => {
          if (!disableLanguageSwitch) {
            i18n.changeLanguage("en");
            if (onLanguageChange) onLanguageChange();
          }
        }}
        disabled={disableLanguageSwitch}
        aria-label={t("switch_to_english")}
      >
        EN
      </button>
      |
      <button
        className={`btn-unstyled language${
          i18n.language === "de" ? " selected" : ""
        }${disableLanguageSwitch ? " disabled" : ""}`}
        onClick={() => {
          if (!disableLanguageSwitch) {
            i18n.changeLanguage("de");
            if (onLanguageChange) onLanguageChange();
          }
        }}
        disabled={disableLanguageSwitch}
        aria-label={t("switch_to_german")}
      >
        DE
      </button>
    </div>
  );

  // Get theme icon
  const getThemeIcon = () => {
    return theme === "light" ? <Moon size={20} /> : <Sun size={20} />;
  };

  // Shared user dropdown menu content
  const userDropdownMenu = showUserDropdown && (
    <div className="dropdown user-menu">
      <div className="dropdown-content">
        <button
          className="dropdown-item"
          onClick={() => {
            toggleTheme();
            setShowUserDropdown(false);
          }}
          aria-label={
            theme === "light" ? t("theme_dark") : t("theme_light")
          }
        >
          {getThemeIcon()}
        </button>
        {isLoggedIn ? (
          <>
            <button
              className={`dropdown-item ${
                location.pathname === "/settings" ? "selected" : ""
              }`}
              onClick={() => {
                setShowUserDropdown(false);
                navigate("/settings");
              }}
            >
              {t("settings")}
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                handleLogout();
                setShowUserDropdown(false);
              }}
            >
              {t("logout")}
            </button>
          </>
        ) : (
          <button
            className="dropdown-item"
            onClick={() => {
              setShowUserDropdown(false);
              navigate("/auth-page");
            }}
          >
            {t("login")}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <header className="header">
        <div className="header-container flex-between">
          {/* Login and Logout */}
          <div className="logo-language-wrapper">
            {/* <button className="btn-unstyled"> */}
            <Squirrel size={40} className="header-logo" />

            {/* {isMe && (
                <Squirrel
                  data-testid="lucide-squirrel"
                  className="header-logo-2"
                />
              )} */}

            {/* Language Selection */}
            <LanguageSelector />
          </div>

          {/* Title */}
          <div className="title-wrapper">
            {/* Display user's first name above header or login message */}
            {firstName && (
              <span className="first-name"> {`${firstName}'s`}</span>
            )}
            <button
              className="site-title"
              onClick={() => {
                navigate("/");
              }}
              aria-label={t("go_to_home")}
            >
              Rezepte
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="header-nav desktop-nav">
            {/* Desktop User Icon */}
            <div className="user-icon-wrapper">
              <button
                className={`btn btn-icon btn-icon-neutral ${
                  showUserDropdown || location.pathname === "/settings"
                    ? "selected"
                    : ""
                }`}
                onMouseDown={() => {
                  setShowNavMenu(false);
                }}
                onClick={() => {
                  if (location.pathname === "/auth-page") return;
                  setShowUserDropdown((prev) => !prev);
                }}
                aria-label={isLoggedIn ? t("user_menu") : t("login")}
              >
                <User size={28} />
              </button>
              {userDropdownMenu}
            </div>

            {/* Only display if user logged in */}
            {isLoggedIn && (
              <>
                <button
                  data-testid="lucide-plus"
                  className={`btn btn-icon btn-icon-neutral ${
                    location.pathname === "/add-recipe" ? "selected" : ""
                  }`}
                  onClick={() => navigate("/add-recipe")}
                  aria-label={t("add_new_recipe")}
                >
                  <Plus size={28} />
                </button>
                {/* Cooking Times */}
                <button
                  data-testid="lucide-clock"
                  className={`btn btn-icon btn-icon-neutral ${
                    location.pathname === "/cooking-times" ? "selected" : ""
                  }`}
                  onClick={() => navigate("/cooking-times")}
                  aria-label={t("cooking_times", "Cooking Times")}
                >
                  <Clock size={28} />
                </button>
                {/* Grocery List */}
                <button
                  data-testid="lucide-shopping-basket"
                  className={`btn btn-icon btn-icon-neutral ${
                    location.pathname === "/grocery-list" ? "selected" : ""
                  }`}
                  onClick={() => navigate("/grocery-list")}
                  aria-label={t("grocery_list")}
                >
                  <ShoppingBasket size={28} />
                </button>
              </>
            )}
          </nav>

          {/* Mobile User and Menu Icons */}
          <div className="mobile-nav">
            {/* Mobile User Icon */}
            <div className="user-icon-wrapper" ref={userDropdownRef}>
              <button
                className={`btn btn-icon btn-icon-neutral ${
                  showUserDropdown || location.pathname === "/settings"
                    ? "selected"
                    : ""
                }`}
                onMouseDown={() => {
                  setShowNavMenu(false);
                }}
                onClick={() => {
                  if (location.pathname === "/auth-page") return;
                  setShowUserDropdown((prev) => !prev);
                }}
                aria-label={isLoggedIn ? t("user_menu") : t("login")}
              >
                <User size={28} />
              </button>
              {userDropdownMenu}
            </div>

            {/* Hamburger Menu */}
            <div className="nav-menu-wrapper" ref={navMenuRef}>
              <button
                className={`btn btn-icon btn-icon-neutral ${
                  showNavMenu ? "selected" : ""
                }`}
                onMouseDown={() => {
                  setShowUserDropdown(false);
                }}
                onClick={() => {
                  setShowNavMenu((prev) => !prev);
                }}
                aria-label="Menu"
              >
                <Menu size={28} />
              </button>

              {/* Mobile Menu Dropdown */}
              {showNavMenu && (
                <div className="dropdown">
                  <div className="dropdown-content">
                    {/* Navigation options for logged in users */}
                    {isLoggedIn && (
                      <>
                        <button
                          className={`dropdown-item ${
                            location.pathname === "/add-recipe"
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => {
                            navigate("/add-recipe");
                            setShowNavMenu(false);
                          }}
                          aria-label={t("add_new_recipe")}
                        >
                          <Plus size={20} />
                        </button>
                        <button
                          className={`dropdown-item ${
                            location.pathname === "/cooking-times"
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => {
                            navigate("/cooking-times");
                            setShowNavMenu(false);
                          }}
                          aria-label={t("cooking_times", "Cooking Times")}
                        >
                          <Clock size={20} />
                        </button>
                        <button
                          className={`dropdown-item ${
                            location.pathname === "/grocery-list"
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => {
                            navigate("/grocery-list");
                            setShowNavMenu(false);
                          }}
                          aria-label={t("grocery_list")}
                        >
                          <ShoppingBasket size={20} />
                        </button>
                      </>
                    )}

                    {/* Language selection in mobile menu */}
                    <LanguageSelector
                      className="dropdown-item"
                      onLanguageChange={() => setShowNavMenu(false)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

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
                  <button
                    className="btn btn-icon btn-icon-neutral btn-search"
                    type="submit"
                    aria-label={t("search")}
                  >
                    <Search size={20} />
                  </button>
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
      </header>
    </>
  );
};

export default Header;
