import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import supabase from "../../lib/supabase";
import { changeEmail, verifyCurrentPassword } from "../../services/auth";
import {
  validateChangeEmailForm,
  validateEmailUniqueForChange,
} from "../../utils/validation";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
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
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const ChangeEmailPage = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailRepeat, setNewEmailRepeat] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
            <h1 className="text-lg font-semibold">{t("change_email")}</h1>
          </div>
        </CardHeader>

        <CardContent>
          {showSuccessMessage ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p>{t("email_change_requested")}</p>
              <Button type="button" onClick={() => navigate("/settings")}>
                {t("go_to_settings")}
              </Button>
            </div>
          ) : (
            <>
              {errorMessage && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleChangeEmail}>
                <FieldGroup>
                  <Field data-invalid={!!validationErrors.currentPassword}>
                    <FieldLabel htmlFor="current-password">
                      {t("current_password")}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Lock />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="current-password"
                        type={showPassword ? "text" : "password"}
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
                      <InputGroupAddon align="inline-end">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <InputGroupButton
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={
                                  showPassword
                                    ? t("hide_password")
                                    : t("show_password")
                                }
                              >
                                {showPassword ? <EyeOff /> : <Eye />}
                              </InputGroupButton>
                            }
                          />
                          <TooltipContent>
                            {showPassword
                              ? t("hide_password")
                              : t("show_password")}
                          </TooltipContent>
                        </Tooltip>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError>{validationErrors.currentPassword}</FieldError>
                  </Field>

                  <Field data-invalid={!!validationErrors.newEmail}>
                    <FieldLabel htmlFor="new-email">
                      {t("new_email")}
                    </FieldLabel>
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
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={isUnsavedChangesModalOpen}
        onOpenChange={(open) => {
          if (!open) confirmNavigation();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{unsavedChangesMessage}</AlertDialogTitle>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("leave_page")}</AlertDialogCancel>
            <AlertDialogAction onClick={cancelNavigation}>
              {t("stay")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChangeEmailPage;
