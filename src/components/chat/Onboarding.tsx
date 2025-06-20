import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/auth';
import { PlusCircle, Users, Link } from 'lucide-react';

interface OnboardingProps {
  onCreateRoom: (name: string, description: string, isPublic: boolean) => Promise<boolean>;
  onJoinRoom: (inviteCode: string) => Promise<boolean>;
  onDiscoverRooms: () => void;
}

export function Onboarding({ onCreateRoom, onJoinRoom, onDiscoverRooms }: OnboardingProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  
  // Create room form state
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Join room form state
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  // Handle create room submission
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreateRoom(roomName, roomDescription, isPublic);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle join room submission
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    
    setIsJoining(true);
    try {
      await onJoinRoom(inviteCode);
    } finally {
      setIsJoining(false);
    }
  };
  
  // Check permissions
  const canCreatePublicRoom = user?.permissions?.canCreatePublicRoom;
  const canCreatePrivateRoom = user?.permissions?.canCreatePrivateRoom;
  
  return (
    <div className="flex items-center justify-center h-full p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to Chatter!</CardTitle>
          <CardDescription>
            Get started by creating a room, joining with an invite, or discovering public rooms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="create" disabled={!canCreatePublicRoom && !canCreatePrivateRoom}>
                <PlusCircle className="h-4 w-4 mr-2" /> Create
              </TabsTrigger>
              <TabsTrigger value="join">
                <Link className="h-4 w-4 mr-2" /> Join
              </TabsTrigger>
              <TabsTrigger value="discover">
                <Users className="h-4 w-4 mr-2" /> Discover
              </TabsTrigger>
            </TabsList>
            
            {/* Create Room Tab */}
            <TabsContent value="create">
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName">Room Name</Label>
                  <Input
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter a name for your room"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="roomDescription">Description (Optional)</Label>
                  <Textarea
                    id="roomDescription"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    placeholder="What's this room about?"
                    rows={3}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    disabled={!canCreatePublicRoom}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isPublic" className="text-sm cursor-pointer">
                    Make this room public
                    {!canCreatePublicRoom && (
                      <span className="block text-xs text-muted-foreground">
                        You don't have permission to create public rooms
                      </span>
                    )}
                  </Label>
                </div>
                
                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Room'}
                </Button>
              </form>
            </TabsContent>
            
            {/* Join Room Tab */}
            <TabsContent value="join">
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <Input
                    id="inviteCode"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Paste the invite code here"
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isJoining}>
                  {isJoining ? 'Joining...' : 'Join Room'}
                </Button>
              </form>
            </TabsContent>
            
            {/* Discover Rooms Tab */}
            <TabsContent value="discover">
              <div className="text-center py-6">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Discover Public Rooms</h3>
                <p className="text-muted-foreground mb-4">
                  Find and join public rooms created by other users.
                </p>
                <Button onClick={onDiscoverRooms}>
                  Browse Public Rooms
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground text-center">
          Start chatting with others in secure, end-to-end encrypted conversations.
        </CardFooter>
      </Card>
    </div>
  );
}