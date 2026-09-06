import { ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getUserPreferredLanguage,
  updateUserPreferredLanguage,
  getUserProfile,
  updateUserProfile,
  checkUsernameExists,
  deleteUserAccount,
} from "../../services/userService";
import { useUnsavedChanges } from "../../hooks/ui/useUnsavedChanges";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import ProfileTab from "./ProfileTab";
import CategoriesTab from "./CategoriesTab";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Settings = ({ refreshCategories, resetCategoryFilter }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
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
  const firstNameInputRef = useRef(null);
  const profileContainerRef = useRef(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const [profileData, preferredLanguage] = await Promise.all([
          getUserProfile(),
          getUserPreferredLanguage(),
        ]);

        setProfileData({
          ...profileData,
          preferred_language: preferredLanguage,
        });
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
        !profileContainerRef.current.contains(event.target)
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
      setSuccessMessage(t("successfully_updated_profile"));
      setTimeout(() => setSuccessMessage(""), 3000);
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

  const handleLanguageChange = async (language) => {
    try {
      await updateUserPreferredLanguage(language);
      setProfileData({ ...profileData, preferred_language: language });
      await i18n.changeLanguage(language);
      setSuccessMessage(t("successfully_updated_language"));
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(`Failed to update language: ${err.message}`);
      console.error("Language save error:", err);
    }
  };

  const {
    isModalOpen: isUnsavedChangesModalOpen,
    navigate: navigateWithConfirmation,
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
      navigateWithConfirmation(`/settings?tab=${targetTab}`);
    } else {
      setActiveTab(targetTab);
    }
  };

  const handleConfirmModal = () => {
    if (pendingTabSwitch) {
      setActiveTab(pendingTabSwitch);
      setPendingTabSwitch(null);
    }
    confirmNavigation();
  };

  const handleCancelModal = () => {
    setPendingTabSwitch(null);
    cancelNavigation();
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

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  if (loading) {
    return <LoadingAcorn />;
  }
  if (error) {
    return (
      <div className="mx-auto mt-20 w-full max-w-2xl px-4">
        <Alert variant="destructive">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-20 w-full max-w-2xl px-4">
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
                  onClick={() => navigateWithConfirmation(-1)}
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
                  {successMessage && (
                    <Alert variant="success" className="mb-4">
                      <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                  )}
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
                    handleLanguageChange={handleLanguageChange}
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
                  saveMessage={saveMessage}
                  setSaveMessage={setSaveMessage}
                  onUnsavedChangesChange={setCategoriesHasUnsavedChanges}
                  refreshCategories={refreshCategories}
                  resetCategoryFilter={resetCategoryFilter}
                />
              )}
            </CardContent>
          </Card>

          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={handleCancelDelete}
            onConfirm={handleConfirmDelete}
            message={t("delete_account_confirmation")}
            confirmText={t("delete")}
            cancelText={t("cancel")}
            confirmButtonType="danger"
            requireConfirmation={true}
            confirmationText={t("delete_account_warning")}
          />

          <ConfirmationModal
            isOpen={isUnsavedChangesModalOpen}
            onConfirm={handleCancelModal}
            onClose={handleConfirmModal}
            message={unsavedChangesMessage}
            cancelText={t("leave_page")}
            confirmText={t("stay")}
            confirmButtonType="primary"
          />
        </>
      )}
    </div>
  );
};

export default Settings;
