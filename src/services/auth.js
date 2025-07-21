import supabase from "../utils/supabaseClient";

export const signUp = async (email, name, username, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (data.user && !error) {
    // Insert into users table
    await supabase.from("users").insert({
      id: data.user.id,
      display_name: name,
      username,
      email,
    });
  }

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
