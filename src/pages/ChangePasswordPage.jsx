import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import supabase from "../lib/supabase";
import { changePassword } from "../services/auth";
import { validateChangePasswordForm } from "../utils/validation";
import PasswordInput from "../components/PasswordInput";

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
    console.log("=== CHANGE PASSWORD PAGE DEBUG ===");
    console.log("Current URL:", window.location.href);
    console.log("URL Hash:", window.location.hash);
    console.log("URL Search:", window.location.search);

    // Check if user came from password reset
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    console.log("Hash params:", Object.fromEntries(hashParams));
    console.log("Search params:", Object.fromEntries(searchParams));

    const accessToken =
      hashParams.get("access_token") || searchParams.get("access_token");
    const type = hashParams.get("type") || searchParams.get("type");
    const refreshToken =
      hashParams.get("refresh_token") || searchParams.get("refresh_token");

    console.log("Access token:", accessToken);
    console.log("Refresh token:", refreshToken);
    console.log("Type:", type);

    // Initialize session handling
    initializePasswordReset(accessToken, refreshToken, type);
  }, []);

  const initializePasswordReset = async (accessToken, refreshToken, type) => {
    try {
      console.log("=== INITIALIZE PASSWORD RESET DEBUG ===");
      console.log("Access token exists:", !!accessToken);
      console.log("Refresh token exists:", !!refreshToken);
      console.log("Type:", type);

      // If we have tokens from URL, set the session FIRST
      if (accessToken && refreshToken) {
        console.log("Setting session from URL tokens...");
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        console.log("Set session result:", data);
        console.log("Set session error:", error);

        if (!error && data.session) {
          setIsValidSession(true);
          console.log("Password reset session established successfully");

          // Verify the session is working
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          console.log("User after setting session:", user);
          console.log("User error after setting session:", userError);
        } else {
          console.error("Failed to establish session:", error);
          setErrorMessage(t("invalid_reset_link") || "Invalid reset link");
        }
      } else {
        // Check if there's already a valid session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        console.log("Existing session:", session);
        console.log("Session error:", sessionError);

        if (session) {
          setIsValidSession(true);
          console.log("Using existing authenticated session");

          // Verify the session is working
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          console.log("User from existing session:", user);
          console.log("User error from existing session:", userError);
        } else {
          console.log("No valid session found for password reset");
          setErrorMessage(t("invalid_reset_link") || "Invalid reset link");
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate("/auth-page");
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Error initializing password reset:", error);
      setErrorMessage(t("invalid_reset_link") || "Invalid reset link");
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
        console.log("=== PASSWORD CHANGE DEBUG ===");
        console.log("Attempting to change password...");
        console.log("New password length:", newPassword.length);

        // Double-check session right before password change
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        console.log("Current session before password change:", session);
        console.log("Session error:", sessionError);

        if (!session) {
          console.error("No session available for password change");
          setErrorMessage(
            t("session_expired") || "Session expired, please try again"
          );
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
          console.log("Password changed successfully");
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
        <div>
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
