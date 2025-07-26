import { useState } from "react";
import { useTranslation } from "react-i18next";
import { changePassword } from "../../services/auth";
import { useNavigate } from "react-router-dom";
import { validateChangePasswordForm } from "../../services/validation";

const ChangePasswordPage = () => {
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleChangePassword = async (e) => {
    e.preventDefault();

    const errors = validateChangePasswordForm(
      { newPassword, newPasswordRepeat },
      t
    );
    setValidationErrors(errors);
    if (Object.keys(errors).length === 0) {
      try {
        const { error } = await changePassword(newPassword);

        if (error) {
          setErrorMessage(t("password_change_failed"));
        } else {
          setShowSuccessMessage(true);
          setNewPassword("");
          setNewPasswordRepeat("");
        }

        setTimeout(() => {
          setErrorMessage("");
        }, 3000);
      } catch (err) {
        setErrorMessage(t("password_change_failed"));
        console.error(err);

        setTimeout(() => {
          setErrorMessage("");
        }, 3000);
      }
    }
  };

  return (
    <div className="page-layout flex-center">
      {showSuccessMessage ? (
        <div>
          <h3>{t("password_changed")}</h3>
          {/* Login button after successful password change */}
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
          {/* Error message */}
          {errorMessage && (
            <span className="error-message">{errorMessage}</span>
          )}
          {/* New password */}
          <div className="input-wrapper input-wrapper-sm">
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setErrorMessage(""); // Clear error message
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
            {/* New password repeat */}
            <input
              id="new-password-repeat"
              type="password"
              value={newPasswordRepeat}
              onChange={(e) => {
                setNewPasswordRepeat(e.target.value);
                setErrorMessage(""); // Clear error message
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

          {/* Submit button */}
          <button className={"btn btn-standard"} type="submit">
            {t("confirm")}
          </button>
        </form>
      )}
    </div>
  );
};

export default ChangePasswordPage;
