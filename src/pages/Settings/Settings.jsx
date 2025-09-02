import { ArrowBigLeft } from "lucide-react";
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
import "./Settings.css";

const Settings = ({ refreshCategories, resetCategoryFilter }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState("");
  const [isEditingFirstName, setIsEditingFirstName] = useState(false);
  const [tempFirstName, setTempFirstName] = useState("");
  const [isEditingLanguage, setIsEditingLanguage] = useState(false);
  const [tempLanguage, setTempLanguage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deletedAccountInfo, setDeletedAccountInfo] = useState(null);
  const [categoriesHasUnsavedChanges, setCategoriesHasUnsavedChanges] =
    useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState(null);
  const usernameInputRef = useRef(null);
  const firstNameInputRef = useRef(null);
  const usernameContainerRef = useRef(null);
  const firstNameContainerRef = useRef(null);
  const languageContainerRef = useRef(null);
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

  // Handle click outside to cancel editing
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside username editing area
      if (
        isEditingUsername &&
        usernameContainerRef.current &&
        !usernameContainerRef.current.contains(event.target)
      ) {
        handleCancelUsername();
      }

      // Check if click is outside first name editing area
      if (
        isEditingFirstName &&
        firstNameContainerRef.current &&
        !firstNameContainerRef.current.contains(event.target)
      ) {
        handleCancelFirstName();
      }

      // Check if click is outside language editing area
      if (
        isEditingLanguage &&
        languageContainerRef.current &&
        !languageContainerRef.current.contains(event.target)
      ) {
        handleCancelLanguage();
      }
    };

    // Add event listener if any editing is active
    if (isEditingUsername || isEditingFirstName || isEditingLanguage) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingUsername, isEditingFirstName, isEditingLanguage]);

  const handleEditUsername = () => {
    setTempUsername(profileData.username);
    setIsEditingUsername(true);
    setTimeout(() => usernameInputRef.current?.focus(), 0);
  };

  const handleSaveUsername = async () => {
    try {
      // Clear any previous errors
      setUsernameError("");

      // Check if username already exists
      const usernameExists = await checkUsernameExists(tempUsername);
      if (usernameExists) {
        setUsernameError(t("username_already_exists"));
        return;
      }

      await updateUserProfile({ username: tempUsername });
      setProfileData({ ...profileData, username: tempUsername });
      setIsEditingUsername(false);
      setSuccessMessage(t("successfully_updated_username"));
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelUsername = () => {
    setTempUsername("");
    setIsEditingUsername(false);
    setUsernameError("");
  };

  const handleEditFirstName = () => {
    setTempFirstName(profileData.first_name);
    setIsEditingFirstName(true);
    setTimeout(() => firstNameInputRef.current?.focus(), 0);
  };

  const handleSaveFirstName = async () => {
    try {
      await updateUserProfile({ first_name: tempFirstName });
      setProfileData({ ...profileData, first_name: tempFirstName });
      setIsEditingFirstName(false);
      setSuccessMessage(t("successfully_updated_first_name"));
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelFirstName = () => {
    setTempFirstName("");
    setIsEditingFirstName(false);
  };

  const handleChangePassword = () => {
    navigate("/change-password", { state: { fromSettings: true } });
  };

  const handleEditLanguage = () => {
    setTempLanguage(profileData.preferred_language || "en");
    setIsEditingLanguage(true);
  };

  const handleSaveLanguage = async () => {
    try {
      // Update in database
      await updateUserPreferredLanguage(tempLanguage);

      // Update local state
      setProfileData({ ...profileData, preferred_language: tempLanguage });

      // Change the current UI language immediately
      await i18n.changeLanguage(tempLanguage);

      setIsEditingLanguage(false);
      setSuccessMessage(t("successfully_updated_language"));
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(`Failed to update language: ${err.message}`);
      console.error("Language save error:", err);
    }
  };

  const handleCancelLanguage = () => {
    setTempLanguage("");
    setIsEditingLanguage(false);
  };

  const hasProfileUnsavedChanges = () => {
    return isEditingUsername || isEditingFirstName || isEditingLanguage;
  };

  const {
    isModalOpen: isUnsavedChangesModalOpen,
    navigate: navigateWithConfirmation,
    confirmNavigation,
    cancelNavigation,
    message: unsavedChangesMessage,
  } = useUnsavedChanges(
    hasProfileUnsavedChanges() || categoriesHasUnsavedChanges,
    t("unsaved_changes_warning")
  );

  const handleTabSwitch = (targetTab) => {
    if (hasProfileUnsavedChanges() || categoriesHasUnsavedChanges) {
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
      localStorage.clear();
      sessionStorage.clear();
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
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="page-centered">
      {showDeleteSuccess ? (
        <div className="flex-column-center">
          <span>
            {t("account_deleted_goodbye", {
              name: deletedAccountInfo?.firstName,
            })}
          </span>
        </div>
      ) : (
        <>
          <div className="card card-settings">
            <header className="flex-column-center relative">
              <div className="flex-row">
                <button
                  className="btn-unstyled back-arrow-left"
                  onClick={() => navigateWithConfirmation(-1)}
                  aria-label={t("go_back")}
                >
                  <ArrowBigLeft size={28} />
                </button>
                <h1 className="forta-small">{t("settings")}</h1>
              </div>
            </header>

            <div className="settings-tabs">
              <button
                className={`tab-button ${
                  activeTab === "profile" ? "active" : ""
                }`}
                onClick={() => handleTabSwitch("profile")}
              >
                {t("profile")}
              </button>
              <button
                className={`tab-button ${
                  activeTab === "categories" ? "active" : ""
                }`}
                onClick={() => handleTabSwitch("categories")}
              >
                {t("categories")}
              </button>
            </div>

            {activeTab === "profile" && (
              <>
                <div className="success-message-wrapper">
                  <span className="red-small">
                    {successMessage || "\u00A0"}
                  </span>
                </div>
                <ProfileTab
                  profileData={profileData}
                  isEditingUsername={isEditingUsername}
                  tempUsername={tempUsername}
                  usernameError={usernameError}
                  isEditingFirstName={isEditingFirstName}
                  tempFirstName={tempFirstName}
                  isEditingLanguage={isEditingLanguage}
                  tempLanguage={tempLanguage}
                  usernameInputRef={usernameInputRef}
                  firstNameInputRef={firstNameInputRef}
                  usernameContainerRef={usernameContainerRef}
                  firstNameContainerRef={firstNameContainerRef}
                  languageContainerRef={languageContainerRef}
                  handleEditUsername={handleEditUsername}
                  handleSaveUsername={handleSaveUsername}
                  handleCancelUsername={handleCancelUsername}
                  handleEditFirstName={handleEditFirstName}
                  handleSaveFirstName={handleSaveFirstName}
                  handleCancelFirstName={handleCancelFirstName}
                  handleChangePassword={handleChangePassword}
                  handleEditLanguage={handleEditLanguage}
                  handleSaveLanguage={handleSaveLanguage}
                  handleCancelLanguage={handleCancelLanguage}
                  handleDeleteAccount={handleDeleteAccount}
                  setTempUsername={setTempUsername}
                  setUsernameError={setUsernameError}
                  setTempFirstName={setTempFirstName}
                  setTempLanguage={setTempLanguage}
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
          </div>

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
            onClose={handleCancelModal}
            onConfirm={handleConfirmModal}
            message={unsavedChangesMessage}
            confirmText={t("leave_page")}
            cancelText={t("stay")}
            confirmButtonType="danger"
          />
        </>
      )}
    </div>
  );
};

export default Settings;
