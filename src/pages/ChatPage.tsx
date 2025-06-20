import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar, Onboarding, RoomView, DMView, PublicRooms } from '@/components/chat';
import { Room } from '@/lib/api/rooms';
import { DirectMessageConversation } from '@/lib/api/direct-messages';
import { useAuth } from '@/components/auth';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function ChatPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for rooms and DMs
  const [rooms, setRooms] = useState<Room[]>([]);
  const [dmConversations, setDmConversations] = useState<DirectMessageConversation[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingDMs, setIsLoadingDMs] = useState(true);
  
  // State for active content
  const [activeContent, setActiveContent] = useState<{
    type: 'room' | 'dm' | 'onboarding' | 'discover';
    id?: string;
  }>({ type: 'onboarding' });
  
  // Dialog state
  const [dialogContent, setDialogContent] = useState<'createRoom' | 'createDM' | 'discover' | null>(null);
  
  // Parse hash from URL
  useEffect(() => {
    const hash = location.hash.substring(1); // Remove the # character
    
    if (hash.startsWith('room-')) {
      const roomId = hash.substring(5);
      setActiveContent({ type: 'room', id: roomId });
    } else if (hash.startsWith('dm-')) {
      const dmId = hash.substring(3);
      setActiveContent({ type: 'dm', id: dmId });
    } else if (hash === 'discover') {
      setActiveContent({ type: 'discover' });
    } else {
      // Default to onboarding if no hash or invalid hash
      setActiveContent({ type: 'onboarding' });
    }
  }, [location.hash]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
    }
  }, [user, loading, navigate]);
  
  // Fetch user's rooms
  useEffect(() => {
    const fetchRooms = async () => {
      if (!user) return;
      
      setIsLoadingRooms(true);
      try {
        const response = await fetch('/api/rooms');
        if (response.ok) {
          const data = await response.json();
          setRooms(data);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setIsLoadingRooms(false);
      }
    };
    
    fetchRooms();
  }, [user]);
  
  // Fetch user's DM conversations
  useEffect(() => {
    const fetchDMs = async () => {
      if (!user) return;
      
      setIsLoadingDMs(true);
      try {
        const response = await fetch('/api/dm');
        if (response.ok) {
          const data = await response.json();
          setDmConversations(data);
        }
      } catch (error) {
        console.error('Error fetching DMs:', error);
      } finally {
        setIsLoadingDMs(false);
      }
    };
    
    fetchDMs();
  }, [user]);
  
  // Determine if we should show onboarding
  useEffect(() => {
    if (!isLoadingRooms && !isLoadingDMs && rooms.length === 0 && dmConversations.length === 0) {
      setActiveContent({ type: 'onboarding' });
    }
  }, [isLoadingRooms, isLoadingDMs, rooms, dmConversations]);
  
  // Handle room creation
  const handleCreateRoom = async (name: string, description: string, isPublic: boolean): Promise<boolean> => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, isPublic }),
      });
      
      if (response.ok) {
        const newRoom = await response.json();
        setRooms(prev => [...prev, newRoom]);
        setDialogContent(null);
        navigate(`/#room-${newRoom.id}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creating room:', error);
      return false;
    }
  };
  
  // Handle joining a room via invite
  const handleJoinRoom = async (inviteCode: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/invites/${inviteCode}/accept`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Refresh rooms list
        const roomsResponse = await fetch('/api/rooms');
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          setRooms(roomsData);
        }
        
        // Navigate to the joined room
        if (data.roomId) {
          navigate(`/#room-${data.roomId}`);
        } else if (data.dmId) {
          navigate(`/#dm-${data.dmId}`);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error joining room:', error);
      return false;
    }
  };
  
  // Handle creating a DM
  const handleCreateDM = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/dm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (response.ok) {
        const newDM = await response.json();
        setDmConversations(prev => [...prev, newDM]);
        setDialogContent(null);
        navigate(`/#dm-${newDM.id}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creating DM:', error);
      return false;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!user) {
    return null; // Will redirect to login
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block w-64 border-r">
        <Sidebar
          rooms={rooms}
          dmConversations={dmConversations}
          onCreateRoom={() => setDialogContent('createRoom')}
          onCreateDM={() => setDialogContent('createDM')}
          onDiscoverRooms={() => navigate('/#discover')}
        />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header with sidebar trigger */}
        <div className="md:hidden p-3 border-b flex items-center">
          <Sidebar
            rooms={rooms}
            dmConversations={dmConversations}
            onCreateRoom={() => setDialogContent('createRoom')}
            onCreateDM={() => setDialogContent('createDM')}
            onDiscoverRooms={() => navigate('/#discover')}
            isMobile={true}
          />
          <h1 className="text-xl font-bold mx-auto">Chatter</h1>
        </div>
        
        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {activeContent.type === 'room' && activeContent.id && (
            <RoomView roomId={activeContent.id} />
          )}
          
          {activeContent.type === 'dm' && activeContent.id && (
            <DMView dmId={activeContent.id} />
          )}
          
          {activeContent.type === 'discover' && (
            <PublicRooms 
              onJoinRoom={async (roomId) => {
                navigate(`/#room-${roomId}`);
                return true;
              }} 
              onBack={() => setActiveContent({ type: 'onboarding' })}
            />
          )}
          
          {activeContent.type === 'onboarding' && (
            <Onboarding
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onDiscoverRooms={() => navigate('/#discover')}
            />
          )}
        </div>
      </div>
      
      {/* Dialogs */}
      <Dialog open={dialogContent !== null} onOpenChange={(open) => !open && setDialogContent(null)}>
        <DialogContent>
          {dialogContent === 'createRoom' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Create a New Room</h2>
              {/* Room creation form would go here */}
            </div>
          )}
          
          {dialogContent === 'createDM' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Start a Direct Message</h2>
              {/* User search and selection would go here */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}