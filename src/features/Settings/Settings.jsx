import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  updateUserPreferredLanguage,
  updateUserProfile,
  checkUsernameExists,
  deleteUserAccount,
} from "../../services/userService";
import { useUserProfile } from "../../hooks/data/useUserProfile";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
import { useOnlineStatus } from "@/hooks/ui/useOnlineStatus";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import ProfileTab from "./components/ProfileTab";
import PreferencesTab from "./components/PreferencesTab";
import CategoriesTab from "./components/CategoriesTab";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { WifiOff } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import BackLink from "../../components/BackLink/BackLink";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog/UnsavedChangesDialog";

const SETTINGS_TABS = new Set(["profile", "preferences", "categories"]);

const Settings = ({ resetCategoryFilter }) => {
  const isOnline = useOnlineStatus();
  // Tab lives in the URL so refresh and links keep it
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = SETTINGS_TABS.has(tabParam) ? tabParam : "profile";
  const setActiveTab = (tab) =>
    setSearchParams(
      (prev) => {
        prev.set("tab", tab);
        return prev;
      },
      { replace: true }
    );
  const {
    profile: profileData,
    loading: profileLoading,
    error: profileError,
    setProfile: setProfileData,
  } = useUserProfile();
  const [actionLoading, setActionLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  // null means untouched, so the field shows the saved value
  const [tempFirstName, setTempFirstName] = useState(null);
  const [tempUsername, setTempUsername] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deletedAccountInfo, setDeletedAccountInfo] = useState(null);
  const [categoriesHasUnsavedChanges, setCategoriesHasUnsavedChanges] =
    useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState(null);
  const [isTabSwitchModalOpen, setIsTabSwitchModalOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const firstName = tempFirstName ?? profileData?.first_name ?? "";
  const username = tempUsername ?? profileData?.username ?? "";
  const profileHasUnsavedChanges =
    firstName !== (profileData?.first_name ?? "") ||
    username !== (profileData?.username ?? "");

  const handleSaveProfile = async () => {
    if (!profileHasUnsavedChanges || profileSaving) return;
    try {
      setProfileSaving(true);
      setUsernameError("");

      if (username !== profileData.username) {
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
          setUsernameError(t("username_already_exists"));
          return;
        }
      }

      await updateUserProfile({
        first_name: firstName,
        username: username,
      });
      setProfileData({
        ...profileData,
        first_name: firstName,
        username: username,
      });
      setTempFirstName(null);
      setTempUsername(null);
      toast.add({ title: t("successfully_updated_profile"), type: "success" });
    } catch (err) {
      toast.add({ title: err.message, type: "error" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelProfile = () => {
    setTempFirstName(null);
    setTempUsername(null);
    setUsernameError("");
  };

  const handleChangePassword = () => {
    navigate("/change-password", { state: { fromSettings: true } });
  };

  const handleChangeEmail = () => {
    navigate("/change-email", { state: { fromSettings: true } });
  };

  const handleLanguageChange = async (language) => {
    const previous = profileData?.preferred_language || "en";
    if (language === previous) return;
    setProfileData({ ...profileData, preferred_language: language });
    void i18n.changeLanguage(language);
    try {
      await updateUserPreferredLanguage(language);
      toast.add({ title: t("successfully_updated_language"), type: "success" });
    } catch (err) {
      setProfileData({ ...profileData, preferred_language: previous });
      void i18n.changeLanguage(previous);
      toast.add({
        title: `${t("failed_to_update_language")}: ${err.message}`,
        type: "error",
      });
    }
  };

  const handlePhotoVisibilityChange = async (photoVisibility) => {
    const previous = profileData.photo_visibility;
    setProfileData({ ...profileData, photo_visibility: photoVisibility });
    try {
      await updateUserProfile({ photo_visibility: photoVisibility });
      toast.add({
        title: t("successfully_updated_photo_visibility"),
        type: "success",
      });
    } catch (err) {
      setProfileData({ ...profileData, photo_visibility: previous });
      toast.add({
        title: `${t("failed_to_update_photo_visibility")}: ${err.message}`,
        type: "error",
      });
      console.error("Photo visibility save error:", err);
    }
  };

  const {
    isModalOpen: isUnsavedChangesModalOpen,
    confirmNavigation,
    cancelNavigation,
    message: unsavedChangesMessage,
  } = useUnsavedChanges(
    profileHasUnsavedChanges || categoriesHasUnsavedChanges,
    t("unsaved_changes_warning")
  );

  const handleTabSwitch = (targetTab) => {
    if (profileHasUnsavedChanges || categoriesHasUnsavedChanges) {
      setPendingTabSwitch(targetTab);
      setIsTabSwitchModalOpen(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  const handleConfirmTabSwitch = () => {
    setActiveTab(pendingTabSwitch);
    setPendingTabSwitch(null);
    handleCancelProfile();
    setIsTabSwitchModalOpen(false);
  };

  const handleCancelTabSwitch = () => {
    setPendingTabSwitch(null);
    setIsTabSwitchModalOpen(false);
  };

  const handleConfirmRouteLeave = () => {
    handleCancelProfile();
    confirmNavigation();
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setActionLoading(true);

      // Store account info before deletion
      const accountInfo = {
        firstName: profileData.first_name,
      };

      await deleteUserAccount();

      toast.add({
        title: t("account_deleted_goodbye", { name: accountInfo.firstName }),
        type: "success",
      });

      // Show success message with account details
      setDeletedAccountInfo(accountInfo);
      setShowDeleteSuccess(true);
      setShowDeleteModal(false);
      setActionLoading(false);

      // Clear any local storage or session data
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // Storage not available
      }
    } catch (err) {
      console.error("Failed to delete account:", err);
      toast.add({ title: t("delete_account_error"), type: "error" });
      setShowDeleteModal(false);
      setActionLoading(false);
    }
  };

  if (profileLoading || actionLoading) {
    return <LoadingAcorn />;
  }
  if (!isOnline && profileError && !profileData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Empty className="rounded-lg border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia>
              <WifiOff />
            </EmptyMedia>
            <EmptyTitle>{t("profile_unavailable_offline")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }
  if (profileError && !profileData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>Error: {profileError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {showDeleteSuccess ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <p>
            {t("account_deleted_goodbye", {
              name: deletedAccountInfo?.firstName,
            })}
          </p>
        </div>
      ) : (
        <>
          <BackLink />
          <Card className="w-full">
            <CardHeader className="flex flex-col items-stretch gap-4">
              <div className="relative flex w-full items-center justify-center">
                <h1 className="text-lg font-semibold">{t("settings")}</h1>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabSwitch}>
                <TabsList className="w-full">
                  <TabsTrigger value="profile" className="flex-1">
                    {t("profile")}
                  </TabsTrigger>
                  <TabsTrigger value="preferences" className="flex-1">
                    {t("preferences")}
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex-1">
                    {t("categories")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent>
              {activeTab === "profile" && (
                <ProfileTab
                  profileData={profileData}
                  firstName={firstName}
                  username={username}
                  usernameError={usernameError}
                  hasUnsavedChanges={profileHasUnsavedChanges}
                  isSaving={profileSaving}
                  handleSaveProfile={handleSaveProfile}
                  handleCancelProfile={handleCancelProfile}
                  handleChangePassword={handleChangePassword}
                  handleChangeEmail={handleChangeEmail}
                  handleDeleteAccount={handleDeleteAccount}
                  setTempFirstName={setTempFirstName}
                  setTempUsername={setTempUsername}
                  setUsernameError={setUsernameError}
                  t={t}
                />
              )}
              {activeTab === "preferences" && (
                <PreferencesTab
                  profileData={profileData}
                  handleLanguageChange={handleLanguageChange}
                  handlePhotoVisibilityChange={handlePhotoVisibilityChange}
                  t={t}
                />
              )}
              {activeTab === "categories" && (
                <CategoriesTab
                  t={t}
                  onUnsavedChangesChange={setCategoriesHasUnsavedChanges}
                  resetCategoryFilter={resetCategoryFilter}
                />
              )}
            </CardContent>
          </Card>

          <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("delete_account")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("delete_account_confirmation")}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleConfirmDelete}
                >
                  {t("delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <UnsavedChangesDialog
            open={isUnsavedChangesModalOpen}
            message={unsavedChangesMessage}
            onLeave={handleConfirmRouteLeave}
            onStay={cancelNavigation}
          />

          <UnsavedChangesDialog
            open={isTabSwitchModalOpen}
            message={t("unsaved_changes_warning")}
            onLeave={handleConfirmTabSwitch}
            onStay={handleCancelTabSwitch}
          />
        </>
      )}
    </div>
  );
};

export default Settings;
