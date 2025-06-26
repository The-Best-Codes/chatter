import { X } from "lucide-react";
import { useEffect, useState } from "react";
import ApiService from "../../services/api-service";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";

export function UserList({ room, onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (room) {
      loadRoomMembers();
    }
  }, [room]);

  const loadRoomMembers = async () => {
    if (!room) return;

    setLoading(true);
    try {
      const roomMembers = await ApiService.getRoomMembers(room.id);
      setMembers(roomMembers);
    } catch (error) {
      console.error("Failed to load room members:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Members ({members.length})</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading members...</div>
          </div>
        ) : members.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p>No members found</p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-accent"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback>
                    {member.display_name?.charAt(0) ||
                      member.username?.charAt(0) ||
                      "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {member.display_name || member.username}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    @{member.username}
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
