import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { signUp, signIn } from "../services/auth";
import { validateAuthForm } from "../utils/validation";
import PasswordInput from "../components/PasswordInput";

const AuthPage = ({ setLoginMessage }) => {
  // Form input states
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Error message
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Toggle between different modes
  const [isSignUpMode, setIsSignUpMode] = useState(false);

  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleValidation = () => {
    const formData = { email, firstName, username, password };
    const errors = validateAuthForm(formData, isSignUpMode, t);

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!handleValidation()) {
      return;
    }

    const { error } = await signIn(username, password);

    if (error) {
      setErrorMessage(t("login_failed"));
    } else {
      setLoginMessage(t("login_success"));

      // Navigate on successful login
      navigate("/");
    }

    setTimeout(() => {
      // Reset login message
      setLoginMessage("");
      setErrorMessage("");
    }, 3000);

    setUsername("");
    setPassword("");
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!handleValidation()) {
      return;
    }

    const { error } = await signUp(email, firstName, username, password);

    if (error) {
      setErrorMessage(t("signup_failed"));
    } else {
      setLoginMessage(t("signup_success"));
      // Navigate on successful sign up
      navigate("/");
    }

    setTimeout(() => {
      // Reset login message
      setLoginMessage("");
      setErrorMessage("");
    }, 3000);

    setEmail("");
    setFirstName("");
    setUsername("");
    setPassword("");
  };

  // Clear form when switching modes
  const switchToLogin = () => {
    setIsSignUpMode(false);
    setEmail("");
    setFirstName("");
    setUsername("");
    setPassword("");
    setValidationErrors({});
  };

  const switchToSignUp = () => {
    setIsSignUpMode(true);
    setUsername("");
    setPassword("");
    setValidationErrors({});
  };

  const switchToForgotPassword = () => {
    setIsSignUpMode(false);
    setUsername("");
    setPassword("");
    setValidationErrors({});
    navigate("/forgot-password");
  };

  return (
    <div className="page-centered">
      {/* Headers to toggle between modes */}
      <header>
        <button
          className={`subheading-wrapper ${!isSignUpMode ? "selected" : ""}`}
          type="button"
          onClick={switchToLogin}
        >
          <h2 className="forta"> {t("login")}</h2>
        </button>
        <button
          className={`subheading-wrapper ${isSignUpMode ? "selected" : ""}`}
          type="button"
          onClick={switchToSignUp}
        >
          <h2 className="forta"> {t("sign_up")}</h2>
        </button>
      </header>

      {errorMessage && <span className="error-message">{errorMessage}</span>}

      <form
        onSubmit={isSignUpMode ? handleSignUp : handleLogin}
        className="auth-form"
      >
        <div className="input-wrapper">
          {isSignUpMode && (
            <>
              {/* Email */}

              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder={t("email")}
                className={`input input--cream ${
                  validationErrors.email ? "input--error" : ""
                }`}
              />
              {validationErrors.email && (
                <span className="error-message-small">
                  {validationErrors.email}
                </span>
              )}
              {/* First Name */}
              <input
                id="name"
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, firstName: "" }));
                }}
                placeholder={t("first_name")}
                className={`input input--cream ${
                  validationErrors.firstName ? "input--error" : ""
                }`}
              />
              {validationErrors.firstName && (
                <span className="error-message-small">
                  {validationErrors.firstName}
                </span>
              )}
            </>
          )}

          {/* Username */}
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setValidationErrors((prev) => ({ ...prev, username: "" }));
            }}
            placeholder={t("username")}
            className={`input input--cream ${
              validationErrors.username ? "input--error" : ""
            }`}
          />
          {validationErrors.username && (
            <span className="error-message-small">
              {validationErrors.username}
            </span>
          )}
          {/* Password */}
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setValidationErrors((prev) => ({ ...prev, password: "" }));
            }}
            placeholder={t("password")}
            className={`input input--cream ${
              validationErrors.password ? "input--error" : ""
            }`}
          />
          {validationErrors.password && (
            <span className="error-message-small">
              {validationErrors.password}
            </span>
          )}
        </div>

        {/* Forgot Password  */}
        {!isSignUpMode && (
          <span onClick={switchToForgotPassword} className="link">
            {t("forgot_password")}
          </span>
        )}

        {/* Submit button */}
        <button type="submit" className={"btn btn-standard"}>
          {isSignUpMode ? t("sign_up") : t("login")}
        </button>
      </form>
    </div>
  );
};

export default AuthPage;
