import { useState } from "react";
import { useTranslation } from "react-i18next";
import { changePassword } from "../../services/auth";
import { useNavigate } from "react-router-dom";

const ChangePasswordPage = () => {
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!newPassword.trim() || !newPasswordRepeat.trim()) {
      setErrorMessage(t("password_required"));
      return;
    }

    if (newPassword !== newPasswordRepeat) {
      setErrorMessage(t("passwords_do_not_match"));
      setNewPasswordRepeat("");
      return;
    }

    try {
      const { error } = await changePassword(newPassword);

      if (error) {
        setErrorMessage(t("password_change_failed"));
      } else {
        setShowSuccessMessage(true);
        setNewPassword("");
        setNewPasswordRepeat("");
      }
    } catch (err) {
      setErrorMessage(t("password_change_failed"));
      console.err(err);
    }

    setTimeout(() => {
      setErrorMessage("");
    }, 3000);
  };

  const isChangePasswordFormValid =
    newPassword.trim() && newPasswordRepeat.trim();

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
          <div className="input-wrapper input-wrapper-sm">
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setErrorMessage(""); // Clear error message
              }}
              placeholder={t("new_password")}
              className="input input--cream"
              required
            />
            <input
              id="new-password-repeat"
              type="password"
              value={newPasswordRepeat}
              onChange={(e) => {
                {
                  setNewPasswordRepeat(e.target.value);
                  setErrorMessage(""); // Clear error message
                }
              }}
              placeholder={t("new_password_repeat")}
              className="input input--cream"
              required
            />
          </div>

          {errorMessage && <div>{errorMessage}</div>}
          <button
            className={"btn btn-standard"}
            type="submit"
            disabled={!isChangePasswordFormValid}
          >
            {t("confirm")}
          </button>
        </form>
      )}
    </div>
  );
};

export default ChangePasswordPage;
