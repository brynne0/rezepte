import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnlineStatus } from "@/hooks/ui/useOnlineStatus";

const ProfileTab = ({
  profileData,
  firstName,
  username,
  usernameError,
  hasUnsavedChanges,
  isSaving,
  handleSaveProfile,
  handleCancelProfile,
  handleChangePassword,
  handleChangeEmail,
  handleDeleteAccount,
  setTempFirstName,
  setTempUsername,
  setUsernameError,
  t,
}) => {
  const isOnline = useOnlineStatus();
  const handleKeyDown = (e) => {
    if (e.key === "Escape") handleCancelProfile();
  };

  const deleteButton = (
    <Button
      type="button"
      variant="destructive"
      className="w-full sm:mr-auto sm:w-auto"
      onClick={handleDeleteAccount}
      disabled={!isOnline}
    >
      {t("delete_account")}
    </Button>
  );

  const saveButton = (
    <Button
      type="submit"
      className="w-full sm:w-auto"
      disabled={!hasUnsavedChanges || isSaving || !isOnline}
    >
      {isSaving && <Spinner />}
      {t("save_changes")}
    </Button>
  );

  return (
    // Same layout as the recipe form: fields, then one action row
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleSaveProfile();
      }}
    >
      <FieldGroup className="grid gap-6 sm:grid-cols-2 sm:gap-4">
        <Field>
          <FieldLabel htmlFor="first_name">{t("first_name")}</FieldLabel>
          <Input
            id="first_name"
            type="text"
            value={firstName}
            onChange={(e) => setTempFirstName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </Field>

        <Field data-invalid={!!usernameError}>
          <FieldLabel htmlFor="username">{t("username")}</FieldLabel>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setTempUsername(e.target.value);
              setUsernameError("");
            }}
            onKeyDown={handleKeyDown}
            aria-invalid={!!usernameError}
          />
          <FieldError>{usernameError}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="email"
              type="email"
              value={profileData?.email || ""}
              readOnly
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="button" onClick={handleChangeEmail}>
                {t("change_email")}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="password"
              type="password"
              value="**************"
              readOnly
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="button" onClick={handleChangePassword}>
                {t("change_password")}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {isOnline ? (
          deleteButton
        ) : (
          <Tooltip>
            <TooltipTrigger render={deleteButton} />
            <TooltipContent>{t("action_requires_internet")}</TooltipContent>
          </Tooltip>
        )}
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleCancelProfile}
          disabled={!hasUnsavedChanges || isSaving}
        >
          {t("cancel")}
        </Button>
        {isOnline ? (
          saveButton
        ) : (
          <Tooltip>
            <TooltipTrigger render={saveButton} />
            <TooltipContent>{t("action_requires_internet")}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </form>
  );
};

export default ProfileTab;
