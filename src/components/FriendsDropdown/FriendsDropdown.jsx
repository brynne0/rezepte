import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, Check, X, UserMinus, Search } from "lucide-react";
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getFriends,
  getPendingRequests,
} from "../../services/friendsService";
import useClickOutside from "../../hooks/ui/useClickOutside";
import "./FriendsDropdown.css";

const FriendsDropdown = ({ onNavigate } = {}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);

  const dropdownRef = useClickOutside(() => setIsOpen(false));
  const searchTimeoutRef = useRef(null);

  const loadData = async () => {
    try {
      const [friendsList, requests] = await Promise.all([
        getFriends(),
        getPendingRequests(),
      ]);
      setFriends(friendsList);
      setPendingRequests(requests);
    } catch (err) {
      console.error("Error loading friends data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
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

  const handleToggle = () => {
    if (!isOpen) loadData();
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="flex-row relative" ref={dropdownRef}>
      <button
        className={`btn btn-icon btn-icon-neutral friends-icon-btn relative ${isOpen ? "selected" : ""}`}
        onClick={handleToggle}
        aria-label={t("friends")}
      >
        <Users size={28} />
        {pendingRequests.length > 0 && (
          <span className="friends-badge">{pendingRequests.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="friends-dropdown">
          <div className="friends-dropdown-content">
            {/* Search section */}
            <div className="friends-search-wrapper flex-column">
              <div className="friends-search-input-wrapper relative-center">
                <Search size={14} className="friends-search-icon" />
                <input
                  type="text"
                  className="friends-search-input"
                  placeholder={t("friends_search_placeholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              {isSearching && (
                <div className="friends-search-status">
                  {t("friends_searching")}
                </div>
              )}
              {!isSearching &&
                searchQuery.trim().length >= 2 &&
                searchResults.length === 0 && (
                  <div className="friends-search-status">
                    {t("friends_no_users_found")}
                  </div>
                )}
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="friends-search-result flex-between gap-xs"
                >
                  <span className="friends-result-name">@{user.username}</span>
                  {user.friendshipStatus === "none" && (
                    <button
                      className="btn btn-icon btn-icon-red"
                      onClick={() => handleSendRequest(user.id)}
                      disabled={loadingAction === user.id}
                      aria-label={t("friends_add")}
                    >
                      <UserPlus size={14} />
                    </button>
                  )}
                  {user.friendshipStatus === "pending_sent" && (
                    <span className="friends-status-label">
                      {t("friends_pending")}
                    </span>
                  )}
                  {user.friendshipStatus === "pending_received" && (
                    <button
                      className="btn btn-icon btn-icon-red"
                      onClick={() => handleAccept(user.id)}
                      disabled={loadingAction === user.id}
                      aria-label={t("friends_accept")}
                    >
                      <Check size={14} />
                    </button>
                  )}
                  {user.friendshipStatus === "accepted" && (
                    <span className="friends-status-label friends-status-label--accepted flex-row">
                      <Check size={12} /> {t("friends_accepted")}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Pending requests */}
            {pendingRequests.length > 0 && (
              <div className="friends-section flex-column">
                <div className="friends-section-header">
                  {t("friends_requests", { count: pendingRequests.length })}
                </div>
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="friends-list-item flex-between gap-xs"
                  >
                    <span className="friends-item-name">@{req.username}</span>
                    <div className="friends-item-actions flex-row gap-xs">
                      <button
                        className="btn btn-icon btn-icon-red"
                        onClick={() => handleAccept(req.id)}
                        disabled={loadingAction === req.id}
                        aria-label={t("friends_accept")}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        className="btn btn-icon btn-icon-neutral"
                        onClick={() => handleDecline(req.id)}
                        disabled={loadingAction === req.id}
                        aria-label={t("friends_decline")}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Friends list */}
            <div className="friends-section flex-column">
              {friends.length > 0 ? (
                <>
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="friends-list-item flex-between gap-xs"
                    >
                      <button
                        className="friends-item-link"
                        onClick={() => handleFriendClick(friend.username)}
                      >
                        {friend.first_name}{" "}
                        <span className="friends-result-username">
                          @{friend.username}
                        </span>
                      </button>
                      <button
                        className="btn btn-icon btn-icon-neutral"
                        onClick={() => handleRemoveFriend(friend.id)}
                        disabled={loadingAction === friend.id}
                        aria-label={t("friends_remove")}
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                pendingRequests.length === 0 && (
                  <div className="friends-empty">
                    {t("friends_search_above")}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsDropdown;
