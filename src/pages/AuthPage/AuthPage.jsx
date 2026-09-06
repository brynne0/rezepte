import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  User,
  ChefHat,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  Squirrel,
} from "lucide-react";
import { signUp, signIn, resendConfirmationEmail } from "../../services/auth";
import {
  validateAuthForm,
  validateUsernameUnique,
  isPasswordStrong,
} from "../../utils/validation";
import PasswordRequirements from "../../components/PasswordRequirements/PasswordRequirements";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const AuthPage = ({ setLoginMessage }) => {
  // Form input states
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Error message
  const [errorMessage, setErrorMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Toggle between different modes
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [sentToEmail, setSentToEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleValidation = () => {
    const formData = { email, firstName, username, password };
    const errors = validateAuthForm(formData, isSignUpMode, t);

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!handleValidation()) {
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(username, password);

    if (error) {
      setIsLoading(false);
      // Handle specific error types
      switch (error.type) {
        case "USER_NOT_FOUND":
          setValidationErrors({ username: t(error.translationKey) });
          break;
        case "INVALID_PASSWORD":
          setValidationErrors({ password: t(error.translationKey) });
          break;
        case "EMAIL_NOT_CONFIRMED":
        case "TOO_MANY_REQUESTS":
        case "GENERAL_ERROR":
        default:
          setErrorMessage(t(error.translationKey));
          break;
      }
    } else {
      setLoginMessage(t("login_success"));

      // Wait for recipes to load before navigating
      setTimeout(() => {
        // Clear form fields and navigate
        setUsername("");
        setPassword("");
        navigate("/");
      }, 1000);
    }

    setTimeout(() => {
      // Reset login message
      setLoginMessage("");
      setErrorMessage("");
      setValidationErrors({});
    }, 3000);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!handleValidation()) {
      return;
    }

    setIsLoading(true);

    // Collect all validation errors at once
    const errors = {};

    // Check password strength for signup
    if (!isPasswordStrong(password)) {
      errors.password = t("password_requirements_not_met");
    }

    // Check for username uniqueness
    const usernameError = await validateUsernameUnique(username, t);
    if (usernameError) {
      errors.username = usernameError;
    }

    // If there are any validation errors, show them all and return
    if (Object.keys(errors).length > 0) {
      setIsLoading(false);
      setValidationErrors({
        ...validationErrors,
        ...errors,
      });
      return;
    }

    const { error } = await signUp(email, firstName, username, password);

    if (error) {
      setIsLoading(false);
      if (error.type === "EMAIL_EXISTS") {
        setValidationErrors((prev) => ({
          ...prev,
          email: t("email_already_exists"),
        }));
      } else {
        setErrorMessage(t("signup_failed"));
      }
    } else {
      setIsLoading(false);
      setSentToEmail(email);
      setEmail("");
      setFirstName("");
      setUsername("");
      setPassword("");
      setAwaitingConfirmation(true);
    }
  };

  // Clear form when switching modes
  const switchToLogin = () => {
    setIsSignUpMode(false);
    setEmail("");
    setFirstName("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setValidationErrors({});
  };

  const switchToSignUp = () => {
    setIsSignUpMode(true);
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setValidationErrors({});
  };

  const switchToForgotPassword = () => {
    setIsSignUpMode(false);
    setUsername("");
    setPassword("");
    setValidationErrors({});
    navigate("/forgot-password", { state: { email: username } });
  };

  const handleResendConfirmation = async () => {
    setIsResending(true);
    setResendMessage("");

    const { error } = await resendConfirmationEmail(sentToEmail);

    setIsResending(false);
    setResendMessage(error ? t("resend_email_failed") : t("resend_email_sent"));

    setTimeout(() => {
      setResendMessage("");
    }, 3000);
  };

  return (
    <div className="mx-auto mt-20 w-full max-w-sm px-4">
      <Card className="w-full">
        <CardHeader className="flex flex-col items-stretch gap-4">
          <div className="grid w-full grid-cols-3 items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              className="justify-self-start"
              onClick={() => navigate(-1)}
              aria-label={t("go_back")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <Squirrel className="size-9 justify-self-center text-primary" />
          </div>

          {!awaitingConfirmation && (
            <Tabs
              value={isSignUpMode ? "signup" : "login"}
              onValueChange={(value) =>
                value === "signup" ? switchToSignUp() : switchToLogin()
              }
            >
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">
                  {t("login")}
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  {t("signup")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </CardHeader>

        <CardContent>
          {awaitingConfirmation ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p>{t("signup_success")}</p>
              <p className="text-muted-foreground">{sentToEmail}</p>
              <Button
                type="button"
                onClick={handleResendConfirmation}
                disabled={isResending}
              >
                {isResending && <Spinner />}
                {isResending ? t("resending_email") : t("resend_email")}
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

              <form
                onSubmit={isSignUpMode ? handleSignUp : handleLogin}
                data-testid="auth-form"
              >
                <FieldGroup>
                  {isSignUpMode && (
                    <>
                      {/* Email */}
                      <Field data-invalid={!!validationErrors.email}>
                        <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                        <InputGroup>
                          <InputGroupAddon>
                            <Mail />
                          </InputGroupAddon>
                          <InputGroupInput
                            id="email"
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

                      {/* First Name */}
                      <Field data-invalid={!!validationErrors.firstName}>
                        <FieldLabel htmlFor="name">
                          {t("first_name")}
                        </FieldLabel>
                        <InputGroup>
                          <InputGroupAddon>
                            <User />
                          </InputGroupAddon>
                          <InputGroupInput
                            id="name"
                            type="text"
                            value={firstName}
                            onChange={(e) => {
                              setFirstName(e.target.value);
                              setValidationErrors((prev) => ({
                                ...prev,
                                firstName: "",
                              }));
                            }}
                            aria-invalid={!!validationErrors.firstName}
                          />
                        </InputGroup>
                        <FieldError>{validationErrors.firstName}</FieldError>
                      </Field>
                    </>
                  )}

                  {/* Username */}
                  <Field data-invalid={!!validationErrors.username}>
                    <FieldLabel htmlFor="username">
                      {isSignUpMode ? t("username") : t("username_or_email")}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <ChefHat />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setValidationErrors((prev) => ({
                            ...prev,
                            username: "",
                          }));
                        }}
                        aria-invalid={!!validationErrors.username}
                      />
                    </InputGroup>
                    <FieldError>{validationErrors.username}</FieldError>
                  </Field>

                  {/* Password */}
                  <Field data-invalid={!!validationErrors.password}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="password">
                        {t("password")}
                      </FieldLabel>
                      {!isSignUpMode && (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={switchToForgotPassword}
                        >
                          {t("forgot_password")}
                        </Button>
                      )}
                    </div>
                    <InputGroup>
                      <InputGroupAddon>
                        <Lock className="" />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setValidationErrors((prev) => ({
                            ...prev,
                            password: "",
                          }));
                        }}
                        aria-invalid={!!validationErrors.password}
                        data-testid="password-input"
                      />
                      <InputGroupAddon align="inline-end">
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
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError>{validationErrors.password}</FieldError>
                    {isSignUpMode && password && (
                      <PasswordRequirements password={password} />
                    )}
                  </Field>

                  {/* Submit button */}
                  <Button
                    type="submit"
                    aria-label="submit-button"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading && <Spinner />}
                    {isLoading
                      ? isSignUpMode
                        ? t("signing_up")
                        : t("logging_in")
                      : isSignUpMode
                        ? t("signup")
                        : t("login")}
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

export default AuthPage;
