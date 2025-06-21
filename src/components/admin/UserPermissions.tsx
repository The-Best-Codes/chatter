import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { UserProfile } from '@/lib/api/users';
import type { UserPermissions as UserPermissionsType } from '@/lib/auth';
import { Check, X } from 'lucide-react';

interface UserPermissionsProps {
  user: UserProfile;
  onUpdatePermissions: (userId: string, permissions: Partial<UserPermissionsType>) => Promise<boolean>;
}

export function UserPermissions({ user, onUpdatePermissions }: UserPermissionsProps) {
  const [permissions, setPermissions] = useState<UserPermissionsType>({
    canSendAttachments: user.permissions.canSendAttachments,
    maxMessageLength: user.permissions.maxMessageLength,
    maxAttachmentSize: user.permissions.maxAttachmentSize || 5 * 1024 * 1024, // Default 5MB if not set
    canCreatePublicRoom: user.permissions.canCreatePublicRoom,
    canCreatePrivateRoom: user.permissions.canCreatePrivateRoom,
    canDM: user.permissions.canDM,
    canCreateInvites: user.permissions.canCreateInvites
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateSuccess(null);
    
    try {
      const success = await onUpdatePermissions(user.id, permissions);
      setUpdateSuccess(success);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleChange = (field: keyof UserPermissionsType, value: boolean | number) => {
    setPermissions(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Permissions: {user.username}</CardTitle>
        <CardDescription>Manage permissions for this user</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle permissions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="canSendAttachments" className="cursor-pointer">
                Can send attachments
              </Label>
              <Switch
                id="canSendAttachments"
                checked={permissions.canSendAttachments}
                onCheckedChange={(checked) => handleChange('canSendAttachments', checked)}
              />
            </div>
            
            {permissions.canSendAttachments && (
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <Label htmlFor="maxAttachmentSize">Max attachment size (MB)</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="maxAttachmentSize"
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.1}
                    value={(permissions.maxAttachmentSize / (1024 * 1024)).toFixed(1)}
                    onChange={(e) => {
                      const mbValue = parseFloat(e.target.value) || 0;
                      const bytesValue = Math.round(mbValue * 1024 * 1024);
                      handleChange('maxAttachmentSize', bytesValue);
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">MB</span>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <Label htmlFor="canCreatePublicRoom" className="cursor-pointer">
                Can create public rooms
              </Label>
              <Switch
                id="canCreatePublicRoom"
                checked={permissions.canCreatePublicRoom}
                onCheckedChange={(checked) => handleChange('canCreatePublicRoom', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="canCreatePrivateRoom" className="cursor-pointer">
                Can create private rooms
              </Label>
              <Switch
                id="canCreatePrivateRoom"
                checked={permissions.canCreatePrivateRoom}
                onCheckedChange={(checked) => handleChange('canCreatePrivateRoom', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="canDM" className="cursor-pointer">
                Can send direct messages
              </Label>
              <Switch
                id="canDM"
                checked={permissions.canDM}
                onCheckedChange={(checked) => handleChange('canDM', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="canCreateInvites" className="cursor-pointer">
                Can create invites
              </Label>
              <Switch
                id="canCreateInvites"
                checked={permissions.canCreateInvites}
                onCheckedChange={(checked) => handleChange('canCreateInvites', checked)}
              />
            </div>
          </div>
          
          {/* Max message length */}
          <div className="space-y-2">
            <Label htmlFor="maxMessageLength">Max message length</Label>
            <Input
              id="maxMessageLength"
              type="number"
              min={1}
              max={10000}
              value={permissions.maxMessageLength}
              onChange={(e) => handleChange('maxMessageLength', parseInt(e.target.value) || 0)}
            />
          </div>
          
          {/* Status message */}
          {updateSuccess !== null && (
            <div className={`p-3 rounded-md ${updateSuccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} flex items-center`}>
              {updateSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Permissions updated successfully
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Failed to update permissions
                </>
              )}
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update Permissions'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}