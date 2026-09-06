import { Pencil } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const ProfileTab = ({
  profileData,
  isEditingProfile,
  tempFirstName,
  tempUsername,
  usernameError,
  firstNameInputRef,
  profileContainerRef,
  handleEditProfile,
  handleSaveProfile,
  handleCancelProfile,
  handleChangePassword,
  handleLanguageChange,
  handleDeleteAccount,
  setTempFirstName,
  setTempUsername,
  setUsernameError,
  t,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSaveProfile();
    } else if (e.key === "Escape") {
      handleCancelProfile();
    }
  };

  return (
    <div ref={profileContainerRef} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t("profile")}</h2>
        {!isEditingProfile && (
          <Button variant="ghost" size="sm" onClick={handleEditProfile}>
            <Pencil />
            {t("edit_profile")}
          </Button>
        )}
      </div>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="first_name">{t("first_name")}</FieldLabel>
          <Input
            ref={firstNameInputRef}
            id="first_name"
            type="text"
            value={isEditingProfile ? tempFirstName : profileData.first_name}
            onChange={
              isEditingProfile
                ? (e) => setTempFirstName(e.target.value)
                : undefined
            }
            onKeyDown={isEditingProfile ? handleKeyDown : undefined}
            readOnly={!isEditingProfile}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <Input id="email" type="email" value={profileData.email} readOnly />
        </Field>

        <Field data-invalid={!!usernameError}>
          <FieldLabel htmlFor="username">{t("username")}</FieldLabel>
          <Input
            id="username"
            type="text"
            value={isEditingProfile ? tempUsername : profileData.username}
            onChange={
              isEditingProfile
                ? (e) => {
                    setTempUsername(e.target.value);
                    setUsernameError("");
                  }
                : undefined
            }
            onKeyDown={isEditingProfile ? handleKeyDown : undefined}
            aria-invalid={!!usernameError}
            readOnly={!isEditingProfile}
          />
          <FieldError>{usernameError}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="password"
              type="password"
              value="**************"
              readOnly
              disabled={isEditingProfile}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                onClick={handleChangePassword}
                disabled={isEditingProfile}
              >
                {t("change_password")}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>

      {isEditingProfile && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancelProfile}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSaveProfile}>{t("save_changes")}</Button>
        </div>
      )}

      {isEditingProfile && <Separator />}

      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium">{t("preferred_language")}</span>
        <ToggleGroup
          variant="outline"
          value={[profileData.preferred_language || "en"]}
          onValueChange={(groupValue) => {
            if (groupValue[0]) {
              handleLanguageChange(groupValue[0]);
            }
          }}
        >
          <ToggleGroupItem value="en">EN</ToggleGroupItem>
          <ToggleGroupItem value="de">DE</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Separator />

      <div className="flex justify-center">
        <Button variant="destructive" onClick={handleDeleteAccount}>
          {t("delete_account")}
        </Button>
      </div>
    </div>
  );
};

export default ProfileTab;
