import { useState } from "react";
import { useTranslation } from "react-i18next";
import { resetPassword } from "../../services/auth";
import "./ForgotPasswordPage.css";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { t } = useTranslation();

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage(t("email_required"));
      return;
    }

    try {
      const { error } = await resetPassword(email);

      if (error) {
        setErrorMessage(t("password_reset_failed"));
      } else {
        setErrorMessage(t("password_reset_sent"));
        setEmail("");
        // Switch back to login mode after sending reset email
      }
    } catch (err) {
      setErrorMessage(t("password_reset_failed"));
      console.err(err);
    }

    setTimeout(() => {
      setErrorMessage("");
    }, 3000);
  };

  const isForgotPasswordFormValid = email.trim();

  return (
    <div className="forgot-password-page-container">
      <form onSubmit={handleForgotPassword} className="auth-form">
        <h2 className="forgot-password-header">{t("reset_password")}</h2>
        <div className="auth-inputs">
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email")}
            className="auth-input"
            required
          />
        </div>
        {/* TODO - update the error/succuess message display below and hide the rest of the form? */}
        {errorMessage && <div>{errorMessage}</div>}
        <button
          className="header-btn submit-btn"
          type="submit"
          disabled={!isForgotPasswordFormValid}
        >
          {t("send_reset_email")}
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
