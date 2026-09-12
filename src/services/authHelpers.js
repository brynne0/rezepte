import supabase from "../lib/supabase";

// supabase.auth.getUser() needs to reach Supabase's servers to verify the
// session, so it also resolves to no user when the device is offline. Without
// this check that case gets mislabeled as "User not authenticated".
export const getAuthenticatedUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!navigator.onLine) {
      const { default: i18n } = await import("../lib/i18n");
      throw new Error(i18n.t("no_internet_connection"));
    }
    throw new Error("User not authenticated");
  }

  return user;
};
