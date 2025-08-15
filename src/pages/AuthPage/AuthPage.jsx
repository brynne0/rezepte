import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Mail, User, ChefHat, Lock, ArrowBigLeft } from "lucide-react";
import { signUp, signIn } from "../../services/auth";
import {
  validateAuthForm,
  validateUsernameUnique,
  validateEmailUnique,
} from "../../utils/validation";
import PasswordInput from "../../components/PasswordInput/PasswordInput";

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

    // Check for username and email uniqueness
    const usernameError = await validateUsernameUnique(username, t);
    const emailError = await validateEmailUnique(email, t);

    if (usernameError || emailError) {
      setValidationErrors({
        ...validationErrors,
        ...(usernameError && { username: usernameError }),
        ...(emailError && { email: emailError }),
      });
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
      <div className="auth-container">
        {/* Headers to toggle between modes */}
        <header className="flex-row">
          <ArrowBigLeft
            className="back-arrow-left"
            onClick={() => navigate(-1)}
          />
          <button
            className={`subheading-wrapper ${!isSignUpMode ? "selected" : ""}`}
            type="button"
            onClick={switchToLogin}
            aria-label={t("login")}
          >
            <h1 className="forta-small"> {t("login")}</h1>
          </button>
          <button
            className={`subheading-wrapper ${isSignUpMode ? "selected" : ""}`}
            type="button"
            onClick={switchToSignUp}
            aria-label={t("signup")}
          >
            <h1 className="forta-small"> {t("signup")}</h1>
          </button>
        </header>

        {errorMessage && <span className="error-message">{errorMessage}</span>}

        <form
          className="auth-form"
          onSubmit={isSignUpMode ? handleSignUp : handleLogin}
          data-testid="auth-form"
        >
          {isSignUpMode && (
            <>
              {/* Email */}
              <div className="input-validation-wrapper">
                <div className="input-with-icon floating-label-input">
                  <Mail size={20} />
                  <input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setValidationErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    placeholder=" "
                    className={`input input--cream input--with-icon ${
                      validationErrors.email ? "input--error" : ""
                    }`}
                  />
                  <label htmlFor="email">{t("email")}</label>
                </div>
                {validationErrors.email && (
                  <span className="error-message-small">
                    {validationErrors.email}
                  </span>
                )}
              </div>
              {/* First Name */}
              <div className="input-validation-wrapper">
                <div className="input-with-icon floating-label-input">
                  <User size={20} />
                  <input
                    id="name"
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setValidationErrors((prev) => ({
                        ...prev,
                        firstName: "",
                      }));
                    }}
                    placeholder=" "
                    className={`input input--cream input--with-icon ${
                      validationErrors.firstName ? "input--error" : ""
                    }`}
                  />
                  <label htmlFor="name">{t("first_name")}</label>
                </div>
                {validationErrors.firstName && (
                  <span className="error-message-small">
                    {validationErrors.firstName}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Username */}
          <div className="input-validation-wrapper">
            <div className="input-with-icon floating-label-input">
              <ChefHat size={20} />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, username: "" }));
                }}
                placeholder=" "
                className={`input input--cream input--with-icon ${
                  validationErrors.username ? "input--error" : ""
                }`}
              />
              <label htmlFor="username">{t("username")}</label>
            </div>
            {validationErrors.username && (
              <span className="error-message-small">
                {validationErrors.username}
              </span>
            )}
          </div>
          {/* Password */}
          <div className="input-validation-wrapper">
            <div className="input-with-icon floating-label-input">
              <Lock size={20} />
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder=" "
                className={`input input--cream input--with-icon ${
                  validationErrors.password ? "input--error" : ""
                }`}
              />
              <label htmlFor="password">{t("password")}</label>
            </div>
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
          <button
            type="submit"
            aria-label="submit-button"
            className={"btn btn-standard"}
          >
            {isSignUpMode ? t("signup") : t("login")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
