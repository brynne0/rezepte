import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mobile = vi.hoisted(() => ({ value: false }));
const data = vi.hoisted(() => ({ current: null }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/ui/useMobile", () => ({ useMobile: () => mobile.value }));
vi.mock("../../hooks/data/useFriendsData", () => ({
  useFriendsData: () => data.current,
}));
vi.mock("../../services/friendsService", () => ({
  searchUsers: vi.fn(),
  sendFriendRequest: vi.fn(),
}));
vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

import { searchUsers, sendFriendRequest } from "../../services/friendsService";
import { toast } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import FriendsPanel from "./FriendsPanel";

const friend = { id: "f1", first_name: "Jane", username: "jane" };
const pending = { id: "p1", username: "pat" };
const sent = { id: "s1", username: "sam" };

const setData = (overrides = {}) => {
  data.current = {
    friends: [],
    pendingRequests: [],
    sentRequests: [],
    isLoadingData: false,
    refetch: vi.fn(),
    acceptFriendRequest: vi.fn().mockResolvedValue(),
    removeFriendship: vi.fn().mockResolvedValue(),
    ...overrides,
  };
};

const renderPanel = (props = {}) =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <FriendsPanel
          renderTrigger={(count) => <button>friends ({count})</button>}
          {...props}
        />
      </TooltipProvider>
    </MemoryRouter>
  );

// Opens the panel and returns once its search box is visible
const open = async (props) => {
  renderPanel(props);
  fireEvent.click(screen.getByText(/^friends \(/));
  return screen.findByPlaceholderText("friends_search_placeholder");
};

const search = async (input, query) => {
  vi.useFakeTimers();
  fireEvent.change(input, { target: { value: query } });
  await act(async () => {
    vi.advanceTimersByTime(400);
  });
  vi.useRealTimers();
};

describe("FriendsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mobile.value = false;
    setData();
    searchUsers.mockResolvedValue([]);
    sendFriendRequest.mockResolvedValue();
  });

  test("shows the pending count and refetches on open", async () => {
    setData({ pendingRequests: [pending] });
    await open();
    expect(screen.getByText("friends (1)")).toBeInTheDocument();
    expect(data.current.refetch).toHaveBeenCalled();
  });

  test("prompts to search when there are no friends", async () => {
    await open();
    expect(screen.getByText("friends_search_above")).toBeInTheDocument();
  });

  test("shows a loading state", async () => {
    setData({ isLoadingData: true });
    await open();
    expect(screen.getByText("friends_loading")).toBeInTheDocument();
  });

  test("opens as a dialog on mobile", async () => {
    mobile.value = true;
    await open({ tooltipLabel: "Friends" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("friends")).toBeInTheDocument();
  });

  test("works with a tooltip label on desktop", async () => {
    await open({ tooltipLabel: "Friends" });
    expect(screen.getByText("friends_search_above")).toBeInTheDocument();
  });

  describe("search", () => {
    test("doesn't search under three characters", async () => {
      const input = await open();
      await search(input, "ab");
      expect(searchUsers).not.toHaveBeenCalled();
      expect(screen.queryByText("friends_no_users_found")).toBeNull();
    });

    test("reports no matches", async () => {
      const input = await open();
      await search(input, "nobody");
      expect(searchUsers).toHaveBeenCalledWith("nobody");
      expect(
        await screen.findByText("friends_no_users_found")
      ).toBeInTheDocument();
    });

    test("logs search errors", async () => {
      searchUsers.mockRejectedValue(new Error("offline"));
      const input = await open();
      await search(input, "jane");
      await waitFor(() =>
        expect(console.error).toHaveBeenCalledWith(
          "Error searching users:",
          expect.any(Error)
        )
      );
    });

    test("shows each friendship status", async () => {
      searchUsers.mockResolvedValue([
        { id: "a", username: "accepted", friendshipStatus: "accepted" },
        { id: "b", username: "received", friendshipStatus: "pending_received" },
      ]);
      const input = await open();
      await search(input, "user");
      expect(await screen.findByText("friends_accepted")).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText("friends_accept"));
      await waitFor(() =>
        expect(data.current.acceptFriendRequest).toHaveBeenCalledWith("b")
      );
    });

    test("sends then cancels a request", async () => {
      searchUsers.mockResolvedValue([
        { id: "u2", username: "newbie", friendshipStatus: "none" },
      ]);
      const input = await open();
      await search(input, "newbie");

      fireEvent.click(await screen.findByLabelText("friends_add"));
      expect(await screen.findByText("friends_pending")).toBeInTheDocument();
      expect(sendFriendRequest).toHaveBeenCalledWith("u2");
      expect(toast.add).toHaveBeenCalledWith({
        title: "friends_request_sent",
        type: "success",
      });

      fireEvent.click(screen.getByLabelText("friends_cancel"));
      expect(await screen.findByLabelText("friends_add")).toBeInTheDocument();
      expect(data.current.removeFriendship).toHaveBeenCalledWith("u2");
    });

    test("reports a failed request", async () => {
      sendFriendRequest.mockRejectedValue(new Error("x"));
      searchUsers.mockResolvedValue([
        { id: "u2", username: "newbie", friendshipStatus: "none" },
      ]);
      const input = await open();
      await search(input, "newbie");
      fireEvent.click(await screen.findByLabelText("friends_add"));
      await waitFor(() =>
        expect(toast.add).toHaveBeenCalledWith({
          title: "friends_request_sent_failed",
          type: "error",
        })
      );
    });
  });

  describe("friends and requests", () => {
    beforeEach(() => {
      setData({
        friends: [friend],
        pendingRequests: [pending],
        sentRequests: [sent],
      });
    });

    test("opens a friend's recipes", async () => {
      const onNavigate = vi.fn();
      await open({ onNavigate });
      fireEvent.click(screen.getByText("@jane"));
      expect(onNavigate).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith("/friends/jane");
    });

    test.each([
      ["friends_remove", 0, "f1", "friends_removed"],
      ["friends_decline", 0, "p1", "friends_request_declined"],
      ["friends_cancel", 0, "s1", "friends_request_cancelled"],
    ])("%s succeeds", async (label, index, id, message) => {
      await open();
      fireEvent.click(screen.getAllByLabelText(label)[index]);
      await waitFor(() =>
        expect(toast.add).toHaveBeenCalledWith({
          title: message,
          type: "success",
        })
      );
      expect(data.current.removeFriendship).toHaveBeenCalledWith(id);
      expect(navigate).not.toHaveBeenCalled();
    });

    test.each([
      ["friends_remove", "friends_remove_failed"],
      ["friends_decline", "friends_request_decline_failed"],
      ["friends_cancel", "friends_request_cancel_failed"],
    ])("%s failure shows an error", async (label, message) => {
      data.current.removeFriendship.mockRejectedValue(new Error("x"));
      await open();
      fireEvent.click(screen.getByLabelText(label));
      await waitFor(() =>
        expect(toast.add).toHaveBeenCalledWith({
          title: message,
          type: "error",
        })
      );
    });

    test("accepts a request, reporting failures", async () => {
      await open();
      fireEvent.click(screen.getByLabelText("friends_accept"));
      await waitFor(() =>
        expect(toast.add).toHaveBeenCalledWith({
          title: "friends_request_accepted",
          type: "success",
        })
      );

      data.current.acceptFriendRequest.mockRejectedValue(new Error("x"));
      fireEvent.click(screen.getByLabelText("friends_accept"));
      await waitFor(() =>
        expect(toast.add).toHaveBeenCalledWith({
          title: "friends_request_accept_failed",
          type: "error",
        })
      );
    });
  });
});
