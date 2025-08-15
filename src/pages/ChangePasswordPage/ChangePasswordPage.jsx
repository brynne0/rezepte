import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import supabase from "../../lib/supabase";
import { changePassword, verifyCurrentPassword } from "../../services/auth";
import { validateChangePasswordForm, isPasswordStrong } from "../../utils/validation";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import PasswordRequirements from "../../components/PasswordRequirements/PasswordRequirements";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import { ArrowBigLeft } from "lucide-react";

const ChangePasswordPage = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const fromAccountSettings = location.state?.fromAccountSettings || false;

  useEffect(() => {
    // Check if user came from password reset
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken =
      hashParams.get("access_token") || searchParams.get("access_token");
    const refreshToken =
      hashParams.get("refresh_token") || searchParams.get("refresh_token");

    // Initialize session handling
    initializePasswordReset(accessToken, refreshToken);
  }, []);

  const initializePasswordReset = async (accessToken, refreshToken) => {
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
          await supabase.auth.getUser();
        } else {
          setErrorMessage(t("invalid_reset_link"));
        }
      } else {
        // Check if there's already a valid session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setIsValidSession(true);

          // Verify the session is working
          await supabase.auth.getUser();
        } else if (!fromAccountSettings) {
          setErrorMessage(t("invalid_reset_link"));
        } else {
          setErrorMessage(t("session_expired"));
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
      { oldPassword, newPassword, newPasswordRepeat },
      t,
      fromAccountSettings // requireOldPassword when coming from account settings
    );

    // Check password strength
    if (!isPasswordStrong(newPassword)) {
      errors.newPassword = t("password_requirements_not_met");
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        // Double-check session right before password change
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setErrorMessage(t("session_expired"));
          return;
        }

        // Verify old password if coming from account settings
        if (fromAccountSettings && oldPassword) {
          const { error: verifyError } = await verifyCurrentPassword(
            oldPassword
          );
          if (verifyError) {
            setValidationErrors({
              ...validationErrors,
              oldPassword: t("current_password_incorrect"),
            });
            return;
          }
        }

        const { error } = await changePassword(newPassword);

        console.error("Password change response error:", error);

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
        <h3>{t("invalid_reset_link")}</h3>
        <button
          className="btn btn-standard"
          onClick={() => navigate("/auth-page")}
        >
          {t("go_to_login")}
        </button>
      </div>
    );
  }

  return (
    <div className="page-centered">
      {showSuccessMessage ? (
        <div className="flex-column-center">
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
          <div className="flex-row">
            <ArrowBigLeft
              className="back-arrow-left"
              onClick={() => navigate(-1)}
            />
            <h1 className="forta-small">
              {t("set_new_password").toUpperCase()}
            </h1>
          </div>
          {errorMessage && (
            <span className="error-message">{errorMessage}</span>
          )}

          {fromAccountSettings && (
            <div className="input-validation-wrapper">
              <div className="floating-label-input">
                <PasswordInput
                  id="old-password"
                  value={oldPassword}
                  onChange={(e) => {
                    setOldPassword(e.target.value);
                    setErrorMessage("");
                    setValidationErrors((prev) => ({
                      ...prev,
                      oldPassword: "",
                    }));
                  }}
                  placeholder=" "
                  className={`input input--cream ${
                    validationErrors.oldPassword ? "input--error" : ""
                  }`}
                />
                <label htmlFor="old-password">{t("current_password")}</label>
              </div>
              {validationErrors.oldPassword && (
                <span className="error-message-small">
                  {validationErrors.oldPassword}
                </span>
              )}
            </div>
          )}
          <div className="input-validation-wrapper">
            <div className="floating-label-input">
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrorMessage("");
                  setValidationErrors((prev) => ({ ...prev, newPassword: "" }));
                }}
                placeholder=" "
                className={`input input--cream ${
                  validationErrors.newPassword ? "input--error" : ""
                }`}
              />
              <label htmlFor="new-password">{t("new_password")}</label>
            </div>
            {validationErrors.newPassword && (
              <span className="error-message-small">
                {validationErrors.newPassword}
              </span>
            )}
          </div>
          <div className="input-validation-wrapper">
            <div className="floating-label-input">
              <PasswordInput
                id="new-password-repeat"
                value={newPasswordRepeat}
                onChange={(e) => {
                  setNewPasswordRepeat(e.target.value);
                  setErrorMessage("");
                  setValidationErrors((prev) => ({
                    ...prev,
                    newPasswordRepeat: "",
                  }));
                }}
                placeholder=" "
                className={`input input--cream ${
                  validationErrors.newPasswordRepeat ? "input--error" : ""
                }`}
              />
              <label htmlFor="new-password-repeat">
                {t("new_password_repeat")}
              </label>
            </div>
            {validationErrors.newPasswordRepeat && (
              <span className="error-message-small">
                {validationErrors.newPasswordRepeat}
              </span>
            )}
          </div>

          {newPassword && (
            <PasswordRequirements password={newPassword} />
          )}

          <button className={"btn btn-standard"} type="submit">
            {t("confirm")}
          </button>
        </form>
      )}
    </div>
  );
};

export default ChangePasswordPage;
