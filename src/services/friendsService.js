import supabase from "../lib/supabase";

// Search users by username (partial match, ≥3 chars enforced server-side).
// Returns (id, username) only — first_name is not exposed to strangers.
export const searchUsers = async (query) => {
  if (!query || query.trim().length < 3) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: users, error } = await supabase.rpc(
    "search_users_by_username",
    {
      query: query.trim(),
    }
  );

  if (error) throw error;
  if (!users || users.length === 0) return [];

  // Fetch existing friendships to annotate each result with status
  const userIds = users.map((u) => u.id);
  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.in.(${userIds.join(",")})),and(addressee_id.eq.${user.id},requester_id.in.(${userIds.join(",")}))`
    );

  if (friendshipsError) throw friendshipsError;

  return users.map((u) => {
    const friendship = friendships?.find(
      (f) =>
        (f.requester_id === user.id && f.addressee_id === u.id) ||
        (f.addressee_id === user.id && f.requester_id === u.id)
    );

    let friendshipStatus = "none";
    if (friendship) {
      if (friendship.status === "accepted") {
        friendshipStatus = "accepted";
      } else if (friendship.requester_id === user.id) {
        friendshipStatus = "pending_sent";
      } else {
        friendshipStatus = "pending_received";
      }
    }

    return { ...u, friendshipStatus };
  });
};

// Send a friend request
export const sendFriendRequest = async (addresseeId) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: addresseeId,
    status: "pending",
  });

  if (error) throw error;
};

// Accept a friend request (current user is the addressee)
export const acceptFriendRequest = async (requesterId) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("requester_id", requesterId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) throw error;
};

// Decline or cancel a friend request / remove a friendship (works for either party)
export const removeFriendship = async (otherUserId) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(addressee_id.eq.${user.id},requester_id.eq.${otherUserId})`
    );

  if (error) throw error;
};

// Get accepted friends with first_name (server-side friendship check inside RPC).
// Two-step: fetch friendship IDs from RLS-protected table, then call get_friend_profiles.
export const getFriends = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: friendships, error } = await supabase
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) throw error;
  if (!friendships || friendships.length === 0) return [];

  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  const { data: profiles, error: profilesError } = await supabase.rpc(
    "get_friend_profiles",
    { friend_ids: friendIds }
  );

  if (profilesError) throw profilesError;
  return profiles || [];
};

// Get pending incoming requests — returns (id, username) only, no first_name.
// Two-step: fetch requester IDs, then look up their public profiles.
export const getPendingRequests = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: pending, error } = await supabase
    .from("friendships")
    .select("requester_id")
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) throw error;
  if (!pending || pending.length === 0) return [];

  const requesterIds = pending.map((f) => f.requester_id);

  const { data: profiles, error: profilesError } = await supabase.rpc(
    "get_profiles_by_ids",
    { user_ids: requesterIds }
  );

  if (profilesError) throw profilesError;
  return profiles || [];
};

// Exact username lookup — returns (id, username) only, used for page routing.
export const getUserByUsername = async (username) => {
  const { data, error } = await supabase.rpc("get_user_by_username", {
    uname: username,
  });

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("User not found");
  return data[0];
};

// Check if current user is friends with a given user id
export const checkFriendship = async (otherUserId) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(addressee_id.eq.${user.id},requester_id.eq.${otherUserId})`
    )
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

// Get a confirmed friend's full profile including first_name.
// Returns null if no accepted friendship exists.
export const getFriendProfile = async (friendId) => {
  const { data, error } = await supabase.rpc("get_friend_profiles", {
    friend_ids: [friendId],
  });

  if (error) throw error;
  return data?.[0] || null;
};

// Fetch all of a friend's recipes with category info (RLS enforces access).
// Filtering and pagination are handled client-side.
export const fetchFriendRecipes = async (friendUserId) => {
  const { data, error } = await supabase
    .from("recipes")
    .select(
      `id, title, slug, images, created_at, updated_at, last_viewed_at,
       recipe_categories(categoriy_id, categories(name, translated_category))`
    )
    .eq("user_id", friendUserId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((recipe) => ({
    ...recipe,
    categories:
      recipe.recipe_categories?.map((rc) => rc.categories?.name) || [],
  }));
};
