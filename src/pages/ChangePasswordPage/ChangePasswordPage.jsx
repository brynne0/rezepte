import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import supabase from "../../lib/supabase";
import { changePassword } from "../../services/auth";
import { validateChangePasswordForm } from "../../utils/validation";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";

const ChangePasswordPage = () => {
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user came from password reset
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken =
      hashParams.get("access_token") || searchParams.get("access_token");
    const type = hashParams.get("type") || searchParams.get("type");
    const refreshToken =
      hashParams.get("refresh_token") || searchParams.get("refresh_token");

    // Initialize session handling
    initializePasswordReset(accessToken, refreshToken, type);
  }, []);

  const initializePasswordReset = async (accessToken, refreshToken, type) => {
    try {
      // If we have tokens from URL, set the session FIRST
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error && data.session) {
          setIsValidSession(true);

          // Verify the session is working
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
        } else {
          setErrorMessage(t("invalid_reset_link"));
        }
      } else {
        // Check if there's already a valid session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (session) {
          setIsValidSession(true);

          // Verify the session is working
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
        } else {
          setErrorMessage(t("invalid_reset_link"));
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/auth-page");
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Error initializing password reset:", error);
      setErrorMessage(t("invalid_reset_link"));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!isValidSession) {
      setErrorMessage(t("invalid_session"));
      return;
    }

    const errors = validateChangePasswordForm(
      { newPassword, newPasswordRepeat },
      t
    );
    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        // Double-check session right before password change
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!session) {
          setErrorMessage(t("session_expired"));
          return;
        }

        const { error } = await changePassword(newPassword);

        console.log("Password change response error:", error);

        if (error) {
          console.error("Password change error details:", {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            name: error.name,
            stack: error.stack,
          });
          setErrorMessage(`${t("password_change_failed")}: ${error.message}`);
        } else {
          setShowSuccessMessage(true);
          setNewPassword("");
          setNewPasswordRepeat("");
        }

        setTimeout(() => {
          setErrorMessage("");
        }, 3000);
      } catch (err) {
        console.error("Password change exception details:", {
          message: err.message,
          name: err.name,
          stack: err.stack,
        });
        setErrorMessage(`${t("password_change_failed")}: ${err.message}`);

        setTimeout(() => {
          setErrorMessage("");
        }, 3000);
      }
    }
  };

  if (loading) {
    return <LoadingAcorn />;
  }

  if (!isValidSession && !showSuccessMessage) {
    return (
      <div className="page-centered">
        <div>
          <h3>{t("invalid_reset_link")}</h3>
          <p>{t("redirecting_to_login")}</p>
          <button
            className="btn btn-standard"
            onClick={() => navigate("/auth-page")}
          >
            {t("go_to_login")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-centered">
      {showSuccessMessage ? (
        <div className="flex-center">
          <p>{t("password_changed")}</p>
          <button
            className={"btn btn-standard"}
            type="button"
            onClick={() => navigate("/auth-page")}
          >
            {t("login")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleChangePassword} className="auth-form">
          <h2 className="forta">{t("set_new_password")}</h2>
          {errorMessage && (
            <span className="error-message">{errorMessage}</span>
          )}
          <div className="input-wrapper">
            <label htmlFor="new-password">{t("new_password")}</label>
            <PasswordInput
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setErrorMessage("");
                setValidationErrors((prev) => ({ ...prev, newPassword: "" }));
              }}
              placeholder={t("new_password")}
              className={`input input--cream ${
                validationErrors.newPassword ? "input--error" : ""
              }`}
            />
            {validationErrors.newPassword && (
              <span className="error-message-small">
                {validationErrors.newPassword}
              </span>
            )}
            <label htmlFor="new-password-repeat">{t("new_password_repeat")}</label>
            <PasswordInput
              id="new-password-repeat"
              type="password"
              value={newPasswordRepeat}
              onChange={(e) => {
                setNewPasswordRepeat(e.target.value);
                setErrorMessage("");
                setValidationErrors((prev) => ({
                  ...prev,
                  newPasswordRepeat: "",
                }));
              }}
              placeholder={t("new_password_repeat")}
              className={`input input--cream ${
                validationErrors.newPasswordRepeat ? "input--error" : ""
              }`}
            />
            {validationErrors.newPasswordRepeat && (
              <span className="error-message-small">
                {validationErrors.newPasswordRepeat}
              </span>
            )}
          </div>
          <button className={"btn btn-standard"} type="submit">
            {t("confirm")}
          </button>
        </form>
      )}
    </div>
  );
};

export default ChangePasswordPage;
