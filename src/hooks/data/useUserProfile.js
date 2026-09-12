import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUserProfile } from "../../services/userService";
import {
  readCachedValue,
  writeCachedValue,
} from "../../utils/localStorageCache";
import { userProfileCacheKey } from "../../utils/offlineCacheKeys";
import { useAuth } from "./useAuth";

const readCachedProfile = (userId) =>
  readCachedValue(userProfileCacheKey(userId));

const writeCachedProfile = (userId, profile) =>
  writeCachedValue(userProfileCacheKey(userId), profile);

export const useUserProfile = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["userProfile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const profileData = await getUserProfile();
      writeCachedProfile(userId, profileData);
      return profileData;
    },
    // Same pattern as useCategories: seed with last session's cache so a
    // fresh mount shows it instantly, but still refetch in the background.
    initialData: () => readCachedProfile(userId),
    initialDataUpdatedAt: 0,
    staleTime: 0,
    refetchOnMount: true,
  });

  const setProfile = (updater) =>
    queryClient.setQueryData(["userProfile", userId], (prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      writeCachedProfile(userId, next);
      return next;
    });

  const refreshProfile = () =>
    queryClient.invalidateQueries({ queryKey: ["userProfile"] });

  return {
    profile: profile ?? null,
    loading,
    error: error?.message ?? null,
    setProfile,
    refreshProfile,
  };
};
