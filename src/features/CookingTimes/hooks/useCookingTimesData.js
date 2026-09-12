import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getTranslatedCookingTimes } from "../../../services/cookingTimesTranslationService";
import { getUserPreferredLanguage } from "../../../services/userService";
import {
  readCachedValue,
  writeCachedValue,
} from "../../../utils/localStorageCache";
import { cookingTimesCacheKey } from "../../../utils/offlineCacheKeys";
import { useAuth } from "@/hooks/data/useAuth";

export const useCookingTimesData = ({ isEditMode, i18n }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState("all");
  const originalUserLanguage = useRef(null);
  const HAS_LOADED_ONCE = useRef(false);

  const [formData, setFormData] = useState({
    ungroupedCookingTimes: [],
    cookingTimeSections: [],
  });

  const [originalData, setOriginalData] = useState({
    ungroupedCookingTimes: [],
    cookingTimeSections: [],
  });

  const [filteredData, setFilteredData] = useState({
    ungroupedCookingTimes: [],
    cookingTimeSections: [],
  });

  const generateTempId = useCallback(() => {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }, []);

  const organizeCookingTimesIntoSections = useCallback(
    (data) => {
      const ungrouped = [];
      const sections = new Map();

      data.forEach((item) => {
        const itemWithTempId = {
          ...item,
          tempId: generateTempId(),
        };

        if (!item.section_name) {
          ungrouped.push(itemWithTempId);
        } else {
          if (!sections.has(item.section_name)) {
            sections.set(item.section_name, {
              id: `section-${item.section_name}`,
              subheading: item.section_name,
              cookingTimes: [],
            });
          }
          sections.get(item.section_name).cookingTimes.push(itemWithTempId);
        }
      });

      const newFormData = {
        ungroupedCookingTimes: ungrouped,
        cookingTimeSections: Array.from(sections.values()),
      };

      setFormData(newFormData);
      setOriginalData(newFormData);
      setFilteredData(newFormData);
    },
    [generateTempId]
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentLanguage = i18n.language.split("-")[0]; // Normalize region codes
      const preferredLanguage = await getUserPreferredLanguage();
      const cacheKey = cookingTimesCacheKey(userId, currentLanguage);

      // Fetch cooking times with translations - write to localStorage
      // on success, fall back to the last cached value if the fetch fails
      // (e.g. offline), since TanStack Query's own cache doesn't survive
      // a reload.
      let cookingTimesData;
      try {
        cookingTimesData = await queryClient.query({
          queryKey: ["cookingTimes", userId, currentLanguage],
          queryFn: () =>
            getTranslatedCookingTimes(currentLanguage, preferredLanguage),
        });
        writeCachedValue(cacheKey, cookingTimesData);
      } catch (error) {
        console.error("Error fetching cooking times:", error);
        cookingTimesData = readCachedValue(cacheKey) ?? [];
      }

      // Organize data into sections exactly like RecipeForm
      organizeCookingTimesIntoSections(cookingTimesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [organizeCookingTimesIntoSections, i18n.language, queryClient, userId]);

  useEffect(() => {
    // Always load data on first render, then don't reload when in edit mode to preserve user's edits
    if (!HAS_LOADED_ONCE.current || !isEditMode) {
      loadData();
      // Reset selected section when language changes to avoid mismatched section names
      if (HAS_LOADED_ONCE.current) {
        setSelectedSection("all");
      }
      HAS_LOADED_ONCE.current = true;
    }
  }, [loadData, isEditMode]); // Reload when language changes (unless in edit mode)

  // Restore original language when exiting edit mode
  useEffect(() => {
    return () => {
      // On unmount, restore original language if it was changed
      if (
        originalUserLanguage.current &&
        originalUserLanguage.current !== i18n.language
      ) {
        i18n.changeLanguage(originalUserLanguage.current);
        originalUserLanguage.current = null; // Clear the stored language
      }
    };
  }, [i18n]);

  // Filter data based on selected section
  useEffect(() => {
    if (selectedSection === "all") {
      setFilteredData(formData);
      return;
    }

    // Filter by selected section
    const selectedSectionData = formData.cookingTimeSections.find(
      (section) => section.subheading === selectedSection
    );
    setFilteredData({
      ungroupedCookingTimes: [],
      cookingTimeSections: selectedSectionData ? [selectedSectionData] : [],
    });
  }, [selectedSection, formData]);

  const hasAnyItems =
    formData.ungroupedCookingTimes.length > 0 ||
    formData.cookingTimeSections.length > 0;

  return {
    loading,
    selectedSection,
    setSelectedSection,
    formData,
    setFormData,
    originalData,
    setOriginalData,
    filteredData,
    hasAnyItems,
    generateTempId,
    loadData,
    originalUserLanguage,
  };
};
