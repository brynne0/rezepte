import "./Header.css";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingBasket, Plus, Squirrel } from "lucide-react";
import { signIn, signOut } from "../../services/auth";
import { useState, useEffect } from "react";
import supabase from "../../utils/supabaseClient";

const Header = ({ setSelectedCategory }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showLogoutForm, setShowLogoutForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

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

  // Check if user is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <header className="header">
        <div className="header-content">
          {/* Login and Logout */}
          <div className="login-container">
            <Squirrel
              className="header-logo"
              onClick={() =>
                isLoggedIn
                  ? setShowLogoutForm((prev) => !prev)
                  : setShowLoginForm((prev) => !prev)
              }
            />
            {/* Login message */}
            {loginMessage && <div>{loginMessage}</div>}
            {/* Login form - email and password */}
            {showLoginForm && (
              <form onSubmit={handleLogin} className="login-form">
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
            {/* Grocery List */}
            <button className="icon-btn">
              <ShoppingBasket size={28} />
            </button>
            {/* Plus Recipe */}
            <button
              className="icon-btn"
              onClick={() => navigate("/add-recipe")}
            >
              <Plus size={28} />
            </button>
            {/* Search Recipe */}
            <button className="icon-btn">
              <Search size={28} />
            </button>
          </nav>
        </div>
      </header>
    </>
  );
};

export default Header;
