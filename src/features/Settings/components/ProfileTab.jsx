import { Pencil, Download, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useOnlineStatus } from "@/hooks/ui/useOnlineStatus";
import { useOfflineDownload } from "../hooks/useOfflineDownload";

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
  handleChangeEmail,
  handleLanguageChange,
  handleFriendsCanViewImagesChange,
  handleDeleteAccount,
  setTempFirstName,
  setTempUsername,
  setUsernameError,
  t,
}) => {
  const isOnline = useOnlineStatus();
  const {
    isDownloading,
    progress,
    status: offlineDownloadStatus,
    startDownload,
    cancelDownload,
  } = useOfflineDownload(t);
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditProfile}
            disabled={!isOnline}
          >
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
            value={
              isEditingProfile ? tempFirstName : profileData?.first_name || ""
            }
            onChange={
              isEditingProfile
                ? (e) => setTempFirstName(e.target.value)
                : undefined
            }
            onKeyDown={isEditingProfile ? handleKeyDown : undefined}
            readOnly={!isEditingProfile}
          />
        </Field>

        <Field data-invalid={!!usernameError}>
          <FieldLabel htmlFor="username">{t("username")}</FieldLabel>
          <Input
            id="username"
            type="text"
            value={
              isEditingProfile ? tempUsername : profileData?.username || ""
            }
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
          <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="email"
              type="email"
              value={profileData?.email || ""}
              readOnly
              disabled={isEditingProfile}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                onClick={handleChangeEmail}
                disabled={isEditingProfile || !isOnline}
              >
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
              disabled={isEditingProfile}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                onClick={handleChangePassword}
                disabled={isEditingProfile || !isOnline}
              >
                {t("change_password")}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>

      {isEditingProfile && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={handleCancelProfile}
          >
            {t("cancel")}
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={handleSaveProfile}
            disabled={!isOnline}
          >
            {t("save_changes")}
          </Button>
        </div>
      )}

      {isEditingProfile && <Separator />}

      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium">{t("preferred_language")}</span>
        <ToggleGroup
          variant="outline"
          value={[profileData?.preferred_language || "en"]}
          onValueChange={(groupValue) => {
            if (groupValue[0]) {
              handleLanguageChange(groupValue[0]);
            }
          }}
          disabled={!isOnline}
        >
          <ToggleGroupItem value="en">EN</ToggleGroupItem>
          <ToggleGroupItem value="de">DE</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <Label htmlFor="friends-can-view-images" className="justify-between">
          <span className="flex flex-col">
            <span className="font-medium">{t("friends_can_view_images")}</span>
            <span className="text-sm text-muted-foreground">
              {t("friends_can_view_images_description")}
            </span>
          </span>
          <Switch
            id="friends-can-view-images"
            checked={!!profileData?.friends_can_view_images}
            onCheckedChange={handleFriendsCanViewImagesChange}
            disabled={!isOnline}
          />
        </Label>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex flex-col">
            <span className="font-medium">{t("offline_access")}</span>
            <span className="text-sm text-muted-foreground">
              {t("offline_access_description")}
            </span>
          </span>
          {isDownloading ? (
            <Button variant="outline" size="sm" onClick={cancelDownload}>
              <X />
              {t("cancel_download")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startDownload}
              disabled={!isOnline}
            >
              <Download />
              {t("download_recipes_for_offline")}
            </Button>
          )}
        </div>

        {isDownloading && progress && (
          <div className="flex flex-col gap-1">
            <Progress
              value={
                progress.total > 0
                  ? Math.round((progress.current / progress.total) * 100)
                  : 0
              }
            />
            <span className="text-sm text-muted-foreground">
              {progress.total > 0
                ? t("offline_download_progress", {
                    current: progress.current,
                    total: progress.total,
                    recipeTitle: progress.recipeTitle || "",
                  })
                : t("downloading_recipes_for_offline")}
            </span>
          </div>
        )}

        {!isDownloading && (
          <span className="text-sm text-muted-foreground">
            {offlineDownloadStatus
              ? offlineDownloadStatus.failedCount > 0
                ? t("offline_download_last_synced_with_failures", {
                    date: new Date(
                      offlineDownloadStatus.completedAt
                    ).toLocaleString(),
                    count: offlineDownloadStatus.failedCount,
                  })
                : t("offline_download_last_synced", {
                    date: new Date(
                      offlineDownloadStatus.completedAt
                    ).toLocaleString(),
                  })
              : t("offline_download_never_synced")}
          </span>
        )}
      </div>

      <Separator />

      <div className="flex justify-center">
        <Button
          className="w-full sm:w-auto"
          variant="destructive"
          onClick={handleDeleteAccount}
          disabled={!isOnline}
        >
          {t("delete_account")}
        </Button>
      </div>
    </div>
  );
};

export default ProfileTab;
