import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { forgotPassword } from "../../services/auth";
import { validateForgotPasswordForm } from "../../utils/validation";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const ForgotPasswordPage = () => {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [sentToEmail, setSentToEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const { t } = useTranslation();
  const navigate = useNavigate();

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

  const handleResendResetEmail = async () => {
    setIsResending(true);
    setResendMessage("");

    const { error } = await forgotPassword(sentToEmail);

    setIsResending(false);
    setResendMessage(
      error ? t("resend_reset_email_failed") : t("resend_reset_email_sent")
    );

    setTimeout(() => {
      setResendMessage("");
    }, 3000);
  };

  if (loading) {
    return <LoadingAcorn />;
  }

  return (
    <div className="mx-auto mt-20 w-full max-w-sm px-4">
      <Card className="w-full">
        <CardHeader className="flex flex-col items-stretch gap-4">
          <div className="relative flex w-full items-center justify-center">
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute left-0"
              onClick={() => navigate(-1)}
              aria-label={t("go_back")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="text-lg font-semibold">{t("reset_password")}</h1>
          </div>
        </CardHeader>

        <CardContent>
          {showSuccessMessage ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p>{t("password_reset_sent")}</p>
              <p className="text-muted-foreground">{sentToEmail}</p>
              <Button
                type="button"
                onClick={handleResendResetEmail}
                disabled={isResending}
              >
                {isResending && <Spinner />}
                {isResending
                  ? t("resending_reset_email")
                  : t("resend_reset_email")}
              </Button>
              {resendMessage && (
                <p className="text-xs text-muted-foreground">{resendMessage}</p>
              )}
            </div>
          ) : (
            <>
              {errorMessage && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleForgotPassword}>
                <FieldGroup>
                  <Field data-invalid={!!validationErrors.email}>
                    <FieldLabel htmlFor="reset-email">{t("email")}</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Mail />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="reset-email"
                        type="text"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setValidationErrors((prev) => ({
                            ...prev,
                            email: "",
                          }));
                        }}
                        aria-invalid={!!validationErrors.email}
                      />
                    </InputGroup>
                    <FieldError>{validationErrors.email}</FieldError>
                  </Field>

                  <Button type="submit" size="lg" disabled={loading}>
                    {loading && <Spinner />}
                    {t("send_reset_email")}
                  </Button>
                </FieldGroup>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
