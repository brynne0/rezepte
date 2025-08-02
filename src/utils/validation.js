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

export const validateRecipeCategory = (category, t) => {
  if (!category.trim()) {
    return t("category_required");
  }
  return null;
};

export const validateRecipeIngredients = (ingredients, isLinkOnly, t) => {
  if (!isLinkOnly && ingredients.every((ing) => !ing.name || !ing.name.trim())) {
    return t("ingredient_required");
  }
  return null;
};

// Composite recipe validation function
export const validateRecipeForm = (formData, t) => {
  const errors = {};
  const { title, category, ingredients, link_only } = formData;

  // Title validation
  const titleError = validateRecipeTitle(title, t);
  if (titleError) errors.title = titleError;

  // Category validation
  const categoryError = validateRecipeCategory(category, t);
  if (categoryError) errors.category = categoryError;

  // Ingredients validation (only for non-link recipes)
  const ingredientsError = validateRecipeIngredients(ingredients, link_only, t);
  if (ingredientsError) errors.ingredients = ingredientsError;

  return errors;
};
