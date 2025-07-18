import "./Header.css";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, ShoppingBasket, Plus, Squirrel } from "lucide-react";
import { signIn, signUp, signOut } from "../../services/auth";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";
// import useClickOutside from "../../hooks/useClickOutside";

const Header = ({ setSelectedCategory, setSearchTerm }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEditingOrAdding =
    location.pathname === "/add-recipe" ||
    location.pathname.startsWith("/edit-recipe");

  // Single auth state
  const [authState, setAuthState] = useState("closed"); // 'closed', 'options', 'login', 'signup', 'logout'

  // Form input states
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const { isLoggedIn, isMe } = useAuth();

  // Search state
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Language
  const { t, i18n } = useTranslation();

  // Refs for click outside detection
  // const searchBarRef = useClickOutside(() => {
  //   setShowSearchBar(false);
  // });

  // const loginFormRef = useClickOutside(() => {
  //   setAuthState('closed');
  // });

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await signIn(username, password);

    if (error) {
      setLoginMessage(t("login_failed"));
    } else {
      setLoginMessage(t("login_success"));
    }

    setTimeout(() => {
      setLoginMessage("");
    }, 3000);

    setAuthState("closed");
    setUsername("");
    setPassword("");
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    const { error } = await signUp(email, username, password);

    if (error) {
      setLoginMessage(t("signup_failed"));
    } else {
      setLoginMessage(t("signup_success"));
    }

    setTimeout(() => {
      setLoginMessage("");
    }, 3000);

    setAuthState("closed");
    setEmail("");
    setUsername("");
    setPassword("");
  };

  const handleLogout = async () => {
    await signOut();

    setLoginMessage(t("logged_out"));
    setTimeout(() => {
      setLoginMessage("");
    }, 3000);

    setAuthState("closed");
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
                  setAuthState((prev) =>
                    prev === "logout" ? "closed" : "logout"
                  );
                } else {
                  setAuthState((prev) =>
                    prev === "closed" ? "options" : "closed"
                  );
                }
              }}
            >
              <Squirrel className="header-logo" />
              {isLoggedIn && isMe && <Squirrel className="header-logo-2" />}
            </div>

            {/* Login message */}
            {loginMessage && <div>{loginMessage}</div>}

            {/* Show sign up or log in options */}
            {authState === "options" && (
              <div className="login-inputs">
                <button
                  className="header-btn"
                  onClick={() => setAuthState("login")}
                >
                  {t("login")}
                </button>
                <button
                  className="header-btn"
                  onClick={() => setAuthState("signup")}
                >
                  {t("sign_up")}
                </button>
              </div>
            )}

            {/* Sign up form */}
            {authState === "signup" && (
              <form onSubmit={handleSignUp} className="signup-form">
                <div className="login-inputs">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("email")}
                    className="login-input"
                    required
                  />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("username")}
                    className="login-input"
                    required
                  />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("password")}
                    className="login-input"
                    required
                  />
                </div>
                <button className="header-btn" type="submit">
                  {t("sign_up")}
                </button>
              </form>
            )}

            {/* Login form - username and password */}
            {authState === "login" && (
              <form onSubmit={handleLogin} className="login-form">
                <div className="login-inputs">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("username")}
                    className="login-input"
                    required
                  />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("password")}
                    className="login-input"
                    required
                  />
                </div>
                <button className="header-btn" type="submit">
                  {t("login")}
                </button>
              </form>
            )}

            {/* Logout form */}
            {authState === "logout" && (
              <div>
                <button className="header-btn" onClick={handleLogout}>
                  {t("logout")}
                </button>
              </div>
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

          {!isEditingOrAdding && (
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
                <button className="icon-btn">
                  <ShoppingBasket size={28} />
                </button>
                {/* Plus Recipe - only display if user logged in */}
                {isLoggedIn && (
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
