import "./Header.css";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ShoppingBasket, Plus, Squirrel } from "lucide-react";
import { signOut } from "../../services/auth";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";
// import useClickOutside from "../../hooks/useClickOutside";

const Header = ({
  setSelectedCategory,
  setSearchTerm,
  setLoginMessage,
  loginMessage,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Temporary solution to hide nav bar for mobiles on all screens except home screen
  const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;
  const hideNavBar = location.pathname !== "/" && isSmallScreen;

  const { isLoggedIn, isMe, isGuest } = useAuth();

  // Search state
  const [showSearchBar, setShowSearchBar] = useState(false);

  const [showLogOut, setShowLogOut] = useState(false);
  const [showLogIn, setShowLogIn] = useState(false);

  // Language
  const { t, i18n } = useTranslation();

  // Refs for click outside detection
  // const searchBarRef = useClickOutside(() => {
  //   setShowSearchBar(false);
  // });

  // const loginFormRef = useClickOutside(() => {
  //   setAuthState('closed');
  // });

  const handleLogout = async () => {
    await signOut();

    setLoginMessage(t("logged_out"));
    setShowLogOut(false);
    setTimeout(() => {
      setLoginMessage("");
      window.location.reload();
    }, 3000);
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          {/* Login and Logout */}
          <div className="login-wrapper">
            <div
              onClick={() => {
                if (loginMessage) return; // Don't do anything if there's a message

                if (isLoggedIn) {
                  // Logout form
                  setShowLogOut((prev) => !prev);
                } else {
                  // Sign in/up form
                  // TODO - don't display if in login page already
                  setShowLogIn((prev) => !prev);
                }
              }}
            >
              <Squirrel className="header-logo" />
              {isMe && <Squirrel className="header-logo-2" />}
            </div>
            {/* Login message */}
            {loginMessage && <div>{loginMessage}</div>}
            {isLoggedIn && showLogOut && (
              <div>
                <button className="header-btn" onClick={handleLogout}>
                  {t("logout")}
                </button>
              </div>
            )}
            {showLogIn && (
              <button
                className="header-btn"
                onClick={() => {
                  setShowLogIn(false);
                  navigate("/auth-page");
                }}
              >
                {t("login")}
              </button>
            )}
            {/* Language Selection */}
            <div className="language-wrapper">
              <p
                className={`language${
                  i18n.language === "en" ? " selected" : ""
                }`}
                onClick={() => i18n.changeLanguage("en")}
              >
                EN
              </p>{" "}
              |{" "}
              <p
                className={`language${
                  i18n.language === "de" ? " selected" : ""
                }`}
                onClick={() => i18n.changeLanguage("de")}
              >
                DE
              </p>
            </div>
          </div>

          {/* Title */}
          <h1
            onClick={() => {
              navigate("/");
              setSelectedCategory("all");
              window.location.reload();
            }}
            className="header-title"
          >
            Rezepte
          </h1>

          {!hideNavBar && (
            <>
              <nav className="header-nav">
                <button
                  onClick={() => {
                    setShowSearchBar((prev) => !prev);
                    // Clear search when closing search bar
                    if (showSearchBar) {
                      setSearchTerm("");
                    }
                    // Focus on search bar
                    if (!showSearchBar) {
                      setTimeout(() => {
                        const searchInput = document.getElementById("search");
                        if (searchInput) {
                          searchInput.focus();
                        }
                      }, 0);
                    }
                  }}
                  className="icon-btn"
                >
                  <Search size={28} />
                </button>
                {/* Grocery List */}
                <button
                  className="icon-btn"
                  onClick={() => navigate("/grocery-list")}
                >
                  <ShoppingBasket size={28} />
                </button>
                {/* Plus Recipe - only display if user logged in and isn't guest */}
                {isLoggedIn && !isGuest && (
                  <button
                    className="icon-btn"
                    onClick={() => navigate("/add-recipe")}
                  >
                    <Plus size={28} />
                  </button>
                )}
              </nav>
            </>
          )}
        </div>

        {/*  Search Recipe  */}
        <div className="search-bar-wrapper">
          {showSearchBar && (
            <form
              className="search-bar"
              onSubmit={(e) => {
                e.preventDefault();
                setSearchTerm(e.target.elements.search.value);
                setShowSearchBar(false);
                navigate("/");
              }}
            >
              <input id="search" type="text" className="search-bar-input" />
              <button type="submit" className="header-btn">
                {t("search")}
              </button>
            </form>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
