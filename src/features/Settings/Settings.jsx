import { ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  updateUserPreferredLanguage,
  getUserProfile,
  updateUserProfile,
  checkUsernameExists,
  deleteUserAccount,
} from "../../services/userService";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import ProfileTab from "./components/ProfileTab";
import CategoriesTab from "./components/CategoriesTab";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
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

const Settings = ({ resetCategoryFilter }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usernameError, setUsernameError] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempFirstName, setTempFirstName] = useState("");
  const [tempUsername, setTempUsername] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deletedAccountInfo, setDeletedAccountInfo] = useState(null);
  const [categoriesHasUnsavedChanges, setCategoriesHasUnsavedChanges] =
    useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState(null);
  const [isTabSwitchModalOpen, setIsTabSwitchModalOpen] = useState(false);
  const firstNameInputRef = useRef(null);
  const profileContainerRef = useRef(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const profileData = await getUserProfile();
        setProfileData(profileData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Cancel editing when clicking outside the profile fields
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isEditingProfile &&
        profileContainerRef.current &&
        !profileContainerRef.current.contains(event.target) &&
        !event.target.closest('[data-slot="tabs-list"]') &&
        !event.target.closest('[data-slot^="alert-dialog"]')
      ) {
        handleCancelProfile();
      }
    };

    if (isEditingProfile) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingProfile]);

  const handleEditProfile = () => {
    setTempFirstName(profileData.first_name);
    setTempUsername(profileData.username);
    setUsernameError("");
    setIsEditingProfile(true);
    setTimeout(() => firstNameInputRef.current?.focus(), 0);
  };

  const handleSaveProfile = async () => {
    try {
      setUsernameError("");

      if (tempUsername !== profileData.username) {
        const usernameExists = await checkUsernameExists(tempUsername);
        if (usernameExists) {
          setUsernameError(t("username_already_exists"));
          return;
        }
      }

      await updateUserProfile({
        first_name: tempFirstName,
        username: tempUsername,
      });
      setProfileData({
        ...profileData,
        first_name: tempFirstName,
        username: tempUsername,
      });
      setIsEditingProfile(false);
      toast.add({ title: t("successfully_updated_profile"), type: "success" });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelProfile = () => {
    setTempFirstName("");
    setTempUsername("");
    setUsernameError("");
    setIsEditingProfile(false);
  };

  const handleChangePassword = () => {
    navigate("/change-password", { state: { fromSettings: true } });
  };

  const handleChangeEmail = () => {
    navigate("/change-email", { state: { fromSettings: true } });
  };

  const handleLanguageChange = async (language) => {
    try {
      await updateUserPreferredLanguage(language);
      setProfileData({ ...profileData, preferred_language: language });
      await i18n.changeLanguage(language);
      toast.add({ title: t("successfully_updated_language"), type: "success" });
    } catch (err) {
      setError(`Failed to update language: ${err.message}`);
      console.error("Language save error:", err);
    }
  };

  const handleFriendsCanViewImagesChange = async (friendsCanViewImages) => {
    const previous = profileData.friends_can_view_images;
    setProfileData({
      ...profileData,
      friends_can_view_images: friendsCanViewImages,
    });
    try {
      await updateUserProfile({
        friends_can_view_images: friendsCanViewImages,
      });
      toast.add({
        title: t("successfully_updated_friends_can_view_images"),
        type: "success",
      });
    } catch (err) {
      setProfileData({ ...profileData, friends_can_view_images: previous });
      setError(`Failed to update friends image visibility: ${err.message}`);
      console.error("Friends image visibility save error:", err);
    }
  };

  const {
    isModalOpen: isUnsavedChangesModalOpen,
    confirmNavigation,
    cancelNavigation,
    message: unsavedChangesMessage,
  } = useUnsavedChanges(
    isEditingProfile || categoriesHasUnsavedChanges,
    t("unsaved_changes_warning")
  );

  const handleTabSwitch = (targetTab) => {
    if (isEditingProfile || categoriesHasUnsavedChanges) {
      setPendingTabSwitch(targetTab);
      setIsTabSwitchModalOpen(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  const handleConfirmTabSwitch = () => {
    setActiveTab(pendingTabSwitch);
    setPendingTabSwitch(null);
    if (isEditingProfile) {
      handleCancelProfile();
    }
    setIsTabSwitchModalOpen(false);
  };

  const handleCancelTabSwitch = () => {
    setPendingTabSwitch(null);
    setIsTabSwitchModalOpen(false);
  };

  const handleConfirmRouteLeave = () => {
    if (isEditingProfile) {
      handleCancelProfile();
    }
    confirmNavigation();
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);

      // Store account info before deletion
      const accountInfo = {
        firstName: profileData.first_name,
      };

      await deleteUserAccount();

      // Show success message with account details
      setDeletedAccountInfo(accountInfo);
      setShowDeleteSuccess(true);
      setShowDeleteModal(false);
      setLoading(false);

      // Clear any local storage or session data
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // Storage not available
      }
    } catch (err) {
      console.error("Failed to delete account:", err);
      setError(t("delete_account_error"));
      setShowDeleteModal(false);
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingAcorn />;
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>Error: {error}</AlertDescription>
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
                <h1 className="text-lg font-semibold">{t("settings")}</h1>
              </div>

              <Tabs value={activeTab} onValueChange={handleTabSwitch}>
                <TabsList className="w-full">
                  <TabsTrigger value="profile" className="flex-1">
                    {t("profile")}
                  </TabsTrigger>
                  <TabsTrigger value="categories" className="flex-1">
                    {t("categories")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent>
              {activeTab === "profile" && (
                <>
                  <ProfileTab
                    profileData={profileData}
                    isEditingProfile={isEditingProfile}
                    tempFirstName={tempFirstName}
                    tempUsername={tempUsername}
                    usernameError={usernameError}
                    firstNameInputRef={firstNameInputRef}
                    profileContainerRef={profileContainerRef}
                    handleEditProfile={handleEditProfile}
                    handleSaveProfile={handleSaveProfile}
                    handleCancelProfile={handleCancelProfile}
                    handleChangePassword={handleChangePassword}
                    handleChangeEmail={handleChangeEmail}
                    handleLanguageChange={handleLanguageChange}
                    handleFriendsCanViewImagesChange={
                      handleFriendsCanViewImagesChange
                    }
                    handleDeleteAccount={handleDeleteAccount}
                    setTempFirstName={setTempFirstName}
                    setTempUsername={setTempUsername}
                    setUsernameError={setUsernameError}
                    t={t}
                  />
                </>
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

          <AlertDialog
            open={isUnsavedChangesModalOpen}
            onOpenChange={(open) => {
              if (!open) handleConfirmRouteLeave();
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

          <AlertDialog
            open={isTabSwitchModalOpen}
            onOpenChange={(open) => {
              if (!open) handleConfirmTabSwitch();
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("unsaved_changes_warning")}
                </AlertDialogTitle>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>{t("leave_page")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelTabSwitch}>
                  {t("stay")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

export default Settings;
