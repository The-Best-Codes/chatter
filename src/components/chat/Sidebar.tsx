import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { Room } from '@/lib/api/rooms';
import type { DirectMessageConversation } from '@/lib/api/direct-messages';
import { useAuth } from '@/components/auth';
import { PlusCircle, Hash, MessageSquare, Settings, Users, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

interface SidebarProps {
  rooms: Room[];
  dmConversations: DirectMessageConversation[];
  onCreateRoom: () => void;
  onCreateDM: () => void;
  onDiscoverRooms: () => void;
  className?: string;
  isMobile?: boolean;
}

export function Sidebar({
  rooms,
  dmConversations,
  onCreateRoom,
  onCreateDM,
  onDiscoverRooms,
  className,
  isMobile = false
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // Extract the active item from the URL hash
  useEffect(() => {
    const hash = location.hash.substring(1); // Remove the # character
    if (hash) {
      setActiveItem(hash);
    }
  }, [location.hash]);

  // Navigate to a room or DM
  const navigateTo = (type: 'room' | 'dm', id: string) => {
    navigate(`/#${type}-${id}`);
    setActiveItem(`${type}-${id}`);
  };

  const sidebarContent = (
    <div className={cn("flex flex-col h-full bg-muted/30", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Chatter</h2>
      </div>

      {/* Rooms and DMs */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Rooms Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-1">
            <h3 className="text-sm font-semibold text-muted-foreground">ROOMS</h3>
            <Button variant="ghost" size="icon" onClick={onCreateRoom} title="Create Room">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1 mt-1">
            {rooms.map(room => (
              <Button
                key={room.id}
                variant={activeItem === `room-${room.id}` ? "secondary" : "ghost"}
                className="w-full justify-start text-sm"
                onClick={() => navigateTo('room', room.id)}
              >
                <Hash className="h-4 w-4 mr-2" />
                <span className="truncate">{room.name}</span>
              </Button>
            ))}
            {rooms.length === 0 && (
              <Button
                variant="ghost"
                className="w-full justify-start text-sm text-muted-foreground"
                onClick={onDiscoverRooms}
              >
                <Users className="h-4 w-4 mr-2" />
                Discover Rooms
              </Button>
            )}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <h3 className="text-sm font-semibold text-muted-foreground">DIRECT MESSAGES</h3>
            <Button variant="ghost" size="icon" onClick={onCreateDM} title="New Message">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1 mt-1">
            {dmConversations.map(dm => (
              <Button
                key={dm.id}
                variant={activeItem === `dm-${dm.id}` ? "secondary" : "ghost"}
                className="w-full justify-start text-sm"
                onClick={() => navigateTo('dm', dm.id)}
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback className="text-xs">
                    {(user?.id === dm.user1Id ? dm.user2Username : dm.user1Username)?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{user?.id === dm.user1Id ? dm.user2Username : dm.user1Username}</span>
              </Button>
            ))}
            {dmConversations.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">
                No direct messages yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* User Controls */}
      <div className="p-3 border-t flex items-center justify-between">
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarFallback>
              {user?.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="truncate">
            <p className="text-sm font-medium">{user?.username}</p>
          </div>
        </div>
        <div className="flex">
          <ThemeToggle />
          {user?.isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} title="Admin Settings">
              <Settings className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // For mobile, wrap in a Sheet component
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <MessageSquare className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[280px]">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  // For desktop, return the sidebar directly
  return sidebarContent;
}