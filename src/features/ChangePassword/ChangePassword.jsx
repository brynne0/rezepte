import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import supabase from "../../lib/supabase";
import {
  changePassword,
  verifyCurrentPassword,
  signOut,
} from "../../services/auth";
import {
  validateChangePasswordForm,
  isPasswordStrong,
} from "../../utils/validation";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
import PasswordRequirements from "../../components/PasswordRequirements/PasswordRequirements";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import PasswordInput from "@/components/PasswordInput/PasswordInput";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog/UnsavedChangesDialog";
import AccountFormCard from "@/components/AccountFormCard/AccountFormCard";

const ChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const fromSettings = location.state?.fromSettings || false;

  const hasUnsavedChanges =
    !showSuccessMessage &&
    Boolean(oldPassword || newPassword || newPasswordRepeat);

  const {
    isModalOpen: isUnsavedChangesModalOpen,
    confirmNavigation,
    cancelNavigation,
    message: unsavedChangesMessage,
  } = useUnsavedChanges(hasUnsavedChanges, t("unsaved_changes_warning"));

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
    void initializePasswordReset(accessToken, refreshToken);
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
      setIsSubmitting(true);
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
          await signOut();
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
      } finally {
        setIsSubmitting(false);
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
        <Button onClick={() => navigate("/login")}>{t("go_to_login")}</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-20 max-w-sm">
      <AccountFormCard
        title={t("set_new_password")}
        success={
          showSuccessMessage && {
            message: t("password_changed"),
            actionLabel: t("login"),
            onAction: () => navigate("/login"),
          }
        }
        errorMessage={errorMessage}
      >
        <form onSubmit={handleChangePassword}>
          <FieldGroup>
            {fromSettings && (
              <Field data-invalid={!!validationErrors.oldPassword}>
                <FieldLabel htmlFor="old-password">
                  {t("current_password")}
                </FieldLabel>
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
                  aria-invalid={!!validationErrors.oldPassword}
                />
                <FieldError>{validationErrors.oldPassword}</FieldError>
              </Field>
            )}

            <Field data-invalid={!!validationErrors.newPassword}>
              <FieldLabel htmlFor="new-password">
                {t("new_password")}
              </FieldLabel>
              <PasswordInput
                id="new-password"
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
              <FieldError>{validationErrors.newPassword}</FieldError>
              {newPassword && <PasswordRequirements password={newPassword} />}
            </Field>

            <Field data-invalid={!!validationErrors.newPasswordRepeat}>
              <FieldLabel htmlFor="new-password-repeat">
                {t("new_password_repeat")}
              </FieldLabel>
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
                aria-invalid={!!validationErrors.newPasswordRepeat}
              />
              <FieldError>{validationErrors.newPasswordRepeat}</FieldError>
            </Field>

            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {t("confirm")}
            </Button>
          </FieldGroup>
        </form>
      </AccountFormCard>

      <UnsavedChangesDialog
        open={isUnsavedChangesModalOpen}
        message={unsavedChangesMessage}
        onLeave={confirmNavigation}
        onStay={cancelNavigation}
      />
    </div>
  );
};

export default ChangePassword;
