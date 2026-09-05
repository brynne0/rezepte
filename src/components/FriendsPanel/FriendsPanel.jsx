import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserPlus, Check, X, UserMinus, Search } from "lucide-react";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getFriends,
  getPendingRequests,
  getSentRequests,
} from "../../services/friendsService";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const FriendsPanel = ({ onNavigate, renderTrigger } = {}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const searchTimeoutRef = useRef(null);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [friendsList, requests, sent] = await Promise.all([
        getFriends(),
        getPendingRequests(),
        getSentRequests(),
      ]);
      setFriends(friendsList);
      setPendingRequests(requests);
      setSentRequests(sent);
    } catch (err) {
      console.error("Error loading friends data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery]);

  const handleSendRequest = async (userId) => {
    setLoadingAction(userId);
    try {
      await sendFriendRequest(userId);
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, friendshipStatus: "pending_sent" } : u
        )
      );
    } catch (err) {
      console.error("Error sending friend request:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAccept = async (requesterId) => {
    setLoadingAction(requesterId);
    try {
      await acceptFriendRequest(requesterId);
      await loadData();
    } catch (err) {
      console.error("Error accepting friend request:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDecline = async (userId) => {
    setLoadingAction(userId);
    try {
      await removeFriendship(userId);
      await loadData();
    } catch (err) {
      console.error("Error declining friend request:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    setLoadingAction(friendId);
    try {
      await removeFriendship(friendId);
      await loadData();
    } catch (err) {
      console.error("Error removing friend:", err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleFriendClick = (username) => {
    setIsOpen(false);
    onNavigate?.();
    navigate(`/friends/${username}`);
  };

  const content = (
    <>
      {/* Search section */}
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder={t("friends_search_placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus={!isMobile}
        />
      </InputGroup>
      {isSearching && (
        <div className="px-1 text-xs text-muted-foreground">
          {t("friends_searching")}
        </div>
      )}
      {!isSearching &&
        searchQuery.trim().length >= 3 &&
        searchResults.length === 0 && (
          <div className="px-1 text-xs text-muted-foreground">
            {t("friends_no_users_found")}
          </div>
        )}
      {searchResults.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between gap-2 rounded-md px-1 py-1.5"
        >
          <span className="truncate text-sm">@{user.username}</span>
          {user.friendshipStatus === "none" && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleSendRequest(user.id)}
              disabled={loadingAction === user.id}
              aria-label={t("friends_add")}
            >
              <UserPlus className="size-3.5" />
            </Button>
          )}
          {user.friendshipStatus === "pending_sent" && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {t("friends_pending")}
            </span>
          )}
          {user.friendshipStatus === "pending_received" && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-success hover:text-success"
              onClick={() => handleAccept(user.id)}
              disabled={loadingAction === user.id}
              aria-label={t("friends_accept")}
            >
              <Check className="size-3.5" />
            </Button>
          )}
          {user.friendshipStatus === "accepted" && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3" /> {t("friends_accepted")}
            </span>
          )}
        </div>
      ))}

      <Separator />

      {/* Unified friends + requests list */}
      {isLoadingData ? (
        <div className="flex items-center justify-center gap-2 px-1 py-4 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          {t("friends_loading", "Loading...")}
        </div>
      ) : friends.length === 0 &&
        pendingRequests.length === 0 &&
        sentRequests.length === 0 &&
        searchResults.length === 0 ? (
        <div className="px-1 py-2 text-center text-sm text-muted-foreground">
          {t("friends_search_above")}
        </div>
      ) : (
        <Table>
          <TableBody>
            {friends.map((friend) => (
              <TableRow
                key={friend.id}
                className="cursor-pointer border-none"
                onClick={() => handleFriendClick(friend.username)}
              >
                <TableCell className="p-1">
                  <span className="min-w-0 truncate text-sm">
                    {friend.first_name}{" "}
                    <span className="text-muted-foreground">
                      @{friend.username}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="w-px p-1 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFriend(friend.id);
                    }}
                    disabled={loadingAction === friend.id}
                    aria-label={t("friends_remove")}
                  >
                    <UserMinus className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {friends.length > 0 &&
              (pendingRequests.length > 0 || sentRequests.length > 0) && (
                <TableRow className="border-none hover:bg-transparent">
                  <TableCell colSpan={2} className="p-0">
                    <Separator className="my-1" />
                  </TableCell>
                </TableRow>
              )}

            {pendingRequests.map((req) => (
              <TableRow key={req.id} className="border-none">
                <TableCell className="p-1">
                  <div className="flex flex-col items-start">
                    <span className="truncate text-sm">@{req.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("friends_pending")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="w-px p-1 text-right">
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-success hover:text-success"
                      onClick={() => handleAccept(req.id)}
                      disabled={loadingAction === req.id}
                      aria-label={t("friends_accept")}
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDecline(req.id)}
                      disabled={loadingAction === req.id}
                      aria-label={t("friends_decline")}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {sentRequests.map((req) => (
              <TableRow key={req.id} className="border-none">
                <TableCell className="p-1">
                  <div className="flex flex-col items-start">
                    <span className="truncate text-sm">@{req.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("friends_pending")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="w-px p-1 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDecline(req.id)}
                    disabled={loadingAction === req.id}
                    aria-label={t("friends_decline")}
                  >
                    <X className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );

  const triggerButton = renderTrigger(pendingRequests.length);

  const onOpenChange = (open) => {
    if (open) loadData();
    setIsOpen(open);
  };

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger render={triggerButton} />
        <DialogContent className="flex max-h-[80vh] flex-col gap-2.5 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("friends")}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger render={triggerButton} />
      <PopoverContent align="end" className="max-h-105 w-72 overflow-y-auto">
        {content}
      </PopoverContent>
    </Popover>
  );
};

export default FriendsPanel;
