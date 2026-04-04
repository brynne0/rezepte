import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Mail, User, ChefHat, Lock, ArrowBigLeft } from "lucide-react";
import { signUp, signIn, signInWithGoogle } from "../../services/auth";
import {
  validateAuthForm,
  validateUsernameUnique,
  validateEmailUnique,
  isPasswordStrong,
} from "../../utils/validation";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import PasswordRequirements from "../../components/PasswordRequirements/PasswordRequirements";

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
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");

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

    setIsLoading(true);
    const { error } = await signIn(username, password);

    if (error) {
      setIsLoading(false);
      // Handle specific error types
      switch (error.type) {
        case "USER_NOT_FOUND":
          setValidationErrors({ username: t(error.translationKey) });
          break;
        case "INVALID_PASSWORD":
          setValidationErrors({ password: t(error.translationKey) });
          break;
        case "EMAIL_NOT_CONFIRMED":
        case "TOO_MANY_REQUESTS":
        case "GENERAL_ERROR":
        default:
          setErrorMessage(t(error.translationKey));
          break;
      }
    } else {
      setLoginMessage(t("login_success"));

      // Wait for recipes to load before navigating
      setTimeout(() => {
        // Clear form fields and navigate
        setUsername("");
        setPassword("");
        navigate("/");
      }, 1000);
    }

    setTimeout(() => {
      // Reset login message
      setLoginMessage("");
      setErrorMessage("");
      setValidationErrors({});
    }, 3000);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!handleValidation()) {
      return;
    }

    setIsLoading(true);

    // Collect all validation errors at once
    const errors = {};

    // Check password strength for signup
    if (!isPasswordStrong(password)) {
      errors.password = t("password_requirements_not_met");
    }

    // Check for username and email uniqueness
    const usernameError = await validateUsernameUnique(username, t);
    const emailError = await validateEmailUnique(email, t);

    if (usernameError) {
      errors.username = usernameError;
    }
    if (emailError) {
      errors.email = emailError;
    }

    // If there are any validation errors, show them all and return
    if (Object.keys(errors).length > 0) {
      setIsLoading(false);
      setValidationErrors({
        ...validationErrors,
        ...errors,
      });
      return;
    }

    const { error } = await signUp(email, firstName, username, password);

    if (error) {
      setIsLoading(false);
      setErrorMessage(t("signup_failed"));
    } else {
      setIsLoading(false);
      setSentToEmail(email);
      setEmail("");
      setFirstName("");
      setUsername("");
      setPassword("");
      setAwaitingConfirmation(true);
    }
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
        {awaitingConfirmation ? (
          <div className="flex-column">
            <span>{t("signup_success")}</span>
            <strong>{sentToEmail}</strong>
          </div>
        ) : (
          <>
            {/* Headers to toggle between modes */}
            <header className="flex-row">
              <button
                className="btn-unstyled back-arrow"
                onClick={() => navigate(-1)}
                aria-label={t("go_back")}
              >
                <ArrowBigLeft size={28} />
              </button>
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

            {errorMessage && (
              <span className="error-message">{errorMessage}</span>
            )}

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
                          setValidationErrors((prev) => ({
                            ...prev,
                            email: "",
                          }));
                        }}
                        placeholder=" "
                        className={`input input--secondary input--with-icon ${
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
                        className={`input input--secondary input--with-icon ${
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
                      setValidationErrors((prev) => ({
                        ...prev,
                        username: "",
                      }));
                    }}
                    placeholder=" "
                    className={`input input--secondary input--with-icon ${
                      validationErrors.username ? "input--error" : ""
                    }`}
                  />
                  <label htmlFor="username">
                    {isSignUpMode ? t("username") : t("username_or_email")}
                  </label>
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
                      setValidationErrors((prev) => ({
                        ...prev,
                        password: "",
                      }));
                    }}
                    placeholder=" "
                    className={`input input--secondary input--with-icon ${
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
                {isSignUpMode && password && (
                  <PasswordRequirements password={password} />
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
                disabled={isLoading}
              >
                {isLoading
                  ? isSignUpMode
                    ? t("signing_up")
                    : t("logging_in")
                  : isSignUpMode
                    ? t("signup")
                    : t("login")}
              </button>
            </form>

            <span className="auth-divider">{t("or")}</span>

            <button
              type="button"
              className="btn btn-google"
              onClick={signInWithGoogle}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                  fill="#34A853"
                />
                <path
                  d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"
                  fill="#EA4335"
                />
              </svg>
              {t("continue_with_google")}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
