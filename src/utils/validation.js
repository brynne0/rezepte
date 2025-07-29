export const validateEmail = (email, t) => {
  if (!email.trim()) {
    return t("email_required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return t("email_invalid");
  }
  return null;
};

export const validateUsername = (username, t) => {
  if (!username.trim()) {
    return t("username_required");
  }
  return null;
};

export const validatePassword = (password, t) => {
  if (!password.trim()) {
    return t("password_required");
  }
  return null;
};

export const validateFirstName = (firstName, t) => {
  if (!firstName.trim()) {
    return t("firstname_required");
  }
  return null;
};

// Composite validation functions
export const validateAuthForm = (formData, isSignUpMode, t) => {
  const errors = {};
  const { username, password, email, firstName } = formData;

  // Username validation
  const usernameError = validateUsername(username, t);
  if (usernameError) errors.username = usernameError;

  // Password validation
  const passwordError = validatePassword(password, t);
  if (passwordError) errors.password = passwordError;

  // Sign-up specific validations
  if (isSignUpMode) {
    const emailError = validateEmail(email, t);
    if (emailError) errors.email = emailError;

    const firstNameError = validateFirstName(firstName, t);
    if (firstNameError) errors.firstName = firstNameError;
  }

  return errors;
};

export const validateForgotPasswordForm = (email, t) => {
  const errors = {};

  const emailError = validateEmail(email, t);
  if (emailError) errors.email = emailError;

  return errors;
};

export const validateChangePasswordForm = (formData, t) => {
  const errors = {};
  const { newPassword, newPasswordRepeat } = formData;

  const passwordError = validatePassword(newPassword, t);
  if (passwordError) errors.newPassword = passwordError;

  if (!newPasswordRepeat.trim()) {
    errors.newPasswordRepeat = t("password_repeat_required");
  } else if (newPassword !== newPasswordRepeat) {
    errors.newPasswordRepeat = t("passwords_do_not_match");
  }

  return errors;
};
