import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import supabase from "../../lib/supabase";
import { changePassword, verifyCurrentPassword } from "../../services/auth";
import {
  validateChangePasswordForm,
  isPasswordStrong,
} from "../../utils/validation";
import PasswordRequirements from "../../components/PasswordRequirements/PasswordRequirements";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

const ChangePasswordPage = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordRepeat, setShowNewPasswordRepeat] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const fromSettings = location.state?.fromSettings || false;

  useEffect(() => {
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
          } else if (!fromSettings) {
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

    // Check if user came from password reset
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken =
      hashParams.get("access_token") || searchParams.get("access_token");
    const refreshToken =
      hashParams.get("refresh_token") || searchParams.get("refresh_token");

    // Initialize session handling
    initializePasswordReset(accessToken, refreshToken);
  }, [fromSettings, t]);

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!isValidSession) {
      setErrorMessage(t("invalid_session"));
      return;
    }

    const errors = validateChangePasswordForm(
      { oldPassword, newPassword, newPasswordRepeat },
      t,
      fromSettings // requireOldPassword when coming from account settings
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
        if (fromSettings && oldPassword) {
          const { error: verifyError } =
            await verifyCurrentPassword(oldPassword);
          if (verifyError) {
            setValidationErrors({
              ...validationErrors,
              oldPassword: t("current_password_incorrect"),
            });
            return;
          }
        }

        const { error } = await changePassword(newPassword);

        if (error) {
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
        console.error("Password change exception:", err);
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
      <div className="mx-auto mt-20 flex w-full max-w-sm flex-col items-center gap-4 px-4 text-center">
        <h3 className="text-lg font-semibold">{t("invalid_reset_link")}</h3>
        <Button onClick={() => navigate("/auth-page")}>
          {t("go_to_login")}
        </Button>
      </div>
    );
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
              <ArrowLeft />
            </Button>
            <h1 className="text-lg font-semibold">{t("set_new_password")}</h1>
          </div>
        </CardHeader>

        <CardContent>
          {showSuccessMessage ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p>{t("password_changed")}</p>
              <Button type="button" onClick={() => navigate("/auth-page")}>
                {t("login")}
              </Button>
            </div>
          ) : (
            <>
              {errorMessage && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleChangePassword}>
                <FieldGroup>
                  {fromSettings && (
                    <Field data-invalid={!!validationErrors.oldPassword}>
                      <FieldLabel htmlFor="old-password">
                        {t("current_password")}
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupAddon>
                          <Lock />
                        </InputGroupAddon>
                        <InputGroupInput
                          id="old-password"
                          type={showOldPassword ? "text" : "password"}
                          value={oldPassword}
                          onChange={(e) => {
                            setOldPassword(e.target.value);
                            setErrorMessage("");
                            setValidationErrors((prev) => ({
                              ...prev,
                              oldPassword: "",
                            }));
                          }}
                          aria-invalid={!!validationErrors.oldPassword}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            type="button"
                            onClick={() => setShowOldPassword((prev) => !prev)}
                            aria-label={
                              showOldPassword
                                ? t("hide_password")
                                : t("show_password")
                            }
                          >
                            {showOldPassword ? <EyeOff /> : <Eye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                      <FieldError>{validationErrors.oldPassword}</FieldError>
                    </Field>
                  )}

                  <Field data-invalid={!!validationErrors.newPassword}>
                    <FieldLabel htmlFor="new-password">
                      {t("new_password")}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Lock />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setErrorMessage("");
                          setValidationErrors((prev) => ({
                            ...prev,
                            newPassword: "",
                          }));
                        }}
                        aria-invalid={!!validationErrors.newPassword}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          aria-label={
                            showNewPassword
                              ? t("hide_password")
                              : t("show_password")
                          }
                        >
                          {showNewPassword ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError>{validationErrors.newPassword}</FieldError>
                    {newPassword && (
                      <PasswordRequirements password={newPassword} />
                    )}
                  </Field>

                  <Field data-invalid={!!validationErrors.newPasswordRepeat}>
                    <FieldLabel htmlFor="new-password-repeat">
                      {t("new_password_repeat")}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Lock />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="new-password-repeat"
                        type={showNewPasswordRepeat ? "text" : "password"}
                        value={newPasswordRepeat}
                        onChange={(e) => {
                          setNewPasswordRepeat(e.target.value);
                          setErrorMessage("");
                          setValidationErrors((prev) => ({
                            ...prev,
                            newPasswordRepeat: "",
                          }));
                        }}
                        aria-invalid={!!validationErrors.newPasswordRepeat}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          onClick={() =>
                            setShowNewPasswordRepeat((prev) => !prev)
                          }
                          aria-label={
                            showNewPasswordRepeat
                              ? t("hide_password")
                              : t("show_password")
                          }
                        >
                          {showNewPasswordRepeat ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError>
                      {validationErrors.newPasswordRepeat}
                    </FieldError>
                  </Field>

                  <Button type="submit" size="lg">
                    {t("confirm")}
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

export default ChangePasswordPage;
