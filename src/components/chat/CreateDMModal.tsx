import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useDebounce } from '@/lib/utils';

interface UserResult {
  id: string;
  username: string;
}

interface CreateDMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDM: (userId: string) => Promise<boolean>;
}

export function CreateDMModal({ open, onOpenChange, onCreateDM }: CreateDMModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Search for users when the debounced query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedSearchQuery)}`);
        
        if (response.ok) {
          const users = await response.json();
          setSearchResults(users);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    
    searchUsers();
  }, [debouncedSearchQuery]);
  
  const handleSelectUser = (user: UserResult) => {
    setSelectedUser(user);
    setSearchQuery(user.username);
    setSearchResults([]);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      toast.error('Please select a user to message');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await onCreateDM(selectedUser.id);
      
      if (success) {
        toast.success(`Started conversation with ${selectedUser.username}`);
        resetForm();
        onOpenChange(false);
      } else {
        toast.error('Failed to start conversation');
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setSearchQuery('');
    setSelectedUser(null);
    setSearchResults([]);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2 relative">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedUser(null);
              }}
              placeholder="Search for a user"
              disabled={isSubmitting}
              autoComplete="off"
            />
            
            {searchResults.length > 0 && !selectedUser && (
              <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-md max-h-60 overflow-auto">
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center p-2 hover:bg-muted cursor-pointer"
                    onClick={() => handleSelectUser(user)}
                  >
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback>
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.username}</span>
                  </div>
                ))}
              </div>
            )}
            
            {isSearching && (
              <p className="text-sm text-muted-foreground mt-1">Searching...</p>
            )}
            
            {debouncedSearchQuery && !isSearching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">No users found</p>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedUser}>
              {isSubmitting ? 'Starting...' : 'Start Conversation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}