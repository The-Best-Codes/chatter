import { Hash, Plus, Search, Settings, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import ApiService from "../../services/api-service";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { CreateRoomModal } from "./CreateRoomModal";

export function ChatSidebar({
  rooms,
  selectedRoom,
  onRoomSelect,
  onShowProfile,
  onRoomCreated,
}) {
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  useEffect(() => {
    // Load notifications
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await ApiService.getNotifications();
      // The API returns { count, notifications }, we need just the notifications array
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      setNotifications([]); // Set empty array on error to prevent filter issues
    }
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (term.length >= 2) {
      try {
        const results = await ApiService.searchUsers(term);
        setSearchResults(results);
        setShowSearch(true);
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
      }
    } else {
      setShowSearch(false);
      setSearchResults([]);
    }
  };

  const startDirectMessage = async (targetUser) => {
    try {
      const dmRoom = await ApiService.createDmRoom(targetUser.id);
      onRoomSelect(dmRoom);
      setShowSearch(false);
      setSearchTerm("");
    } catch (error) {
      console.error("Failed to create DM:", error);
    }
  };

  const getUnreadCount = (roomId) => {
    if (!Array.isArray(notifications)) {
      return 0;
    }
    return notifications.filter((n) => n.room_id === roomId && !n.read).length;
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Chatter</h1>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/admin">
                <Shield className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={onShowProfile}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />

          {/* Search Results */}
          {showSearch && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 hover:bg-accent cursor-pointer flex items-center gap-3"
                    onClick={() => startDirectMessage(user)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>
                        {user.display_name?.charAt(0) ||
                          user.username.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {user.display_name || user.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-sm text-muted-foreground">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Rooms
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowCreateRoom(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {rooms.map((room) => {
            const unreadCount = getUnreadCount(room.id);
            const isSelected = selectedRoom?.id === room.id;

            return (
              <div
                key={room.id}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent ${
                  isSelected ? "bg-accent" : ""
                }`}
                onClick={() => onRoomSelect(room)}
              >
                <div className="flex-shrink-0">
                  {room.type === "dm" ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={room.other_user?.avatar_url} />
                      <AvatarFallback>
                        {room.other_user?.display_name?.charAt(0) ||
                          room.other_user?.username?.charAt(0) ||
                          "?"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 rounded-md bg-foreground flex items-center justify-center">
                      <Hash className="h-4 w-4 text-background" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {room.type === "dm"
                      ? room.other_user?.display_name ||
                        room.other_user?.username
                      : room.name}
                  </div>
                  {room.last_message && (
                    <div className="text-sm text-muted-foreground truncate">
                      {room.last_message.content}
                    </div>
                  )}
                </div>

                {unreadCount > 0 && (
                  <Badge variant="default" className="ml-auto">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar_url} />
            <AvatarFallback>
              {user?.display_name?.charAt(0) ||
                user?.username?.charAt(0) ||
                "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {user?.display_name || user?.username}
            </div>
            <div className="text-sm text-muted-foreground">Online</div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => setShowCreateRoom(false)}
          onRoomCreated={(newRoom) => {
            onRoomCreated(newRoom);
            setShowCreateRoom(false);
          }}
        />
      )}
    </div>
  );
}
