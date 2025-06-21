import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRoom: (name: string, description: string, isPublic: boolean) => Promise<boolean>;
}

export function CreateRoomModal({ open, onOpenChange, onCreateRoom }: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Room name is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await onCreateRoom(name.trim(), description.trim(), isPublic);
      
      if (success) {
        toast.success('Room created successfully');
        resetForm();
        onOpenChange(false);
      } else {
        toast.error('Failed to create room');
      }
    } catch (error) {
      toast.error('An error occurred while creating the room');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setName('');
    setDescription('');
    setIsPublic(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Room Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter room name"
              disabled={isSubmitting}
              maxLength={50}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter room description"
              disabled={isSubmitting}
              maxLength={200}
              rows={3}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="isPublic" className="cursor-pointer">Public Room</Label>
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isSubmitting}
            />
          </div>
          
          {isPublic && (
            <p className="text-sm text-muted-foreground">
              Public rooms can be discovered and joined by anyone.
            </p>
          )}
          
          {!isPublic && (
            <p className="text-sm text-muted-foreground">
              Private rooms are invite-only.
            </p>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}