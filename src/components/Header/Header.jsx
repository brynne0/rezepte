import "./Header.css";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingBasket, Plus, Squirrel } from "lucide-react";
import { signIn, signOut } from "../../services/auth";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

const Header = ({ setSelectedCategory }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showLogoutForm, setShowLogoutForm] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const { isLoggedIn, isMe } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await signIn(email, password);
    if (error) {
      console.error("Login error:", error.message);
    }

    if (error) {
      setLoginMessage("Login failed. Please try again.");
    } else {
      setLoginMessage("Logged in!");
    }

    setTimeout(() => {
      setLoginMessage("");
    }, 3000);

    setShowLoginForm(false);
    setEmail("");
    setPassword("");
  };

  const handleLogout = async () => {
    await signOut();

    setLoginMessage("Logged out");
    setTimeout(() => {
      setLoginMessage("");
    }, 3000);

    setShowLogoutForm(false);
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          {/* Login and Logout */}
          <div className="login-wrapper">
            <div
              onClick={() =>
                isLoggedIn
                  ? setShowLogoutForm((prev) => !prev)
                  : setShowLoginForm((prev) => !prev)
              }
            >
              <Squirrel className="header-logo" />
              {isLoggedIn && isMe && <Squirrel className="header-logo-2" />}
            </div>
            {/* Login message */}
            {loginMessage && <div>{loginMessage}</div>}
            {/* Login form - email and password */}
            {showLoginForm && (
              <form onSubmit={handleLogin} className="login-form">
                <div className="login-inputs">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="login-input"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="login-input"
                  />
                </div>
                <button className="login-btn" type="submit">
                  Login
                </button>
              </form>
            )}
            {/* Logout form */}
            {showLogoutForm && (
              <button className="login-btn" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>

          {/* Title */}
          <h1
            onClick={() => {
              navigate("/");
              setSelectedCategory("Alle Rezepte");
              window.location.reload();
            }}
            className="header-title"
          >
            Rezepte
          </h1>

          <nav className="header-nav">
            {/* Search Recipe */}
            <button className="icon-btn">
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
        </div>
      </header>
    </>
  );
};

export default Header;
