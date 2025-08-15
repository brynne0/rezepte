import { Pencil, ArrowBigLeft, Check, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getUserPreferredLanguage,
  updateUserPreferredLanguage,
  getUserProfile,
  updateUserProfile,
} from "../../services/userService";
import LoadingAcorn from "../../components/LoadingAcorn/LoadingAcorn";
import "./AccountSettings.css";

const AccountSettings = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState("");
  const [isEditingLanguage, setIsEditingLanguage] = useState(false);
  const [tempLanguage, setTempLanguage] = useState("");
  const usernameInputRef = useRef(null);
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

  const handleEditUsername = () => {
    setTempUsername(profileData.username);
    setIsEditingUsername(true);
    setTimeout(() => usernameInputRef.current?.focus(), 0);
  };

  const handleSaveUsername = async () => {
    try {
      await updateUserProfile({ username: tempUsername });
      setProfileData({ ...profileData, username: tempUsername });
      setIsEditingUsername(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelUsername = () => {
    setTempUsername("");
    setIsEditingUsername(false);
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

  const getMaxInputWidth = () => {
    if (!profileData) return "200px";

    const widths = [
      profileData.first_name?.length || 0,
      profileData.email?.length || 0,
      (isEditingUsername ? tempUsername : profileData.username)?.length || 0,
      "**************".length,
    ];

    const maxLength = Math.max(...widths);
    return Math.max(maxLength * 8 + 20, 200) + "px";
  };

  if (loading) {
    return <LoadingAcorn />;
  }
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="page-centered">
      <div className="auth-container card card-settings">
        <div className="flex-row">
          <ArrowBigLeft
            className="back-arrow-responsive"
            onClick={() => navigate(-1)}
          />
          <h1 className="forta-small">{t("account_settings").toUpperCase()}</h1>
        </div>

        <div className="acc-settings">
          <div className="acc-settings-column">
            <div>
              <label htmlFor="first_name">
                <h2 className="forta acc-settings-header">{t("first_name")}</h2>
              </label>
              <input
                id="first_name"
                type="text"
                value={profileData.first_name}
                className={"input"}
                style={{ width: getMaxInputWidth() }}
                readOnly={true}
              />
            </div>

            <div>
              <label htmlFor="email">
                <h2 className="forta acc-settings-header">{t("email")}</h2>
              </label>
              <input
                id="email"
                type="email"
                value={profileData.email}
                className={"input"}
                style={{ width: getMaxInputWidth() }}
                readOnly={true}
              />
            </div>
          </div>

          <div className="acc-settings-column">
            <div>
              <span className="flex-row acc-settings-header">
                <label htmlFor="username">
                  <h2 className="forta-small">{t("username")}</h2>
                </label>
                {!isEditingUsername ? (
                  <Pencil onClick={handleEditUsername} className="btn" />
                ) : (
                  <div className="acc-settings-actions">
                    <Check
                      onClick={handleSaveUsername}
                      className="btn btn-icon-green"
                    />
                    <X
                      onClick={handleCancelUsername}
                      className="btn btn-icon-red"
                    />
                  </div>
                )}
              </span>
              <input
                ref={usernameInputRef}
                id="username"
                type="text"
                value={isEditingUsername ? tempUsername : profileData.username}
                onChange={
                  isEditingUsername
                    ? (e) => setTempUsername(e.target.value)
                    : undefined
                }
                className={"input"}
                style={{ width: getMaxInputWidth() }}
                readOnly={!isEditingUsername}
              />
            </div>

            <div>
              <span className="flex-row acc-settings-header">
                <label htmlFor="password">
                  <h2 className="forta-small">{t("password")}</h2>
                </label>
                <Pencil onClick={handleChangePassword} className="btn" />
              </span>
              <input
                id="password"
                type="password"
                value="**************"
                className={"input "}
                style={{ width: getMaxInputWidth() }}
                readOnly={true}
              />
            </div>
          </div>
        </div>

        <div className="acc-settings-language flex-column-center">
          <span className="flex-row acc-settings-header">
            <label htmlFor="preferred_language">
              <h2 className="forta-small">
                {t("preferred_language").toUpperCase()}
              </h2>
            </label>
            {!isEditingLanguage ? (
              <Pencil onClick={handleEditLanguage} className="btn" />
            ) : (
              <div className="acc-settings-actions">
                <Check
                  onClick={handleSaveLanguage}
                  className="btn btn-icon-green"
                />
                <X
                  onClick={handleCancelLanguage}
                  className="btn btn-icon-red"
                />
              </div>
            )}
          </span>

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
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
