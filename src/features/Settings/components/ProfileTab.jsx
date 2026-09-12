import { Pencil, Download, X, Trash2 } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOnlineStatus } from "@/hooks/ui/useOnlineStatus";
import { useOfflineDownload } from "../hooks/useOfflineDownload";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const STALE_DOWNLOAD_THRESHOLD_DAYS = 30;

const ProfileTab = ({
  profileData,
  isEditingProfile,
  tempFirstName,
  tempUsername,
  tempPreferredLanguage,
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
  const [showDeleteDownloadsModal, setShowDeleteDownloadsModal] =
    useState(false);
  const {
    isDownloading,
    progress,
    status: offlineDownloadStatus,
    startDownload,
    cancelDownload,
    deleteDownloads,
  } = useOfflineDownload(t);
  const daysSinceDownload = offlineDownloadStatus
    ? Math.floor(
        (Date.now() - new Date(offlineDownloadStatus.completedAt).getTime()) /
          (24 * 60 * 60 * 1000)
      )
    : 0;
  const isDownloadStale = daysSinceDownload > STALE_DOWNLOAD_THRESHOLD_DAYS;
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
                disabled={isEditingProfile}
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
                disabled={isEditingProfile}
              >
                {t("change_password")}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </FieldGroup>

      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium">{t("preferred_language")}</span>
        {isEditingProfile ? (
          <ToggleGroup
            variant="outline"
            value={[tempPreferredLanguage || "en"]}
            onValueChange={(groupValue) => {
              if (groupValue[0]) {
                handleLanguageChange(groupValue[0]);
              }
            }}
          >
            <ToggleGroupItem value="en">EN</ToggleGroupItem>
            <ToggleGroupItem value="de">DE</ToggleGroupItem>
          </ToggleGroup>
        ) : (
          <span className="text-sm text-muted-foreground">
            {(profileData?.preferred_language || "en").toUpperCase()}
          </span>
        )}
      </div>

      {isEditingProfile && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={handleCancelProfile}
          >
            {t("cancel")}
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSaveProfile}>
            {t("save_changes")}
          </Button>
        </div>
      )}

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
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startDownload}
                    disabled={!isOnline}
                  >
                    <Download />
                    {t("download_recipes_for_offline")}
                  </Button>
                }
              />
              <TooltipContent>
                {isOnline
                  ? t("download_recipes_for_offline")
                  : t("action_requires_internet")}
              </TooltipContent>
            </Tooltip>
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
            <span className="mt-1 text-sm text-muted-foreground">
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
          <div className="mt-1 flex gap-2 rounded-lg border border-border bg-card p-3 items-center justify-between">
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
              {isDownloadStale && (
                <span className="text-destructive">
                  {" "}
                  {t("offline_download_stale_suffix", {
                    days: daysSinceDownload,
                  })}
                </span>
              )}
            </span>
            {offlineDownloadStatus && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost-destructive"
                      size="icon-sm"
                      onClick={() => setShowDeleteDownloadsModal(true)}
                      aria-label={t("delete_downloads")}
                    >
                      <Trash2 />
                    </Button>
                  }
                />
                <TooltipContent>{t("delete_downloads")}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={showDeleteDownloadsModal}
        onOpenChange={setShowDeleteDownloadsModal}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_downloads")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_downloads_confirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteDownloads();
                setShowDeleteDownloadsModal(false);
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Separator />

      <div className="flex justify-center">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                className="w-full sm:w-auto"
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={!isOnline}
              >
                {t("delete_account")}
              </Button>
            }
          />
          <TooltipContent>
            {isOnline ? t("delete_account") : t("action_requires_internet")}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default ProfileTab;
