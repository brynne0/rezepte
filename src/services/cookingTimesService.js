import supabase from "../lib/supabase";
import { toTitleCase } from "../utils/stringUtils";

// DeepL translation function using Supabase Edge Function
const translateText = async (text, targetLanguage, context = null) => {
  if (!text || text.trim() === "") return text;

  try {
    const requestBody = {
      text: text,
      target_lang: targetLanguage,
      source_lang: "auto",
    };

    // Add context if provided to help with disambiguation (e.g., food vs. other meanings)
    if (context) {
      requestBody.context = context;
    }

    const { data, error } = await supabase.functions.invoke("translate", {
      body: requestBody,
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
  orderIndex = 0,
  originalLanguage = "en"
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
    original_language: originalLanguage,
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
  fallbackOriginalLanguage = "en"
) => {
  // Use the stored original_language if available, otherwise use fallback
  const originalLanguage =
    cookingTime.original_language || fallbackOriginalLanguage;

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
      cooking_time: cachedTranslation.cooking_time ?? cookingTime.cooking_time,
      soaking_time: cachedTranslation.soaking_time ?? cookingTime.soaking_time,
      isTranslated: true,
      translatedFrom: originalLanguage,
    };
  }

  // Translation not cached, translate now
  try {
    // Helper function to check if a time value is text (needs translation) vs numeric (no translation)
    const isTextTime = (value) => {
      if (!value) return false;
      const timeStr = String(value).trim();
      const numericValue = Number(timeStr);
      // If it's a pure number or range like "40-50", don't translate
      return isNaN(numericValue) && !/^\d+\s*-\s*\d+$/.test(timeStr);
    };

    // Translate all fields with cooking/food context to avoid mistranslations (e.g., "linsen" -> "lentils" not "lenses")
    const rawIngredientName = await translateText(
      cookingTime.ingredient_name,
      targetLanguage,
      "Cooking ingredient"
    );
    const rawSectionName = cookingTime.section_name
      ? await translateText(
          cookingTime.section_name,
          targetLanguage,
          "Food category"
        )
      : null;

    const translatedData = {
      ingredient_name: toTitleCase(rawIngredientName),
      notes: cookingTime.notes
        ? await translateText(cookingTime.notes, targetLanguage)
        : null,
      section_name: rawSectionName ? toTitleCase(rawSectionName) : null,
      cooking_time:
        cookingTime.cooking_time && isTextTime(cookingTime.cooking_time)
          ? await translateText(cookingTime.cooking_time, targetLanguage)
          : cookingTime.cooking_time,
      soaking_time:
        cookingTime.soaking_time && isTextTime(cookingTime.soaking_time)
          ? await translateText(cookingTime.soaking_time, targetLanguage)
          : cookingTime.soaking_time,
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
      cooking_time: translatedData.cooking_time,
      soaking_time: translatedData.soaking_time,
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
  fallbackOriginalLanguage = "en"
) => {
  const cookingTimes = await fetchUserCookingTimes();

  // Translate all cooking times (each item uses its own original_language)
  const translatedCookingTimes = await Promise.all(
    cookingTimes.map((item) =>
      getTranslatedCookingTime(item, targetLanguage, fallbackOriginalLanguage)
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
    // Get current translations and original language
    const { data: currentCookingTime, error: fetchError } = await supabase
      .from("user_cooking_times")
      .select("translated_cooking_time, original_language")
      .eq("id", cookingTimeId)
      .single();

    if (fetchError) {
      console.error(
        "Failed to fetch cooking time for translation update:",
        fetchError
      );
      return;
    }

    const existingTranslations =
      currentCookingTime.translated_cooking_time || {};
    const updatedTranslations = { ...existingTranslations };
    const originalLanguage = currentCookingTime.original_language || "en";

    // Determine which languages to translate to
    // If no translations exist yet, create one for the opposite language
    const languagesToTranslate =
      Object.keys(existingTranslations).length > 0
        ? Object.keys(existingTranslations)
        : [originalLanguage === "en" ? "de" : "en"];

    // Helper function to check if a time value is text (needs translation) vs numeric (no translation)
    const isTextTime = (value) => {
      if (!value) return false;
      const timeStr = String(value).trim();
      const numericValue = Number(timeStr);
      // If it's a pure number or range like "40-50", don't translate
      return isNaN(numericValue) && !/^\d+\s*-\s*\d+$/.test(timeStr);
    };

    // Check each language and update only changed fields
    for (const language of languagesToTranslate) {
      const translation = existingTranslations[language] || {};
      const fieldsToUpdate = {};
      let needsUpdate = false;

      // Check ingredient_name for changes (or if translation doesn't exist yet)
      if (
        translation.ingredient_name === undefined ||
        oldData.ingredient_name !== newData.ingredient_name
      ) {
        const rawIngredientName = await translateText(
          newData.ingredient_name,
          language,
          "Cooking ingredient"
        );
        fieldsToUpdate.ingredient_name = toTitleCase(rawIngredientName);
        needsUpdate = true;
      } else {
        fieldsToUpdate.ingredient_name = translation.ingredient_name;
      }

      // Check notes for changes (or if translation doesn't exist yet)
      if (translation.notes === undefined || oldData.notes !== newData.notes) {
        fieldsToUpdate.notes = newData.notes
          ? await translateText(newData.notes, language)
          : null;
        needsUpdate = true;
      } else {
        fieldsToUpdate.notes = translation.notes;
      }

      // Check section_name for changes (or if translation doesn't exist yet)
      if (
        translation.section_name === undefined ||
        oldData.section_name !== newData.section_name
      ) {
        if (newData.section_name) {
          const rawSectionName = await translateText(
            newData.section_name,
            language,
            "Food category"
          );
          fieldsToUpdate.section_name = toTitleCase(rawSectionName);
        } else {
          fieldsToUpdate.section_name = null;
        }
        needsUpdate = true;
      } else {
        fieldsToUpdate.section_name = translation.section_name;
      }

      // Check cooking_time for changes (or if translation doesn't exist yet)
      if (
        translation.cooking_time === undefined ||
        oldData.cooking_time !== newData.cooking_time
      ) {
        fieldsToUpdate.cooking_time =
          newData.cooking_time && isTextTime(newData.cooking_time)
            ? await translateText(newData.cooking_time, language)
            : newData.cooking_time;
        needsUpdate = true;
      } else {
        fieldsToUpdate.cooking_time = translation.cooking_time;
      }

      // Check soaking_time for changes (or if translation doesn't exist yet)
      if (
        translation.soaking_time === undefined ||
        oldData.soaking_time !== newData.soaking_time
      ) {
        fieldsToUpdate.soaking_time =
          newData.soaking_time && isTextTime(newData.soaking_time)
            ? await translateText(newData.soaking_time, language)
            : newData.soaking_time;
        needsUpdate = true;
      } else {
        fieldsToUpdate.soaking_time = translation.soaking_time;
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
