import { useState } from "react";
import { Download, X, Trash2, Sun, Moon, SunMoon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useOnlineStatus } from "@/hooks/ui/useOnlineStatus";
import { useTheme } from "@/hooks/ui/useTheme";
import { useOfflineDownload } from "../hooks/useOfflineDownload";

const STALE_DOWNLOAD_THRESHOLD_DAYS = 30;

const PreferencesTab = ({
  profileData,
  handleLanguageChange,
  handleFriendsCanViewImagesChange,
  t,
}) => {
  const isOnline = useOnlineStatus();
  const { theme, setTheme } = useTheme();
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{t("appearance")}</span>
        <ToggleGroup
          variant="outline"
          aria-label={t("appearance")}
          value={[theme]}
          onValueChange={(groupValue) => {
            if (groupValue[0]) setTheme(groupValue[0]);
          }}
        >
          <ToggleGroupItem value="light">
            <Sun />
            {t("theme_light")}
          </ToggleGroupItem>
          <ToggleGroupItem value="dark">
            <Moon />
            {t("theme_dark")}
          </ToggleGroupItem>
          <ToggleGroupItem value="system">
            <SunMoon />
            {t("theme_system")}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{t("preferred_language")}</span>
        <ToggleGroup
          variant="outline"
          aria-label={t("preferred_language")}
          value={[profileData?.preferred_language || "en"]}
          onValueChange={(groupValue) => {
            if (groupValue[0]) handleLanguageChange(groupValue[0]);
          }}
        >
          <ToggleGroupItem value="en">EN</ToggleGroupItem>
          <ToggleGroupItem value="de">DE</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Separator />

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
          ) : isOnline ? (
            <Button variant="outline" size="sm" onClick={startDownload}>
              <Download />
              {t("download_recipes_for_offline")}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" size="sm" disabled>
                    <Download />
                    {t("download_recipes_for_offline")}
                  </Button>
                }
              />
              <TooltipContent>{t("action_requires_internet")}</TooltipContent>
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
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
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
    </div>
  );
};

export default PreferencesTab;
