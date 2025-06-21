import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Hash, Users, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Room } from '@/lib/api/rooms';

interface PublicRoomsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinRoom: (roomId: string) => Promise<boolean>;
}

export function PublicRoomsModal({ open, onOpenChange, onJoinRoom }: PublicRoomsModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  // Fetch public rooms when modal opens
  useEffect(() => {
    if (open) {
      fetchPublicRooms();
    }
  }, [open]);

  // Filter rooms based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRooms(rooms);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = rooms.filter(
      room => 
        room.name.toLowerCase().includes(query) || 
        (room.description && room.description.toLowerCase().includes(query))
    );
    setFilteredRooms(filtered);
  }, [searchQuery, rooms]);

  const fetchPublicRooms = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/rooms/public');
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
        setFilteredRooms(data);
      } else {
        toast.error('Failed to fetch public rooms');
      }
    } catch (error) {
      console.error('Error fetching public rooms:', error);
      toast.error('An error occurred while fetching rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setJoiningRoomId(roomId);
    try {
      const success = await onJoinRoom(roomId);
      if (success) {
        toast.success('Joined room successfully');
        onOpenChange(false);
      } else {
        toast.error('Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('An error occurred while joining the room');
    } finally {
      setJoiningRoomId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Discover Public Rooms</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p>Loading rooms...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No rooms match your search' : 'No public rooms available'}
              </p>
            </div>
          ) : (
            filteredRooms.map(room => (
              <div
                key={room.id}
                className="border rounded-md p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 mr-2" />
                      <h3 className="font-medium">{room.name}</h3>
                    </div>
                    {room.description && (
                      <p className="text-sm text-muted-foreground mt-1">{room.description}</p>
                    )}
                    <div className="flex items-center mt-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3 mr-1" />
                      <span>{room.memberCount || 0} members</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={joiningRoomId === room.id}
                  >
                    {joiningRoomId === room.id ? 'Joining...' : 'Join'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}