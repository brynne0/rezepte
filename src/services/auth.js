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

export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password`,
    });

    return { data, error };
  } catch (err) {
    console.error("Password reset error:", err);
    return { error: err };
  }
};
