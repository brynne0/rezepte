import "./Header.css";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ShoppingBasket, Plus, Squirrel } from "lucide-react";
import { signOut, getDisplayName } from "../../services/auth";
import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/data/useAuth";
import { useTranslation } from "react-i18next";
import useClickOutside from "../../hooks/ui/useClickOutside";

const Header = ({
  setSelectedCategory,
  setSearchTerm,
  setLoginMessage,
  loginMessage,
  disableLanguageSwitch = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Temporary solution to hide nav bar for mobiles on all screens except home screen
  const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;
  const hideNavBar = location.pathname !== "/" && isSmallScreen;

  // Hide search bar on all pages except home
  const isHomePage = location.pathname === "/";

  const { isLoggedIn, isMe, isGuest } = useAuth();

  // Search state
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Log in and out
  const [showLogOut, setShowLogOut] = useState(false);
  const [showLogIn, setShowLogIn] = useState(false);

  // Language
  const { t, i18n } = useTranslation();

  // Display name
  const [displayName, setDisplayName] = useState("");

  // Load display name on app startup
  useEffect(() => {
    const loadDisplayName = async () => {
      const name = await getDisplayName();
      if (name) {
        setDisplayName(name);
      }
    };

    if (isLoggedIn) {
      loadDisplayName();
    } else {
      setDisplayName("");
    }
  }, [isLoggedIn, setDisplayName]);

  // Hide search bar when leaving home page (but keep search term)
  useEffect(() => {
    if (!isHomePage) {
      setShowSearchBar(false);
    }
  }, [location.pathname, isHomePage]);

  // Refs for click outside detection
  const loginFormRef = useClickOutside(() => {
    setShowLogOut(false);
    setShowLogIn(false);
  });

  const searchBarRef = useClickOutside(() => {
    setShowSearchBar(false);
  });

  const handleLogout = async () => {
    await signOut();

    setLoginMessage(t("logged_out"));
    setShowLogOut(false);
    setDisplayName("");
    setSearchTerm("");
    navigate("/");

    setTimeout(() => {
      setLoginMessage("");
    }, 3000);
  };

  return (
    <>
      <header className="header">
        <div className="header-container">
          {/* Login and Logout */}
          <div className="login-wrapper" ref={loginFormRef}>
            <div
              onClick={() => {
                // Don't do anything if there's a message or already on auth page
                if (loginMessage || location.pathname === "/auth-page") return;

                if (isLoggedIn) {
                  // Logout form
                  setShowLogOut((prev) => !prev);
                } else {
                  // Sign in/up form
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
                <button className={"btn btn-standard"} onClick={handleLogout}>
                  {t("logout")}
                </button>
              </div>
            )}
            {showLogIn && (
              <button
                className={"btn btn-standard"}
                onClick={() => {
                  setShowLogIn(false);
                  setSearchTerm("");
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
                }${disableLanguageSwitch ? " disabled" : ""}`}
                onClick={() =>
                  !disableLanguageSwitch && i18n.changeLanguage("en")
                }
              >
                EN
              </p>{" "}
              |{" "}
              <p
                className={`language${
                  i18n.language === "de" ? " selected" : ""
                }${disableLanguageSwitch ? " disabled" : ""}`}
                onClick={() =>
                  !disableLanguageSwitch && i18n.changeLanguage("de")
                }
              >
                DE
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="title-wrapper">
            {/* Display user's first name above header */}
            {displayName && <h3> {displayName}</h3>}
            <h1
              onClick={() => {
                setSelectedCategory("all");
                setSearchTerm("");
                navigate("/");
              }}
            >
              Rezepte
            </h1>
          </div>

          {!hideNavBar && (
            <>
              <nav className="header-nav">
                <button
                  onClick={() => {
                    // If not on home page, navigate to home first and open search
                    if (!isHomePage) {
                      setSelectedCategory("all");
                      setSearchTerm("");
                      setShowSearchBar(true);
                      navigate("/");
                      // Focus on search bar after navigation
                      setTimeout(() => {
                        const searchInput = document.getElementById("search");
                        if (searchInput) {
                          searchInput.focus();
                        }
                      }, 100);
                      return;
                    }

                    // If on home page, toggle search bar
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
                  className="btn btn-icon btn-icon-neutral"
                >
                  <Search size={28} />
                </button>

                {/* Only display if user logged in and isn't guest */}
                {isLoggedIn && !isGuest && (
                  <>
                    <button
                      className="btn btn-icon btn-icon-neutral"
                      onClick={() => navigate("/add-recipe")}
                    >
                      <Plus size={28} />
                    </button>
                    {/* Grocery List */}
                    <button
                      className="btn btn-icon btn-icon-neutral"
                      onClick={() => navigate("/grocery-list")}
                    >
                      <ShoppingBasket size={28} />
                    </button>
                  </>
                )}
              </nav>
            </>
          )}
        </div>

        {/*  Search Recipe  */}
        <div className="search-bar-wrapper" ref={searchBarRef}>
          {showSearchBar && isHomePage && (
            <form
              className="search-bar"
              onSubmit={(e) => {
                e.preventDefault();
                setSearchTerm(e.target.elements.search.value);
                navigate("/");
              }}
            >
              <input id="search" type="text" className="input input--cream" />
              <button className={"btn btn-standard"} type="submit">
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
