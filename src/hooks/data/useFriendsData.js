import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  acceptFriendRequest,
  removeFriendship,
} from "../../services/friendsService";
import { useAuth } from "./useAuth";

export const useFriendsData = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data,
    isLoading: isLoadingData,
    refetch,
  } = useQuery({
    queryKey: ["friends", userId],
    queryFn: async () => {
      const [friends, pendingRequests, sentRequests] = await Promise.all([
        getFriends(userId),
        getPendingRequests(userId),
        getSentRequests(userId),
      ]);
      return { friends, pendingRequests, sentRequests };
    },
    enabled: !!userId,
  });

  const invalidateFriends = () =>
    queryClient.invalidateQueries({ queryKey: ["friends"] });

  const acceptMutation = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: invalidateFriends,
  });

  const removeMutation = useMutation({
    mutationFn: removeFriendship,
    onSuccess: invalidateFriends,
  });

  return {
    friends: data?.friends ?? [],
    pendingRequests: data?.pendingRequests ?? [],
    sentRequests: data?.sentRequests ?? [],
    isLoadingData,
    refetch,
    acceptFriendRequest: acceptMutation.mutateAsync,
    removeFriendship: removeMutation.mutateAsync,
  };
};
