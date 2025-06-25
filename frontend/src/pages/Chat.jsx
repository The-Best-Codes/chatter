import { useCallback, useEffect, useState } from "react";
import { ChatArea } from "../components/chat/ChatArea";
import { ChatSidebar } from "../components/chat/ChatSidebar";
import { UserProfile } from "../components/chat/UserProfile";
import { useAuth } from "../contexts/AuthContext";
import ApiService from "../services/api-service";
import WebSocketService from "../services/websocket-service";

export function ChatPage() {
  const { token, logout } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleRoomCreated = (newRoom) => {
    setRooms((prev) => [newRoom, ...prev]);
    setSelectedRoom(newRoom);
  };

  const selectRoomById = useCallback(
    (roomId) => {
      const roomToSelect = rooms.find((r) => r.id === roomId);
      if (roomToSelect) {
        setSelectedRoom(roomToSelect);
      }
    },
    [rooms],
  );

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const userRooms = await ApiService.getRooms();
        setRooms(userRooms);

        await WebSocketService.connect(token);
        setConnected(true);
        console.log("Connected to WebSocket");
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        logout();
      }
    };

    initializeChat();

    return () => {
      WebSocketService.disconnect();
    };
  }, [token, logout]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#room=")) {
        const roomId = hash.substring(6);
        selectRoomById(roomId);
      }
    };

    // Set initial room from hash
    handleHashChange();

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [selectRoomById]);

  useEffect(() => {
    // Update URL hash when selectedRoom changes
    if (selectedRoom) {
      window.location.hash = `room=${selectedRoom.id}`;
    }
  }, [selectedRoom]);

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Connecting to chat...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar
        rooms={rooms}
        selectedRoom={selectedRoom}
        onRoomSelect={setSelectedRoom}
        onShowProfile={() => setShowProfile(true)}
        onRoomCreated={handleRoomCreated}
      />

      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <ChatArea room={selectedRoom} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">
                Welcome to Chatter
              </h2>
              <p>Select a room or start a conversation to begin chatting</p>
            </div>
          </div>
        )}
      </div>

      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
    </div>
  );
}
