import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  validateEmail,
  validateUsername,
  validatePassword,
  validateFirstName,
  validateAuthForm,
  validateForgotPasswordForm,
  validateChangePasswordForm,
  validateRecipeTitle,
  validateRecipeTitleUnique,
  validateRecipeCategory,
  validateRecipeForm,
} from "./validation";

// Mock the recipes service
vi.mock("../services/recipes", () => ({
  checkRecipeTitleExists: vi.fn(),
}));

describe("Validation Utilities", () => {
  // Mock translation function
  const mockT = vi.fn((key) => key);

  beforeEach(() => {
    vi.clearAllMocks();
    mockT.mockImplementation((key) => key);
  });

  describe("validateEmail", () => {
    test("returns error when email is empty", () => {
      expect(validateEmail("", mockT)).toBe("email_required");
      expect(validateEmail("   ", mockT)).toBe("email_required");
      expect(mockT).toHaveBeenCalledWith("email_required");
    });

    test("returns error for invalid email format", () => {
      const invalidEmails = [
        "invalid",
        "invalid@",
        "@domain.com",
        "invalid@domain",
        "invalid@.com",
        "invalid email@domain.com",
      ];

      invalidEmails.forEach((email) => {
        expect(validateEmail(email, mockT)).toBe("email_invalid");
      });

      expect(mockT).toHaveBeenCalledWith("email_invalid");
    });

    test("returns null for valid email addresses", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "first+last@subdomain.domain.com",
        "user123@test-domain.org",
        "a@b.co",
      ];

      validEmails.forEach((email) => {
        expect(validateEmail(email, mockT)).toBeNull();
      });
    });

    test("trims whitespace from email", () => {
      expect(validateEmail("  test@example.com  ", mockT)).toBeNull();
      expect(validateEmail("\tuser@domain.com\n", mockT)).toBeNull();
    });
  });

  describe("validateUsername", () => {
    test("returns error when username is empty", () => {
      expect(validateUsername("", mockT)).toBe("username_required");
      expect(validateUsername("   ", mockT)).toBe("username_required");
      expect(mockT).toHaveBeenCalledWith("username_required");
    });

    test("returns null for valid username", () => {
      expect(validateUsername("validuser", mockT)).toBeNull();
      expect(validateUsername("user123", mockT)).toBeNull();
      expect(validateUsername("  validuser  ", mockT)).toBeNull();
    });
  });

  describe("validatePassword", () => {
    test("returns error when password is empty", () => {
      expect(validatePassword("", mockT)).toBe("password_required");
      expect(validatePassword("   ", mockT)).toBe("password_required");
      expect(mockT).toHaveBeenCalledWith("password_required");
    });

    test("returns null for valid password", () => {
      expect(validatePassword("password123", mockT)).toBeNull();
      expect(validatePassword("  password123  ", mockT)).toBeNull();
      expect(validatePassword("a", mockT)).toBeNull(); // No length requirement
    });
  });

  describe("validateFirstName", () => {
    test("returns error when firstName is empty", () => {
      expect(validateFirstName("", mockT)).toBe("firstname_required");
      expect(validateFirstName("   ", mockT)).toBe("firstname_required");
      expect(mockT).toHaveBeenCalledWith("firstname_required");
    });

    test("returns null for valid firstName", () => {
      expect(validateFirstName("John", mockT)).toBeNull();
      expect(validateFirstName("  Jane  ", mockT)).toBeNull();
      expect(validateFirstName("María", mockT)).toBeNull();
    });
  });

  describe("validateAuthForm", () => {
    const validFormData = {
      username: "testuser",
      password: "password123",
      email: "test@example.com",
      firstName: "John",
    };

    test("validates login form (isSignUpMode = false)", () => {
      const errors = validateAuthForm(validFormData, false, mockT);
      expect(errors).toEqual({});
    });

    test("validates signup form (isSignUpMode = true)", () => {
      const errors = validateAuthForm(validFormData, true, mockT);
      expect(errors).toEqual({});
    });

    test("returns username error when username is missing", () => {
      const formData = { ...validFormData, username: "" };
      const errors = validateAuthForm(formData, false, mockT);
      expect(errors.username).toBe("username_required");
    });

    test("returns password error when password is missing", () => {
      const formData = { ...validFormData, password: "" };
      const errors = validateAuthForm(formData, false, mockT);
      expect(errors.password).toBe("password_required");
    });

    test("returns email error in signup mode when email is missing", () => {
      const formData = { ...validFormData, email: "" };
      const errors = validateAuthForm(formData, true, mockT);
      expect(errors.email).toBe("email_required");
    });

    test("returns firstName error in signup mode when firstName is missing", () => {
      const formData = { ...validFormData, firstName: "" };
      const errors = validateAuthForm(formData, true, mockT);
      expect(errors.firstName).toBe("firstname_required");
    });

    test("does not validate email and firstName in login mode", () => {
      const formData = {
        username: "testuser",
        password: "password123",
        email: "",
        firstName: "",
      };
      const errors = validateAuthForm(formData, false, mockT);
      expect(errors.email).toBeUndefined();
      expect(errors.firstName).toBeUndefined();
    });

    test("returns multiple errors when multiple fields are invalid", () => {
      const formData = {
        username: "",
        password: "",
        email: "invalid-email",
        firstName: "",
      };
      const errors = validateAuthForm(formData, true, mockT);
      expect(errors.username).toBe("username_required");
      expect(errors.password).toBe("password_required");
      expect(errors.email).toBe("email_invalid");
      expect(errors.firstName).toBe("firstname_required");
    });
  });

  describe("validateForgotPasswordForm", () => {
    test("returns empty errors object for valid email", () => {
      const errors = validateForgotPasswordForm("test@example.com", mockT);
      expect(errors).toEqual({});
    });

    test("returns email error when email is invalid", () => {
      const errors = validateForgotPasswordForm("invalid-email", mockT);
      expect(errors.email).toBe("email_invalid");
    });

    test("returns email error when email is empty", () => {
      const errors = validateForgotPasswordForm("", mockT);
      expect(errors.email).toBe("email_required");
    });
  });

  describe("validateChangePasswordForm", () => {
    test("returns empty errors object for valid form data", () => {
      const formData = {
        newPassword: "newpassword123",
        newPasswordRepeat: "newpassword123",
      };
      const errors = validateChangePasswordForm(formData, mockT);
      expect(errors).toEqual({});
    });

    test("returns newPassword error when new password is empty", () => {
      const formData = {
        newPassword: "",
        newPasswordRepeat: "password123",
      };
      const errors = validateChangePasswordForm(formData, mockT);
      expect(errors.newPassword).toBe("password_required");
    });

    test("returns newPasswordRepeat error when password repeat is empty", () => {
      const formData = {
        newPassword: "password123",
        newPasswordRepeat: "",
      };
      const errors = validateChangePasswordForm(formData, mockT);
      expect(errors.newPasswordRepeat).toBe("password_repeat_required");
    });

    test("returns error when passwords do not match", () => {
      const formData = {
        newPassword: "password123",
        newPasswordRepeat: "differentpassword",
      };
      const errors = validateChangePasswordForm(formData, mockT);
      expect(errors.newPasswordRepeat).toBe("passwords_do_not_match");
    });

    test("returns multiple errors when both password fields are invalid", () => {
      const formData = {
        newPassword: "",
        newPasswordRepeat: "",
      };
      const errors = validateChangePasswordForm(formData, mockT);
      expect(errors.newPassword).toBe("password_required");
      expect(errors.newPasswordRepeat).toBe("password_repeat_required");
    });

    test("handles whitespace in password comparison", () => {
      const formData = {
        newPassword: "password123",
        newPasswordRepeat: "   ",
      };
      const errors = validateChangePasswordForm(formData, mockT);
      expect(errors.newPasswordRepeat).toBe("password_repeat_required");
    });

    describe("with old password requirement", () => {
      test("returns oldPassword error when old password is empty and required", () => {
        const formData = {
          oldPassword: "",
          newPassword: "newpassword123",
          newPasswordRepeat: "newpassword123",
        };
        const errors = validateChangePasswordForm(formData, mockT, true);
        expect(errors.oldPassword).toBe("password_required");
      });

      test("returns error when new password is same as old password", () => {
        const formData = {
          oldPassword: "samepassword123",
          newPassword: "samepassword123",
          newPasswordRepeat: "samepassword123",
        };
        const errors = validateChangePasswordForm(formData, mockT, true);
        expect(errors.newPassword).toBe("new_password_same_as_old");
        expect(mockT).toHaveBeenCalledWith("new_password_same_as_old");
      });

      test("allows new password when different from old password", () => {
        const formData = {
          oldPassword: "oldpassword123",
          newPassword: "newpassword123",
          newPasswordRepeat: "newpassword123",
        };
        const errors = validateChangePasswordForm(formData, mockT, true);
        expect(errors).toEqual({});
      });

      test("does not check password similarity when requireOldPassword is false", () => {
        const formData = {
          oldPassword: "samepassword123",
          newPassword: "samepassword123",
          newPasswordRepeat: "samepassword123",
        };
        const errors = validateChangePasswordForm(formData, mockT, false);
        expect(errors.newPassword).toBeUndefined();
      });

      test("does not check password similarity when old password is empty", () => {
        const formData = {
          oldPassword: "",
          newPassword: "password123",
          newPasswordRepeat: "password123",
        };
        const errors = validateChangePasswordForm(formData, mockT, true);
        expect(errors.oldPassword).toBe("password_required"); // Error is on oldPassword field
        expect(errors.newPassword).toBeUndefined(); // No similarity check when oldPassword is empty
      });
    });
  });

  describe("validateRecipeTitle", () => {
    test("returns error when title is empty", () => {
      expect(validateRecipeTitle("", mockT)).toBe("title_required");
      expect(validateRecipeTitle("   ", mockT)).toBe("title_required");
    });

    test("returns null for valid title", () => {
      expect(validateRecipeTitle("Chocolate Cake", mockT)).toBeNull();
      expect(validateRecipeTitle("  Recipe Title  ", mockT)).toBeNull();
    });
  });

  describe("validateRecipeTitleUnique", () => {
    let mockCheckRecipeTitleExists;

    beforeEach(async () => {
      const recipesModule = await import("../services/recipes");
      mockCheckRecipeTitleExists = recipesModule.checkRecipeTitleExists;
    });

    test("returns null when title is unique", async () => {
      mockCheckRecipeTitleExists.mockResolvedValue(false);

      const result = await validateRecipeTitleUnique("Unique Title", mockT);
      expect(result).toBeNull();
      expect(mockCheckRecipeTitleExists).toHaveBeenCalledWith(
        "Unique Title",
        null
      );
    });

    test("returns error when title already exists", async () => {
      mockCheckRecipeTitleExists.mockResolvedValue(true);

      const result = await validateRecipeTitleUnique("Existing Title", mockT);
      expect(result).toBe("title_already_exists");
    });

    test("excludes specific recipe ID when checking uniqueness", async () => {
      mockCheckRecipeTitleExists.mockResolvedValue(false);

      const result = await validateRecipeTitleUnique(
        "Title",
        mockT,
        "recipe-123"
      );
      expect(result).toBeNull();
      expect(mockCheckRecipeTitleExists).toHaveBeenCalledWith(
        "Title",
        "recipe-123"
      );
    });

    test("returns null when check fails due to error", async () => {
      mockCheckRecipeTitleExists.mockRejectedValue(new Error("Database error"));

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await validateRecipeTitleUnique("Title", mockT);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error checking title uniqueness:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("validateRecipeCategory", () => {
    test("returns error when category is empty", () => {
      expect(validateRecipeCategory("", mockT)).toBe("category_required");
      expect(validateRecipeCategory("   ", mockT)).toBe("category_required");
    });

    test("returns null for valid category", () => {
      expect(validateRecipeCategory("Desserts", mockT)).toBeNull();
      expect(validateRecipeCategory("  Main Course  ", mockT)).toBeNull();
    });
  });

  describe("validateRecipeForm", () => {
    const validFormData = {
      title: "Chocolate Cake",
      category: "Desserts",
      ungroupedIngredients: [{ name: "flour" }, { name: "sugar" }],
    };

    test("returns empty errors object for valid form data", () => {
      const errors = validateRecipeForm(validFormData, mockT);
      expect(errors).toEqual({});
    });

    test("returns title error when title is missing", () => {
      const formData = { ...validFormData, title: "" };
      const errors = validateRecipeForm(formData, mockT);
      expect(errors.title).toBe("title_required");
    });

    test("returns category error when category is missing", () => {
      const formData = { ...validFormData, category: "" };
      const errors = validateRecipeForm(formData, mockT);
      expect(errors.category).toBe("category_required");
    });

    test("returns multiple errors when multiple fields are invalid", () => {
      const formData = {
        title: "",
        category: "",
      };
      const errors = validateRecipeForm(formData, mockT);

      expect(errors.title).toBe("title_required");
      expect(errors.category).toBe("category_required");
    });

    test("validates with ingredient sections structure", () => {
      const formData = {
        title: "Complex Recipe",
        category: "Main Course",
        ingredientSections: [
          {
            subheading: "For the sauce",
            ingredients: [{ name: "tomatoes" }],
          },
        ],
      };
      const errors = validateRecipeForm(formData, mockT);
      expect(errors).toEqual({});
    });

    test("validates with backward compatible ingredients structure", () => {
      const formData = {
        title: "Old Recipe",
        category: "Appetizers",
        ingredients: [{ name: "cheese" }],
      };
      const errors = validateRecipeForm(formData, mockT);
      expect(errors).toEqual({});
    });
  });
});
