import { useEffect, useState } from "react";
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

  useEffect(() => {
    // Connect to WebSocket and load rooms when component mounts
    const initializeChat = async () => {
      try {
        // Load rooms first
        const userRooms = await ApiService.getRooms();
        setRooms(userRooms);

        // Then connect to WebSocket
        await WebSocketService.connect(token);
        setConnected(true);
        console.log("Connected to WebSocket");
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        // If connection fails, might need to re-authenticate
        logout();
      }
    };

    initializeChat();

    // Cleanup on unmount
    return () => {
      WebSocketService.disconnect();
    };
  }, [token, logout]);

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
