import supabase from "../lib/supabase";

export const signUp = async (email, first_name, username, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name,
        username,
      },
    },
  });

  return { data, error };
};

export const signIn = async (username, password) => {
  // Look up email by username
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("email")
    .eq("username", username)
    .single();

  if (userError) return { data: null, error: userError };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const forgotPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/change-password`,
    });

    return { data, error };
  } catch (err) {
    console.error("Password reset error:", err);
    return { error: err };
  }
};

export const verifyCurrentPassword = async (currentPassword) => {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: { message: "No authenticated user" } };
    }

    // Get user's email from database
    const { data: userData, error: emailError } = await supabase
      .from("users")
      .select("email")
      .eq("id", user.id)
      .single();

    if (emailError || !userData?.email) {
      return { error: { message: "Could not retrieve user email" } };
    }

    // Try to sign in with current credentials to verify password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: currentPassword,
    });

    if (error) {
      return { error: { message: "Current password is incorrect" } };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Verify password service exception:", err);
    return { error: err };
  }
};

export const changePassword = async (new_password) => {
  try {
    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("No authenticated user found");
      return { error: { message: "No authenticated user" } };
    }

    const { data, error } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (error) {
      console.error("Supabase updateUser error:", error);
    }

    return { data, error };
  } catch (err) {
    console.error("Change password service exception:", err);
    return { error: err };
  }
};

export const getFirstName = async () => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // Default display name for non-authenticated users
      return null;
    }

    // Get the user's first name from the database
    const { data, error } = await supabase
      .from("users")
      .select("first_name")
      .eq("id", user.id)
      .single();

    if (error || !data?.first_name) {
      return null;
    }

    return data.first_name;
  } catch {
    return null;
  }
};
