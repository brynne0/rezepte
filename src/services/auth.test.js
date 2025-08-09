import { describe, test, expect, beforeEach, vi } from "vitest";

// Mock supabase - must be defined before the mock call
vi.mock("../lib/supabase", () => ({
  default: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  },
}));

import {
  signUp,
  signIn,
  signOut,
  forgotPassword,
  changePassword,
  getDisplayName,
} from "./auth";
import supabase from "../lib/supabase";

// Mock window.location
const mockLocation = {
  origin: "https://example.com",
};

Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console.error mock
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("signUp", () => {
    test("calls supabase auth.signUp with correct parameters", async () => {
      const mockData = { user: { id: "123", email: "test@example.com" } };
      supabase.auth.signUp.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await signUp(
        "test@example.com",
        "John",
        "johndoe",
        "password123"
      );

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: {
          data: {
            first_name: "John",
            username: "johndoe",
          },
        },
      });

      expect(result).toEqual({
        data: mockData,
        error: null,
      });
    });

    test("handles signup errors", async () => {
      const mockError = { message: "Email already exists" };
      supabase.auth.signUp.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await signUp(
        "test@example.com",
        "John",
        "johndoe",
        "password123"
      );

      expect(result).toEqual({
        data: null,
        error: mockError,
      });
    });
  });

  describe("signIn", () => {
    test("successfully signs in with valid username and password", async () => {
      const mockUser = { email: "test@example.com" };
      const mockAuthData = { user: { id: "123" }, session: {} };

      supabase.single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: mockAuthData,
        error: null,
      });

      const result = await signIn("johndoe", "password123");

      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(supabase.select).toHaveBeenCalledWith("email");
      expect(supabase.eq).toHaveBeenCalledWith("username", "johndoe");
      expect(supabase.single).toHaveBeenCalled();

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });

      expect(result).toEqual({
        data: mockAuthData,
        error: null,
      });
    });

    test("returns error when username lookup fails", async () => {
      const mockError = { message: "User not found" };
      supabase.single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await signIn("nonexistent", "password123");

      expect(result).toEqual({
        data: null,
        error: mockError,
      });

      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    test("returns error when sign in fails", async () => {
      const mockUser = { email: "test@example.com" };
      const mockError = { message: "Invalid password" };

      supabase.single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      supabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await signIn("johndoe", "wrongpassword");

      expect(result).toEqual({
        data: null,
        error: mockError,
      });
    });
  });

  describe("signOut", () => {
    test("successfully signs out", async () => {
      supabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(result).toEqual({ error: null });
    });

    test("handles sign out errors", async () => {
      const mockError = { message: "Sign out failed" };
      supabase.auth.signOut.mockResolvedValue({ error: mockError });

      const result = await signOut();

      expect(result).toEqual({ error: mockError });
    });
  });

  describe("forgotPassword", () => {
    test("successfully sends password reset email", async () => {
      const mockData = { message: "Password reset email sent" };
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await forgotPassword("test@example.com");

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        {
          redirectTo: "https://example.com/change-password",
        }
      );

      expect(result).toEqual({
        data: mockData,
        error: null,
      });
    });

    test("handles reset password errors", async () => {
      const mockError = { message: "Invalid email" };
      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await forgotPassword("invalid-email");

      expect(result).toEqual({
        data: null,
        error: mockError,
      });
    });

    test("handles exceptions and logs errors", async () => {
      const mockError = new Error("Network error");
      supabase.auth.resetPasswordForEmail.mockRejectedValue(mockError);

      const result = await forgotPassword("test@example.com");

      expect(console.error).toHaveBeenCalledWith(
        "Password reset error:",
        mockError
      );
      expect(result).toEqual({ error: mockError });
    });
  });

  describe("changePassword", () => {
    test("successfully changes password for authenticated user", async () => {
      const mockUser = { id: "123", email: "test@example.com" };
      const mockData = { user: mockUser };

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      supabase.auth.updateUser.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await changePassword("newpassword123");

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "newpassword123",
      });

      expect(result).toEqual({
        data: mockData,
        error: null,
      });
    });

    test("returns error when no authenticated user", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await changePassword("newpassword123");

      expect(console.error).toHaveBeenCalledWith("No authenticated user found");
      expect(result).toEqual({
        error: { message: "No authenticated user" },
      });
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });

    test("returns error when getUser fails", async () => {
      const mockError = { message: "Authentication failed" };
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await changePassword("newpassword123");

      expect(console.error).toHaveBeenCalledWith("No authenticated user found");
      expect(result).toEqual({
        error: { message: "No authenticated user" },
      });
    });

    test("handles updateUser errors and logs them", async () => {
      const mockUser = { id: "123", email: "test@example.com" };
      const mockError = { message: "Password update failed" };

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      supabase.auth.updateUser.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await changePassword("newpassword123");

      expect(console.error).toHaveBeenCalledWith(
        "Supabase updateUser error:",
        mockError
      );
      expect(result).toEqual({
        data: null,
        error: mockError,
      });
    });

    test("handles exceptions and logs them", async () => {
      const mockError = new Error("Network error");
      supabase.auth.getUser.mockRejectedValue(mockError);

      const result = await changePassword("newpassword123");

      expect(console.error).toHaveBeenCalledWith(
        "Change password service exception:",
        mockError
      );
      expect(result).toEqual({ error: mockError });
    });
  });

  describe("getDisplayName", () => {
    test("returns formatted display name for authenticated user", async () => {
      const mockUser = { id: "123", email: "test@example.com" };
      const mockUserData = { first_name: "John" };

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      supabase.single.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await getDisplayName();

      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith("users");
      expect(supabase.select).toHaveBeenCalledWith("first_name");
      expect(supabase.eq).toHaveBeenCalledWith("id", "123");
      expect(supabase.single).toHaveBeenCalled();

      expect(result).toBe("John's");
    });

    test("returns null for non-authenticated users", async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getDisplayName();

      expect(result).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    test("returns null when auth getUser fails", async () => {
      const mockError = { message: "Authentication failed" };
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await getDisplayName();

      expect(result).toBeNull();
    });

    test("returns null when user data query fails", async () => {
      const mockUser = { id: "123", email: "test@example.com" };
      const mockError = { message: "User not found" };

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      supabase.single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await getDisplayName();

      expect(result).toBeNull();
    });

    test("returns null when first_name is missing", async () => {
      const mockUser = { id: "123", email: "test@example.com" };
      const mockUserData = { first_name: null };

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      supabase.single.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await getDisplayName();

      expect(result).toBeNull();
    });

    test("returns null when first_name is empty string", async () => {
      const mockUser = { id: "123", email: "test@example.com" };
      const mockUserData = { first_name: "" };

      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      supabase.single.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await getDisplayName();

      expect(result).toBeNull();
    });

    test("handles exceptions gracefully", async () => {
      supabase.auth.getUser.mockRejectedValue(new Error("Network error"));

      const result = await getDisplayName();

      expect(result).toBeNull();
    });
  });
});