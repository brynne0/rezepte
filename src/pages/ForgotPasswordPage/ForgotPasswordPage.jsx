import { useState } from "react";
import { useTranslation } from "react-i18next";
import { forgotPassword } from "../../services/auth";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const { t } = useTranslation();

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage(t("email_required"));
      return;
    }

    try {
      const { error } = await forgotPassword(email);

      if (error) {
        setErrorMessage(t("password_reset_failed"));
      } else {
        setErrorMessage();
        setShowSuccessMessage(true);
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
    <div className="page-layout flex-center">
      {showSuccessMessage ? (
        <h3>{t("password_reset_sent")}</h3>
      ) : (
        <form onSubmit={handleForgotPassword} className="auth-form">
          <h2 className="forta">{t("reset_password")}</h2>
          <div className="input-wrapper input-wrapper-sm">
            <input
              className="input input--cream"
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email")}
              required
            />
          </div>

          {errorMessage && <div>{errorMessage}</div>}
          <button
            className={"btn btn-standard"}
            type="submit"
            disabled={!isForgotPasswordFormValid}
          >
            {t("send_reset_email")}
          </button>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
