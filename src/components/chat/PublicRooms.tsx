import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Room } from '@/lib/api/rooms';
import { ArrowLeft, Search, Users } from 'lucide-react';

interface PublicRoomsProps {
  onJoinRoom: (roomId: string) => Promise<boolean>;
  onBack: () => void;
}

export function PublicRooms({ onJoinRoom, onBack }: PublicRoomsProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  
  // Fetch public rooms
  useEffect(() => {
    const fetchPublicRooms = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/rooms/public');
        if (response.ok) {
          const data = await response.json();
          setRooms(data);
          setFilteredRooms(data);
        }
      } catch (error) {
        console.error('Error fetching public rooms:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPublicRooms();
  }, []);
  
  // Filter rooms based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRooms(rooms);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = rooms.filter(
      room => room.name.toLowerCase().includes(query) || 
              (room.description && room.description.toLowerCase().includes(query))
    );
    setFilteredRooms(filtered);
  }, [searchQuery, rooms]);
  
  // Handle joining a room
  const handleJoinRoom = async (roomId: string) => {
    setJoiningRoomId(roomId);
    try {
      const success = await onJoinRoom(roomId);
      if (!success) {
        // Reset joining state if failed
        setJoiningRoomId(null);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setJoiningRoomId(null);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold">Discover Public Rooms</h2>
      </div>
      
      <div className="p-4">
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading rooms...</div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {rooms.length === 0 ? 'No public rooms available' : 'No rooms match your search'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRooms.map(room => (
              <Card key={room.id}>
                <CardHeader className="pb-2">
                  <CardTitle>{room.name}</CardTitle>
                  {room.description && (
                    <CardDescription>{room.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1" />
                    {room.memberCount || 0} members
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={joiningRoomId === room.id}
                    className="w-full"
                  >
                    {joiningRoomId === room.id ? 'Joining...' : 'Join Room'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}