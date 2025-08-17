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

// Password strength validation functions
export const checkPasswordLength = (password) => {
  return password.length >= 8;
};

export const checkPasswordLowercase = (password) => {
  return /[a-z]/.test(password);
};

export const checkPasswordUppercase = (password) => {
  return /[A-Z]/.test(password);
};

export const checkPasswordDigit = (password) => {
  return /\d/.test(password);
};

export const checkPasswordSymbol = (password) => {
  return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
};

export const validatePasswordStrength = (password) => {
  return {
    length: checkPasswordLength(password),
    lowercase: checkPasswordLowercase(password),
    uppercase: checkPasswordUppercase(password),
    digit: checkPasswordDigit(password),
    symbol: checkPasswordSymbol(password),
  };
};

export const isPasswordStrong = (password) => {
  const requirements = validatePasswordStrength(password);
  return Object.values(requirements).every(Boolean);
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

export const validateChangePasswordForm = (formData, t, requireOldPassword = false) => {
  const errors = {};
  const { oldPassword, newPassword, newPasswordRepeat } = formData;

  // Validate old password if required (when coming from account settings)
  if (requireOldPassword) {
    const oldPasswordError = validatePassword(oldPassword, t);
    if (oldPasswordError) errors.oldPassword = oldPasswordError;
  }

  const passwordError = validatePassword(newPassword, t);
  if (passwordError) errors.newPassword = passwordError;

  // Check if new password is the same as old password
  if (requireOldPassword && oldPassword && newPassword && oldPassword === newPassword) {
    errors.newPassword = t("new_password_same_as_old");
  }

  if (!newPasswordRepeat.trim()) {
    errors.newPasswordRepeat = t("password_repeat_required");
  } else if (newPassword !== newPasswordRepeat) {
    errors.newPasswordRepeat = t("passwords_do_not_match");
  }

  return errors;
};

// Recipe validation functions
export const validateRecipeTitle = (title, t) => {
  if (!title.trim()) {
    return t("title_required");
  }
  return null;
};

export const validateRecipeTitleUnique = async (title, t, excludeId = null) => {
  try {
    const { checkRecipeTitleExists } = await import("../services/recipes");
    const exists = await checkRecipeTitleExists(title, excludeId);
    if (exists) {
      return t("title_already_exists");
    }
    return null;
  } catch (error) {
    console.error("Error checking title uniqueness:", error);
    return null; // Don't block submission if check fails
  }
};

export const validateRecipeCategory = (categories, t) => {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return t("category_required");
  }
  return null;
};

// Composite recipe validation function
export const validateRecipeForm = (formData, t) => {
  const errors = {};
  const { title, categories } = formData;

  // Title validation
  const titleError = validateRecipeTitle(title, t);
  if (titleError) errors.title = titleError;

  // Category validation
  const categoryError = validateRecipeCategory(categories, t);
  if (categoryError) errors.category = categoryError;

  return errors;
};

// Username uniqueness validation for signup
export const validateUsernameUnique = async (username, t) => {
  try {
    const { checkUsernameExistsForSignup } = await import("../services/userService");
    const exists = await checkUsernameExistsForSignup(username);
    if (exists) {
      return t("username_already_exists");
    }
    return null;
  } catch (error) {
    console.error("Error checking username uniqueness:", error);
    return null; // Don't block submission if check fails
  }
};

// Email uniqueness validation for signup
export const validateEmailUnique = async (email, t) => {
  try {
    const { checkEmailExistsForSignup } = await import("../services/userService");
    const exists = await checkEmailExistsForSignup(email);
    if (exists) {
      return t("email_already_exists");
    }
    return null;
  } catch (error) {
    console.error("Error checking email uniqueness:", error);
    return null; // Don't block submission if check fails
  }
};

// Utility function to check if input is an email
export const isEmail = (input) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
};
