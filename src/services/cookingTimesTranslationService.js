import supabase from "../lib/supabase";
import {
  translateText,
  isTranslatable,
  capitalizeForLanguage,
  mergeTranslatedField,
} from "./translationCore";
import { fetchUserCookingTimes } from "./cookingTimesService";

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
    // Translate all fields in parallel, with cooking/food context to avoid
    // mistranslations (e.g., "linsen" -> "lentils" not "lenses")
    const [
      rawIngredientName,
      rawSectionName,
      notes,
      cooking_time,
      soaking_time,
    ] = await Promise.all([
      translateText(
        cookingTime.ingredient_name,
        targetLanguage,
        "Cooking ingredient"
      ),
      cookingTime.section_name
        ? translateText(
            cookingTime.section_name,
            targetLanguage,
            "Food category"
          )
        : null,
      cookingTime.notes
        ? translateText(cookingTime.notes, targetLanguage)
        : null,
      cookingTime.cooking_time && isTranslatable(cookingTime.cooking_time)
        ? translateText(cookingTime.cooking_time, targetLanguage)
        : cookingTime.cooking_time,
      cookingTime.soaking_time && isTranslatable(cookingTime.soaking_time)
        ? translateText(cookingTime.soaking_time, targetLanguage)
        : cookingTime.soaking_time,
    ]);

    const translatedData = {
      ingredient_name: capitalizeForLanguage(rawIngredientName, targetLanguage),
      notes,
      section_name: rawSectionName
        ? capitalizeForLanguage(rawSectionName, targetLanguage)
        : null,
      cooking_time,
      soaking_time,
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
const saveCookingTimeTranslation = (cookingTimeId, language, translatedData) =>
  mergeTranslatedField(
    "user_cooking_times",
    cookingTimeId,
    "translated_cooking_time",
    language,
    () => translatedData
  );

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
    const originalLanguage = currentCookingTime.original_language || "en";

    // Determine which languages to translate to
    // If no translations exist yet, create one for the opposite language
    const languagesToTranslate =
      Object.keys(existingTranslations).length > 0
        ? Object.keys(existingTranslations)
        : [originalLanguage === "en" ? "de" : "en"];

    // Translate for every language in parallel, and within each language
    // translate every changed field in parallel too.
    const perLanguageUpdates = await Promise.all(
      languagesToTranslate.map(async (language) => {
        const translation = existingTranslations[language] || {};

        const [
          ingredientNameChanged,
          sectionNameChanged,
          cookingTimeChanged,
          soakingTimeChanged,
        ] = [
          translation.ingredient_name === undefined ||
            oldData.ingredient_name !== newData.ingredient_name,
          translation.section_name === undefined ||
            oldData.section_name !== newData.section_name,
          translation.cooking_time === undefined ||
            oldData.cooking_time !== newData.cooking_time,
          translation.soaking_time === undefined ||
            oldData.soaking_time !== newData.soaking_time,
        ];
        const notesChanged =
          translation.notes === undefined || oldData.notes !== newData.notes;

        const [
          rawIngredientName,
          notes,
          rawSectionName,
          cooking_time,
          soaking_time,
        ] = await Promise.all([
          ingredientNameChanged
            ? translateText(
                newData.ingredient_name,
                language,
                "Cooking ingredient"
              )
            : translation.ingredient_name,
          notesChanged
            ? newData.notes
              ? translateText(newData.notes, language)
              : null
            : translation.notes,
          sectionNameChanged
            ? newData.section_name
              ? translateText(newData.section_name, language, "Food category")
              : null
            : translation.section_name,
          cookingTimeChanged
            ? newData.cooking_time && isTranslatable(newData.cooking_time)
              ? translateText(newData.cooking_time, language)
              : newData.cooking_time
            : translation.cooking_time,
          soakingTimeChanged
            ? newData.soaking_time && isTranslatable(newData.soaking_time)
              ? translateText(newData.soaking_time, language)
              : newData.soaking_time
            : translation.soaking_time,
        ]);

        return [
          language,
          {
            ingredient_name: ingredientNameChanged
              ? capitalizeForLanguage(rawIngredientName, language)
              : rawIngredientName,
            notes,
            section_name:
              sectionNameChanged && rawSectionName
                ? capitalizeForLanguage(rawSectionName, language)
                : rawSectionName,
            cooking_time,
            soaking_time,
          },
        ];
      })
    );

    const updatedTranslations = {
      ...existingTranslations,
      ...Object.fromEntries(perLanguageUpdates),
    };

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
