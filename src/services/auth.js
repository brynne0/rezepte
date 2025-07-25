import supabase from "../utils/supabaseClient";

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

export const changePassword = async (new_password) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: new_password,
    });

    return { data, error };
  } catch (err) {
    console.error("Password change error:", err);
    return { error: err };
  }
};

export const getDisplayName = async () => {
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

    return `${data.first_name}'s`;
  } catch {
    return null;
  }
};
