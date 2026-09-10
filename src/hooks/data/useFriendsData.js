import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  acceptFriendRequest,
  removeFriendship,
} from "../../services/friendsService";

export const useFriendsData = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: isLoadingData,
    refetch,
  } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const [friends, pendingRequests, sentRequests] = await Promise.all([
        getFriends(),
        getPendingRequests(),
        getSentRequests(),
      ]);
      return { friends, pendingRequests, sentRequests };
    },
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
