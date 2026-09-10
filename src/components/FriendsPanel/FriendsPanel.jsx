import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserPlus, Check, X, UserMinus, Search } from "lucide-react";
import { searchUsers, sendFriendRequest } from "../../services/friendsService";
import { useFriendsData } from "../../hooks/data/useFriendsData";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/components/ui/toast";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FriendsPanel = ({ onNavigate, renderTrigger, tooltipLabel } = {}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const {
    friends,
    pendingRequests,
    sentRequests,
    isLoadingData,
    refetch,
    acceptFriendRequest,
    removeFriendship,
  } = useFriendsData();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);

  const searchTimeoutRef = useRef(null);

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
      toast.add({ title: t("friends_request_sent"), type: "success" });
    } catch (err) {
      console.error("Error sending friend request:", err);
      toast.add({ title: t("friends_request_sent_failed"), type: "error" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAccept = async (requesterId) => {
    setLoadingAction(requesterId);
    try {
      await acceptFriendRequest(requesterId);
      toast.add({ title: t("friends_request_accepted"), type: "success" });
    } catch (err) {
      console.error("Error accepting friend request:", err);
      toast.add({ title: t("friends_request_accept_failed"), type: "error" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancelRequest = async (userId) => {
    setLoadingAction(userId);
    try {
      await removeFriendship(userId);
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, friendshipStatus: "none" } : u
        )
      );
      toast.add({ title: t("friends_request_cancelled"), type: "success" });
    } catch (err) {
      console.error("Error cancelling friend request:", err);
      toast.add({ title: t("friends_request_cancel_failed"), type: "error" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDecline = async (userId) => {
    setLoadingAction(userId);
    try {
      await removeFriendship(userId);
      toast.add({ title: t("friends_request_declined"), type: "success" });
    } catch (err) {
      console.error("Error declining friend request:", err);
      toast.add({ title: t("friends_request_decline_failed"), type: "error" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    setLoadingAction(friendId);
    try {
      await removeFriendship(friendId);
      toast.add({ title: t("friends_removed"), type: "success" });
    } catch (err) {
      console.error("Error removing friend:", err);
      toast.add({ title: t("friends_remove_failed"), type: "error" });
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
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleSendRequest(user.id)}
                    disabled={loadingAction === user.id}
                    aria-label={t("friends_add")}
                  >
                    <UserPlus className="size-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("friends_add")}</TooltipContent>
            </Tooltip>
          )}
          {user.friendshipStatus === "pending_sent" && (
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {t("friends_pending")}
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost-destructive"
                      size="icon-sm"
                      onClick={() => handleCancelRequest(user.id)}
                      disabled={loadingAction === user.id}
                      aria-label={t("friends_cancel")}
                    >
                      <X className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>{t("friends_cancel")}</TooltipContent>
              </Tooltip>
            </div>
          )}
          {user.friendshipStatus === "pending_received" && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-success hover:text-success"
                    onClick={() => handleAccept(user.id)}
                    disabled={loadingAction === user.id}
                    aria-label={t("friends_accept")}
                  >
                    <Check className="size-4" />
                  </Button>
                }
              />
              <TooltipContent>{t("friends_accept")}</TooltipContent>
            </Tooltip>
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
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="min-w-0 truncate text-sm">
                          {friend.first_name}{" "}
                          <span className="text-muted-foreground">
                            @{friend.username}
                          </span>
                        </span>
                      }
                    />
                    <TooltipContent>
                      {t("view_friend_recipes", { name: friend.first_name })}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="w-px p-1 text-right">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost-destructive"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFriend(friend.id);
                          }}
                          disabled={loadingAction === friend.id}
                          aria-label={t("friends_remove")}
                        >
                          <UserMinus className="size-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>{t("friends_remove")}</TooltipContent>
                  </Tooltip>
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
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-success hover:text-success"
                            onClick={() => handleAccept(req.id)}
                            disabled={loadingAction === req.id}
                            aria-label={t("friends_accept")}
                          >
                            <Check className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent>{t("friends_accept")}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost-destructive"
                            size="icon-sm"
                            onClick={() => handleDecline(req.id)}
                            disabled={loadingAction === req.id}
                            aria-label={t("friends_decline")}
                          >
                            <X className="size-4" />
                          </Button>
                        }
                      />
                      <TooltipContent>{t("friends_decline")}</TooltipContent>
                    </Tooltip>
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
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost-destructive"
                          size="icon-sm"
                          onClick={() => handleCancelRequest(req.id)}
                          disabled={loadingAction === req.id}
                          aria-label={t("friends_cancel")}
                        >
                          <X className="size-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>{t("friends_cancel")}</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );

  const triggerButton = renderTrigger(pendingRequests.length);
  const effectiveTrigger = tooltipLabel ? (
    <TooltipTrigger render={triggerButton} />
  ) : (
    triggerButton
  );

  const onOpenChange = (open) => {
    if (open) refetch();
    setIsOpen(open);
  };

  if (isMobile) {
    const dialog = (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTrigger render={effectiveTrigger} />
        <DialogContent className="flex max-h-[80vh] flex-col gap-2.5 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("friends")}</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );

    return tooltipLabel ? (
      <Tooltip>
        {dialog}
        <TooltipContent>{tooltipLabel}</TooltipContent>
      </Tooltip>
    ) : (
      dialog
    );
  }

  const popover = (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger render={effectiveTrigger} />
      <PopoverContent align="end" className="max-h-105 w-72 overflow-y-auto">
        {content}
      </PopoverContent>
    </Popover>
  );

  return tooltipLabel ? (
    <Tooltip>
      {popover}
      <TooltipContent>{tooltipLabel}</TooltipContent>
    </Tooltip>
  ) : (
    popover
  );
};

export default FriendsPanel;
