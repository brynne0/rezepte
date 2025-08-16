import supabase from "../lib/supabase";

// Get user's preferred language from database
export const getUserPreferredLanguage = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "en";

    const { data: userData } = await supabase
      .from("users")
      .select("preferred_language")
      .eq("id", user.id)
      .single();

    return userData?.preferred_language || "en";
  } catch (error) {
    console.error("Error fetching user preferred language:", error);
    return "en"; // Default fallback
  }
};

// Update user's preferred language
export const updateUserPreferredLanguage = async (language) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("users")
      .update({ preferred_language: language })
      .eq("id", user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating user preferred language:", error);
    throw error;
  }
};

// Get user profile data
export const getUserProfile = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    return profile;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

// Check if username already exists (excluding current user)
export const checkUsernameExists = async (username) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .neq("id", user.id) // Exclude current user
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("Error checking username existence:", error);
    throw error;
  }
};

// Check if email already exists (excluding current user)
export const checkEmailExists = async (email) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .neq("id", user.id) // Exclude current user
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("Error checking email existence:", error);
    throw error;
  }
};

// Check if username exists for signup (no user exclusion)
export const checkUsernameExistsForSignup = async (username) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("Error checking username existence for signup:", error);
    throw error;
  }
};

// Check if email exists for signup (no user exclusion)
export const checkEmailExistsForSignup = async (email) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error("Error checking email existence for signup:", error);
    throw error;
  }
};

// Update user profile data
export const updateUserProfile = async (updates) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Delete user account
export const deleteUserAccount = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Delete user data from users table (this should trigger auth user deletion via database trigger)
    const { error: profileError } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id);

    if (profileError) throw profileError;

    // Sign out the user to clear the session
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Error signing out:", signOutError);
      // Don't throw here, account is already deleted
    }

    return true;
  } catch (error) {
    console.error("Error deleting user account:", error);
    throw error;
  }
};
