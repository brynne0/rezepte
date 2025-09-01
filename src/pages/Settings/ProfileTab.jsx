import { Pencil, Check, X } from "lucide-react";

const ProfileTab = ({
  profileData,
  isEditingUsername,
  tempUsername,
  usernameError,
  isEditingFirstName,
  tempFirstName,
  isEditingLanguage,
  tempLanguage,
  usernameInputRef,
  firstNameInputRef,
  usernameContainerRef,
  firstNameContainerRef,
  languageContainerRef,
  handleEditUsername,
  handleSaveUsername,
  handleCancelUsername,
  handleEditFirstName,
  handleSaveFirstName,
  handleCancelFirstName,
  handleChangePassword,
  handleEditLanguage,
  handleSaveLanguage,
  handleCancelLanguage,
  handleDeleteAccount,
  setTempUsername,
  setUsernameError,
  setTempFirstName,
  setTempLanguage,
  t,
}) => {
  return (
    <div className="profile-settings-container">
      <div className="profile-settings">
        <div className="profile-settings-column">
          <div className="input-validation-wrapper" ref={firstNameContainerRef}>
            <div className="floating-label-input">
              <div className="relative-center">
                <input
                  ref={firstNameInputRef}
                  id="first_name"
                  type="text"
                  value={
                    isEditingFirstName ? tempFirstName : profileData.first_name
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
                  <button
                    className="btn-unstyled btn-icon btn-icon-right"
                    onClick={handleEditFirstName}
                    aria-label={t("edit_first_name")}
                  >
                    <Pencil size={20} />
                  </button>
                ) : (
                  <>
                    <button
                      className="btn-unstyled btn-icon btn-icon-green profile-settings-check"
                      onClick={handleSaveFirstName}
                      aria-label={t("save_changes")}
                    >
                      <Check size={20} />
                    </button>
                    <button
                      className="btn-unstyled btn-icon btn-icon-red profile-settings-cancel"
                      onClick={handleCancelFirstName}
                      aria-label={t("cancel")}
                    >
                      <X size={20} />
                    </button>
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

        <div className="profile-settings-column">
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
                    isEditingUsername ? tempUsername : profileData.username
                  }
                  onChange={
                    isEditingUsername
                      ? (e) => {
                          setTempUsername(e.target.value);
                          setUsernameError("");
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
                  <button
                    className="btn-unstyled btn-icon btn-icon-right"
                    onClick={handleEditUsername}
                    aria-label={t("edit_username")}
                  >
                    <Pencil size={20} />
                  </button>
                ) : (
                  <>
                    <button
                      className="btn-unstyled btn-icon btn-icon-green profile-settings-check"
                      onClick={handleSaveUsername}
                      aria-label={t("save_changes")}
                    >
                      <Check size={20} />
                    </button>
                    <button
                      className="btn-unstyled btn-icon btn-icon-red profile-settings-cancel"
                      onClick={handleCancelUsername}
                      aria-label={t("cancel")}
                    >
                      <X size={20} />
                    </button>
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
                <button
                  className="btn btn-icon btn-icon-right"
                  onClick={handleChangePassword}
                  aria-label={t("change_password")}
                >
                  <Pencil size={20} />
                </button>
              </div>
              <label htmlFor="password">{t("password")}</label>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-settings-language flex-column-center">
        <h2 className="forta-small">{t("preferred_language").toUpperCase()}</h2>

        <div
          className="profile-settings-language-container"
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
              <button
                className={`btn-unstyled language${
                  tempLanguage === "en" ? " selected" : ""
                }`}
                onClick={() => setTempLanguage("en")}
              >
                EN
              </button>
              |
              <button
                className={`btn-unstyled language${
                  tempLanguage === "de" ? " selected" : ""
                }`}
                onClick={() => setTempLanguage("de")}
              >
                DE
              </button>
            </div>
          )}

          {!isEditingLanguage ? (
            <button
              className="btn btn-unstyled profile-settings-check"
              onClick={handleEditLanguage}
              aria-label={t("edit_language")}
            >
              <Pencil size={20} />
            </button>
          ) : (
            <>
              <button
                className="btn btn-icon btn-icon-green profile-settings-check"
                onClick={handleSaveLanguage}
                aria-label={t("save_changes", "Save changes")}
              >
                <Check size={20} />
              </button>
              <button
                className="btn btn-icon btn-icon-red profile-settings-cancel"
                onClick={handleCancelLanguage}
                aria-label={t("cancel", "Cancel")}
              >
                <X size={20} />
              </button>
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
  );
};

export default ProfileTab;
