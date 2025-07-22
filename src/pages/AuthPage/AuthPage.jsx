import { signUp, signIn } from "../../services/auth";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import "./AuthPage.css";

const AuthPage = ({ setLoginMessage, refreshRecipes }) => {
  // Form input states
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Toggle between different modes
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await signIn(username, password);

    if (error) {
      setLoginMessage(t("login_failed"));
    } else {
      setLoginMessage(t("login_success"));
      // Navigate on successful login
      navigate("/");
    }

    setTimeout(() => {
      setLoginMessage("");
      // Refresh page to display recipes
      refreshRecipes(true);
    }, 3000);

    setUsername("");
    setPassword("");
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    const { error } = await signUp(email, firstName, username, password);

    if (error) {
      setLoginMessage(t("signup_failed"));
    } else {
      setLoginMessage(t("signup_success"));
      // Navigate on successful sign up
      navigate("/");
    }

    setTimeout(() => {
      setLoginMessage("");
      // Refresh page to display recipes
      refreshRecipes(true);
    }, 3000);

    setEmail("");
    setFirstName("");
    setUsername("");
    setPassword("");
  };

  // Check if forms are valid for submission
  const isLoginFormValid = username.trim() && password.trim();
  const isSignUpFormValid = email.trim() && username.trim() && password.trim();

  // Clear form when switching modes
  const switchToLogin = () => {
    setIsSignUpMode(false);
    setEmail("");
    setFirstName("");
    setUsername("");
    setPassword("");
  };

  const switchToSignUp = () => {
    setIsSignUpMode(true);
    setUsername("");
    setPassword("");
  };

  const switchToForgotPassword = () => {
    setIsSignUpMode(false);
    setUsername("");
    setPassword("");
    navigate("/forgot-password");
  };

  return (
    <div className="auth-page-container">
      {/* Headers to toggle between modes */}
      <div className="auth-toggle">
        <button
          className={`auth-option ${!isSignUpMode ? "selected" : ""}`}
          type="button"
          onClick={switchToLogin}
        >
          {t("login")}
        </button>
        <button
          className={`auth-option ${isSignUpMode ? "selected" : ""}`}
          type="button"
          onClick={switchToSignUp}
        >
          {t("sign_up")}
        </button>
      </div>

      <form
        onSubmit={isSignUpMode ? handleSignUp : handleLogin}
        className="auth-form"
      >
        <div className="auth-inputs">
          {isSignUpMode && (
            <>
              {/* Email */}
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("email")}
                className="auth-input"
                required
              />
              {/* First Name */}
              <input
                id="name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t("first_name")}
                className="auth-input"
                required
              />
            </>
          )}

          {/* Username */}
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("username")}
            className="auth-input"
            required
          />
          {/* Password */}
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("password")}
            className="auth-input"
            required
          />
        </div>

        {/* Forgot Password  */}
        {!isSignUpMode && (
          <div className="auth-links">
            <span onClick={switchToForgotPassword} className="auth-link">
              {t("forgot_password")}
            </span>
          </div>
        )}

        {/* Submit button */}
        <button
          className="header-btn submit-btn"
          type="submit"
          disabled={isSignUpMode ? !isSignUpFormValid : !isLoginFormValid}
        >
          {isSignUpMode ? t("sign_up") : t("login")}
        </button>
      </form>
    </div>
  );
};

export default AuthPage;
