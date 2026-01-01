import supabase from "../lib/supabase";

// DeepL translation function using Supabase Edge Function
const translateText = async (text, targetLanguage) => {
  if (!text || text.trim() === "") return text;

  try {
    const { data, error } = await supabase.functions.invoke("translate", {
      body: {
        text: text,
        target_lang: targetLanguage,
        source_lang: "auto",
      },
    });

    if (error) {
      throw new Error(`Translation error: ${error.message}`);
    }

    let result = data.translatedText || text;

    // Post-process translated text: replace hyphens with spaces for better readability
    result = result.replace(/-/g, " ");

    return result;
  } catch (error) {
    console.error("Translation failed:", error);
    return text; // Return original text if translation fails
  }
};

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

// Get translated cooking time
export const getTranslatedCookingTime = async (
  cookingTime,
  targetLanguage,
  originalLanguage = "en"
) => {
  // If target language is the same as original, return as-is
  if (originalLanguage === targetLanguage) {
    return cookingTime;
  }

  // Check if translation exists in storage
  const cachedTranslation =
    cookingTime.translated_cooking_time?.[targetLanguage];
  if (cachedTranslation) {
    return {
      ...cookingTime,
      ingredient_name: cachedTranslation.ingredient_name,
      notes: cachedTranslation.notes,
      section_name: cachedTranslation.section_name,
      isTranslated: true,
      translatedFrom: originalLanguage,
    };
  }

  // Translation not cached, translate now
  try {
    const translatedData = {
      ingredient_name: await translateText(
        cookingTime.ingredient_name,
        targetLanguage
      ),
      notes: cookingTime.notes
        ? await translateText(cookingTime.notes, targetLanguage)
        : null,
      section_name: cookingTime.section_name
        ? await translateText(cookingTime.section_name, targetLanguage)
        : null,
    };

    // Save translation to database
    await saveCookingTimeTranslation(
      cookingTime.id,
      targetLanguage,
      translatedData
    );

    return {
      ...cookingTime,
      ingredient_name: translatedData.ingredient_name,
      notes: translatedData.notes,
      section_name: translatedData.section_name,
      isTranslated: true,
      translatedFrom: originalLanguage,
    };
  } catch (error) {
    console.error("Cooking time translation failed:", error);
    return cookingTime; // Return original if translation fails
  }
};

// Get all translated cooking times for the current user
export const getTranslatedCookingTimes = async (
  targetLanguage,
  originalLanguage = "en"
) => {
  const cookingTimes = await fetchUserCookingTimes();

  if (originalLanguage === targetLanguage) {
    return cookingTimes;
  }

  // Translate all cooking times
  const translatedCookingTimes = await Promise.all(
    cookingTimes.map((item) =>
      getTranslatedCookingTime(item, targetLanguage, originalLanguage)
    )
  );

  return translatedCookingTimes;
};

// Save cooking time translation to database
const saveCookingTimeTranslation = async (
  cookingTimeId,
  language,
  translatedData
) => {
  try {
    // Get current translated_cooking_time data
    const { data: currentCookingTime, error: fetchError } = await supabase
      .from("user_cooking_times")
      .select("translated_cooking_time")
      .eq("id", cookingTimeId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Merge new translation with existing translations
    const existingTranslations =
      currentCookingTime.translated_cooking_time || {};
    const updatedTranslations = {
      ...existingTranslations,
      [language]: translatedData,
    };

    // Update the database
    const { error: updateError } = await supabase
      .from("user_cooking_times")
      .update({ translated_cooking_time: updatedTranslations })
      .eq("id", cookingTimeId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error("Failed to store cooking time translation:", error);
    // Don't throw error - translation worked, just storage failed
  }
};

// Update translations when cooking time is edited
export const updateCookingTimeTranslations = async (
  cookingTimeId,
  oldData,
  newData
) => {
  try {
    // Get current translations
    const { data: currentCookingTime, error: fetchError } = await supabase
      .from("user_cooking_times")
      .select("translated_cooking_time")
      .eq("id", cookingTimeId)
      .single();

    if (fetchError || !currentCookingTime.translated_cooking_time) {
      return; // No existing translations to update
    }

    const existingTranslations = currentCookingTime.translated_cooking_time;
    const updatedTranslations = { ...existingTranslations };

    // Check each language and update only changed fields
    for (const [language, translation] of Object.entries(
      existingTranslations
    )) {
      const fieldsToUpdate = {};
      let needsUpdate = false;

      // Check ingredient_name for changes
      if (oldData.ingredient_name !== newData.ingredient_name) {
        fieldsToUpdate.ingredient_name = await translateText(
          newData.ingredient_name,
          language
        );
        needsUpdate = true;
      } else {
        fieldsToUpdate.ingredient_name = translation.ingredient_name;
      }

      // Check notes for changes
      if (oldData.notes !== newData.notes) {
        fieldsToUpdate.notes = newData.notes
          ? await translateText(newData.notes, language)
          : null;
        needsUpdate = true;
      } else {
        fieldsToUpdate.notes = translation.notes;
      }

      // Check section_name for changes
      if (oldData.section_name !== newData.section_name) {
        fieldsToUpdate.section_name = newData.section_name
          ? await translateText(newData.section_name, language)
          : null;
        needsUpdate = true;
      } else {
        fieldsToUpdate.section_name = translation.section_name;
      }

      // Update translation if any field changed
      if (needsUpdate) {
        updatedTranslations[language] = fieldsToUpdate;
      }
    }

    // Save updated translations
    const { error: updateError } = await supabase
      .from("user_cooking_times")
      .update({ translated_cooking_time: updatedTranslations })
      .eq("id", cookingTimeId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error("Failed to update cooking time translations:", error);
    // Don't throw error - update should still succeed
  }
};
