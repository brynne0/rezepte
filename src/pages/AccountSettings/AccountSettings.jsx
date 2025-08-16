import { Pencil, ArrowBigLeft, Check, X } from "lucide-react";
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
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import "./AccountSettings.css";

const AccountSettings = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
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
    navigate("/change-password", { state: { fromAccountSettings: true } });
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
      console.log(`Language saved to ${tempLanguage}`);
    } catch (err) {
      setError(`Failed to update language: ${err.message}`);
      console.error("Language save error:", err);
    }
  };

  const handleCancelLanguage = () => {
    setTempLanguage("");
    setIsEditingLanguage(false);
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
            <header className="flex-column-center">
              <div className="flex-row">
                <ArrowBigLeft
                  className="back-arrow-responsive"
                  onClick={() => navigate(-1)}
                />
                <h1 className="forta-small">{t("account_settings")}</h1>
              </div>
              <span className="login-message">
                {successMessage || "\u00A0"}
              </span>
            </header>

            <div className="acc-settings-container">
              <div className="acc-settings">
                <div className="acc-settings-column">
                  <div
                    className="input-validation-wrapper"
                    ref={firstNameContainerRef}
                  >
                    <div className="floating-label-input">
                      <div className="relative-center">
                        <input
                          ref={firstNameInputRef}
                          id="first_name"
                          type="text"
                          value={
                            isEditingFirstName
                              ? tempFirstName
                              : profileData.first_name
                          }
                          onChange={
                            isEditingFirstName
                              ? (e) => setTempFirstName(e.target.value)
                              : undefined
                          }
                          className={`input   ${
                            isEditingFirstName ? "input--edit" : ""
                          }`}
                          placeholder=" "
                          readOnly={!isEditingFirstName}
                        />
                        {!isEditingFirstName ? (
                          <Pencil
                            size={20}
                            onClick={handleEditFirstName}
                            className="btn btn-icon btn-icon-right"
                          />
                        ) : (
                          <>
                            <Check
                              onClick={handleSaveFirstName}
                              className="btn btn-icon btn-icon-green acc-settings-check"
                              size={16}
                            />
                            <X
                              onClick={handleCancelFirstName}
                              className="btn btn-icon btn-icon-red acc-settings-cancel"
                              size={16}
                            />
                          </>
                        )}
                      </div>
                      <label htmlFor="first_name">{t("first_name")}</label>
                    </div>
                  </div>

                  <div className="input-validation-wrapper">
                    <div className="floating-label-input">
                      <div className="relative-center">
                        <input
                          id="email"
                          type="email"
                          value={profileData.email}
                          className="input  "
                          placeholder=" "
                          readOnly={true}
                        />
                      </div>
                      <label htmlFor="email">{t("email")}</label>
                    </div>
                  </div>
                </div>

                <div className="acc-settings-column">
                  <div
                    className="input-validation-wrapper"
                    style={{ position: "relative" }}
                    ref={usernameContainerRef}
                  >
                    <div className="floating-label-input">
                      <div className="relative-center">
                        <input
                          ref={usernameInputRef}
                          id="username"
                          type="text"
                          value={
                            isEditingUsername
                              ? tempUsername
                              : profileData.username
                          }
                          onChange={
                            isEditingUsername
                              ? (e) => {
                                  setTempUsername(e.target.value);
                                  setUsernameError(""); // Clear error when typing
                                }
                              : undefined
                          }
                          className={`input   ${
                            isEditingUsername ? "input--edit" : ""
                          } ${usernameError ? "input--error" : ""}`}
                          placeholder=" "
                          readOnly={!isEditingUsername}
                        />
                        {!isEditingUsername ? (
                          <Pencil
                            size={20}
                            onClick={handleEditUsername}
                            className="btn btn-icon btn-icon-right"
                          />
                        ) : (
                          <>
                            <Check
                              onClick={handleSaveUsername}
                              className="btn btn-icon btn-icon-green acc-settings-check"
                              size={16}
                            />
                            <X
                              onClick={handleCancelUsername}
                              className="btn btn-icon btn-icon-red acc-settings-cancel"
                              size={16}
                            />
                          </>
                        )}
                      </div>
                      <label htmlFor="username">{t("username")}</label>
                    </div>
                    {usernameError && (
                      <span className="error-message-small error-message-absolute">
                        {usernameError}
                      </span>
                    )}
                  </div>

                  <div className="input-validation-wrapper">
                    <div className="floating-label-input">
                      <div className="relative-center">
                        <input
                          id="password"
                          type="password"
                          value="**************"
                          className="input"
                          placeholder=" "
                          readOnly={true}
                        />
                        <Pencil
                          size={20}
                          onClick={handleChangePassword}
                          className="btn btn-icon btn-icon-right"
                        />
                      </div>
                      <label htmlFor="password">{t("password")}</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="acc-settings-language flex-column-center">
                <h2 className="forta-small">
                  {t("preferred_language").toUpperCase()}
                </h2>

                <div
                  className="acc-settings-language-container"
                  ref={languageContainerRef}
                >
                  {!isEditingLanguage ? (
                    <div className="language-wrapper">
                      <span
                        className={`language${
                          (profileData.preferred_language || "en") === "en"
                            ? " selected"
                            : ""
                        }`}
                      >
                        EN
                      </span>
                      |
                      <span
                        className={`language${
                          (profileData.preferred_language || "en") === "de"
                            ? " selected"
                            : ""
                        }`}
                      >
                        DE
                      </span>
                    </div>
                  ) : (
                    <div className="language-wrapper">
                      <span
                        className={`language${
                          tempLanguage === "en" ? " selected" : ""
                        }`}
                        onClick={() => setTempLanguage("en")}
                      >
                        EN
                      </span>
                      |
                      <span
                        className={`language${
                          tempLanguage === "de" ? " selected" : ""
                        }`}
                        onClick={() => setTempLanguage("de")}
                      >
                        DE
                      </span>
                    </div>
                  )}

                  {!isEditingLanguage ? (
                    <Pencil
                      size={20}
                      onClick={handleEditLanguage}
                      className="btn acc-settings-check"
                    />
                  ) : (
                    <>
                      <Check
                        onClick={handleSaveLanguage}
                        className="btn btn-icon btn-icon-green acc-settings-check"
                        size={16}
                      />
                      <X
                        onClick={handleCancelLanguage}
                        className="btn btn-icon btn-icon-red acc-settings-cancel"
                        size={16}
                      />
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleDeleteAccount}
                className="btn btn-action btn-danger"
              >
                {t("delete_account")}
              </button>
            </div>
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
        </>
      )}
    </div>
  );
};

export default AccountSettings;
