import supabase from "../lib/supabase";

// Fetch all cooking times for the current user
export const fetchUserCookingTimes = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("user_cooking_times")
    .select("*")
    .eq("user_id", user.id)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch cooking times: ${error.message}`);
  }

  return data || [];
};

// Create a new cooking time
export const createCookingTime = async (
  cookingTimeData,
  sectionName = null,
  orderIndex = 0
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const cleanData = {
    user_id: user.id,
    ingredient_name: cookingTimeData.ingredient_name.trim(),
    cooking_time: cookingTimeData.cooking_time || null,
    soaking_time: cookingTimeData.soaking_time || null,
    dry_weight: cookingTimeData.dry_weight || null,
    cooked_weight: cookingTimeData.cooked_weight || null,
    notes: cookingTimeData.notes?.trim() || null,
    section_name: sectionName,
    order_index: orderIndex,
  };

  const { data, error } = await supabase
    .from("user_cooking_times")
    .insert([cleanData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create cooking time: ${error.message}`);
  }

  return data;
};

// Update an existing cooking time
export const updateCookingTime = async (id, cookingTimeData) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const cleanData = {
    ingredient_name: cookingTimeData.ingredient_name.trim(),
    cooking_time: cookingTimeData.cooking_time || null,
    soaking_time: cookingTimeData.soaking_time || null,
    dry_weight: cookingTimeData.dry_weight || null,
    cooked_weight: cookingTimeData.cooked_weight || null,
    notes: cookingTimeData.notes?.trim() || null,
    section_name: cookingTimeData.section_name,
    order_index: cookingTimeData.order_index,
  };

  const { data, error } = await supabase
    .from("user_cooking_times")
    .update(cleanData)
    .eq("id", id)
    .eq("user_id", user.id) // Ensure user can only update their own data
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update cooking time: ${error.message}`);
  }

  return data;
};

// Delete a cooking time
export const deleteCookingTime = async (id) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("user_cooking_times")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id); // Ensure user can only delete their own data

  if (error) {
    throw new Error(`Failed to delete cooking time: ${error.message}`);
  }

  return true;
};

// Search cooking times by ingredient name
export const searchCookingTimes = async (query) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("user_cooking_times")
    .select("*")
    .eq("user_id", user.id)
    .ilike("ingredient_name", `%${query}%`)
    .order("ingredient_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to search cooking times: ${error.message}`);
  }

  return data || [];
};

// Update cooking times order (for drag and drop)
export const updateCookingTimesOrder = async (cookingTimes) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    // Update each cooking time with new order and section
    const updates = cookingTimes.map((item) => ({
      id: item.id,
      order_index: item.order_index,
      section_name: item.section_name || null,
    }));

    const { error } = await supabase.from("user_cooking_times").upsert(updates);

    if (error) {
      throw new Error(`Failed to update cooking times order: ${error.message}`);
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to update cooking times order: ${error.message}`);
  }
};

// Create a new section by updating existing items
export const createSection = async (sectionName, selectedItemIds = []) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    // Update selected items to be part of the new section
    if (selectedItemIds.length > 0) {
      const { error } = await supabase
        .from("user_cooking_times")
        .update({ section_name: sectionName })
        .eq("user_id", user.id)
        .in("id", selectedItemIds);

      if (error) {
        throw new Error(`Failed to create section: ${error.message}`);
      }
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to create section: ${error.message}`);
  }
};

// Remove section (move items back to ungrouped)
export const removeSection = async (sectionName) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  try {
    const { error } = await supabase
      .from("user_cooking_times")
      .update({ section_name: null })
      .eq("user_id", user.id)
      .eq("section_name", sectionName);

    if (error) {
      throw new Error(`Failed to remove section: ${error.message}`);
    }

    return true;
  } catch (error) {
    throw new Error(`Failed to remove section: ${error.message}`);
  }
};
