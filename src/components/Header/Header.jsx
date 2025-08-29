import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  ShoppingBasket,
  Plus,
  Squirrel,
  Menu,
  User,
} from "lucide-react";
import { signOut, getFirstName } from "../../services/auth";
import { useAuth } from "../../hooks/data/useAuth";
import { useTranslation } from "react-i18next";
import useClickOutside from "../../hooks/ui/useClickOutside";
import SortButtons from "../SortButtons/SortButtons";
import "./Header.css";

const Header = ({
  setSelectedCategory,
  setSearchTerm,
  searchTerm,
  setLoginMessage,
  loginMessage,
  disableLanguageSwitch = false,
  sortBy,
  setSortBy,
  showImages,
  setShowImages,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isLoggedIn } = useAuth();

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

    setLoginMessage(t("logged_out"));
    setFirstName("");
    setSearchTerm("");
    navigate("/");

    setTimeout(() => {
      setLoginMessage("");
    }, 3000);
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

  // Reusable User Dropdown Component
  const UserDropdown = () => (
    <div className={"user-icon-wrapper"} ref={userDropdownRef}>
      <button
        className={`btn btn-icon btn-icon-neutral ${
          showUserDropdown || location.pathname === "/account-settings"
            ? "selected"
            : ""
        }`}
        onClick={() => {
          if (location.pathname === "/auth-page") return;
          setShowUserDropdown((prev) => !prev);
        }}
        aria-label={isLoggedIn ? t("user_menu") : t("login")}
      >
        <User size={28} />
      </button>

      {/* User Dropdown */}
      {showUserDropdown && (
        <div className="dropdown user-menu">
          <div className="dropdown-content">
            {isLoggedIn ? (
              <>
                <button
                  className={`dropdown-item ${
                    location.pathname === "/account-settings" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setShowUserDropdown(false);
                    navigate("/account-settings");
                  }}
                >
                  {t("account_settings")}
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
      )}
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
            {/* </button> */}

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
            {/* Display user's first name above header */}
            {firstName && (
              <span className="first-name"> {`${firstName}'s`}</span>
            )}
            <button
              className="site-title"
              onClick={() => {
                navigate("/");
              }}
            >
              Rezepte
            </button>
            {/* Login message - centered below title */}
            {loginMessage && (
              <span className="login-message">{loginMessage}</span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="header-nav desktop-nav">
            {/* Desktop User Icon */}
            <UserDropdown />

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
            <UserDropdown className="mobile-user" />

            {/* Hamburger Menu */}
            <div className="nav-menu-wrapper" ref={navMenuRef}>
              <button
                className={`btn btn-icon btn-icon-neutral ${
                  showNavMenu ? "selected" : ""
                }`}
                onClick={() => setShowNavMenu((prev) => !prev)}
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
                        >
                          <Plus size={20} />
                          {/* {t("add_new_recipe")} */}
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
                        >
                          <ShoppingBasket size={20} />
                          {/* {t("grocery_list")} */}
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
                        setSelectedCategory("all");
                      }
                    }}
                    className="input input--cream search-input-with-icon"
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
