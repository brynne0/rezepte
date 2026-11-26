import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import supabase from "../../lib/supabase";
import { changeEmail, verifyCurrentPassword } from "../../services/auth";
import {
  validateChangeEmailForm,
  validateEmailUniqueForChange,
} from "../../utils/validation";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
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
import PasswordInput from "@/components/PasswordInput/PasswordInput";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog/UnsavedChangesDialog";
import AccountFormCard from "@/components/AccountFormCard/AccountFormCard";

const ChangeEmail = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailRepeat, setNewEmailRepeat] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const hasUnsavedChanges =
    !showSuccessMessage &&
    Boolean(currentPassword || newEmail || newEmailRepeat);

  const {
    isModalOpen: isUnsavedChangesModalOpen,
    confirmNavigation,
    cancelNavigation,
    message: unsavedChangesMessage,
  } = useUnsavedChanges(hasUnsavedChanges, t("unsaved_changes_warning"));

  const handleChangeEmail = async (e) => {
    e.preventDefault();

    const errors = validateChangeEmailForm(
      { currentPassword, newEmail, newEmailRepeat },
      t
    );

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage(t("session_expired"));
        return;
      }

      const { error: verifyError } =
        await verifyCurrentPassword(currentPassword);
      if (verifyError) {
        setValidationErrors((prev) => ({
          ...prev,
          currentPassword: t("current_password_incorrect"),
        }));
        return;
      }

      const emailUniqueError = await validateEmailUniqueForChange(newEmail, t);
      if (emailUniqueError) {
        setValidationErrors((prev) => ({
          ...prev,
          newEmail: emailUniqueError,
        }));
        return;
      }

      const { error } = await changeEmail(newEmail);

      if (error) {
        setErrorMessage(`${t("email_change_failed")}: ${error.message}`);
      } else {
        setShowSuccessMessage(true);
        setCurrentPassword("");
        setNewEmail("");
        setNewEmailRepeat("");
      }

      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    } catch (err) {
      console.error("Email change exception:", err);
      setErrorMessage(`${t("email_change_failed")}: ${err.message}`);

      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-20 max-w-sm">
      <AccountFormCard
        title={t("change_email")}
        success={
          showSuccessMessage && {
            message: t("email_change_requested"),
            actionLabel: t("go_to_settings"),
            onAction: () => navigate("/settings"),
          }
        }
        errorMessage={errorMessage}
      >
        <form onSubmit={handleChangeEmail}>
          <FieldGroup>
            <Field data-invalid={!!validationErrors.currentPassword}>
              <FieldLabel htmlFor="current-password">
                {t("current_password")}
              </FieldLabel>
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrorMessage("");
                  setValidationErrors((prev) => ({
                    ...prev,
                    currentPassword: "",
                  }));
                }}
                aria-invalid={!!validationErrors.currentPassword}
              />
              <FieldError>{validationErrors.currentPassword}</FieldError>
            </Field>

            <Field data-invalid={!!validationErrors.newEmail}>
              <FieldLabel htmlFor="new-email">{t("new_email")}</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Mail />
                </InputGroupAddon>
                <InputGroupInput
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setErrorMessage("");
                    setValidationErrors((prev) => ({
                      ...prev,
                      newEmail: "",
                    }));
                  }}
                  aria-invalid={!!validationErrors.newEmail}
                />
              </InputGroup>
              <FieldError>{validationErrors.newEmail}</FieldError>
            </Field>

            <Field data-invalid={!!validationErrors.newEmailRepeat}>
              <FieldLabel htmlFor="new-email-repeat">
                {t("new_email_repeat")}
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Mail />
                </InputGroupAddon>
                <InputGroupInput
                  id="new-email-repeat"
                  type="email"
                  value={newEmailRepeat}
                  onChange={(e) => {
                    setNewEmailRepeat(e.target.value);
                    setErrorMessage("");
                    setValidationErrors((prev) => ({
                      ...prev,
                      newEmailRepeat: "",
                    }));
                  }}
                  aria-invalid={!!validationErrors.newEmailRepeat}
                />
              </InputGroup>
              <FieldError>{validationErrors.newEmailRepeat}</FieldError>
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

export default ChangeEmail;
