import { useState } from "react";
import { useTranslation } from "react-i18next";
import { forgotPassword } from "../../services/auth";
import { validateForgotPasswordForm } from "../../utils/validation";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [sentToEmail, setSentToEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    const errors = validateForgotPasswordForm(email, t);
    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        setLoading(true);
        const { error } = await forgotPassword(email);

        if (error) {
          setErrorMessage(t("password_reset_failed"));
        } else {
          setErrorMessage("");
          setSentToEmail(email);
          setShowSuccessMessage(true);
          setEmail("");
        }
      } catch (err) {
        setErrorMessage(t("password_reset_failed"));
        console.error(err);
      } finally {
        setLoading(false);
      }

      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    }
  };

  if (loading) {
    return <LoadingAcorn />;
  }

  return (
    <div className="page-centered">
      {showSuccessMessage ? (
        <div className="flex-column">
          <span>{t("password_reset_sent")}</span>
          <strong>{sentToEmail}</strong>
        </div>
      ) : (
        <form onSubmit={handleForgotPassword} className="auth-form">
          <h2 className="forta">{t("reset_password")}</h2>
          {/* Error message */}
          {errorMessage && (
            <span className="error-message">{errorMessage}</span>
          )}

          {/* Email input */}
          <div className="input-wrapper">
            <input
              className={`input input--cream ${
                validationErrors.email ? "input--error" : ""
              }`}
              id="reset-email"
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setValidationErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder={t("email")}
            />
          </div>
          {/* Email validation error */}
          {validationErrors.email && (
            <span className="error-message-small">
              {validationErrors.email}
            </span>
          )}

          {/* Submit button */}
          <button
            className={"btn btn-standard"}
            type="submit"
            disabled={loading}
          >
            {t("send_reset_email")}
          </button>
        </form>
      )}
    </div>
  );
};

export default ForgotPasswordPage;
