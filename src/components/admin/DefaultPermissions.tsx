import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DefaultPermissions as DefaultPermissionsType } from '@/lib/auth';
import { Check, X } from 'lucide-react';

interface DefaultPermissionsProps {
  defaultPermissions: DefaultPermissionsType;
  onUpdateDefaultPermissions: (permissions: Partial<DefaultPermissionsType>) => Promise<boolean>;
}

export function DefaultPermissions({ defaultPermissions, onUpdateDefaultPermissions }: DefaultPermissionsProps) {
  const [permissions, setPermissions] = useState<DefaultPermissionsType>({
    canSendAttachments: defaultPermissions.canSendAttachments,
    maxMessageLength: defaultPermissions.maxMessageLength,
    canCreatePublicRoom: defaultPermissions.canCreatePublicRoom,
    canCreatePrivateRoom: defaultPermissions.canCreatePrivateRoom,
    canDM: defaultPermissions.canDM,
    canCreateInvites: defaultPermissions.canCreateInvites,
    allowSignups: defaultPermissions.allowSignups
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<boolean | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateSuccess(null);
    
    try {
      const success = await onUpdateDefaultPermissions(permissions);
      setUpdateSuccess(success);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleChange = (field: keyof DefaultPermissionsType, value: boolean | number) => {
    setPermissions(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Permissions</CardTitle>
        <CardDescription>Set default permissions for new users</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle permissions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="allowSignups" className="cursor-pointer">
                Allow new user signups
              </Label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowSignups"
                  checked={permissions.allowSignups}
                  onChange={(e) => handleChange('allowSignups', e.target.checked)}
                  className="mr-2"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="canSendAttachments" className="cursor-pointer">
                Can send attachments
              </Label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="canSendAttachments"
                  checked={permissions.canSendAttachments}
                  onChange={(e) => handleChange('canSendAttachments', e.target.checked)}
                  className="mr-2"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="canCreatePublicRoom" className="cursor-pointer">
                Can create public rooms
              </Label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="canCreatePublicRoom"
                  checked={permissions.canCreatePublicRoom}
                  onChange={(e) => handleChange('canCreatePublicRoom', e.target.checked)}
                  className="mr-2"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="canCreatePrivateRoom" className="cursor-pointer">
                Can create private rooms
              </Label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="canCreatePrivateRoom"
                  checked={permissions.canCreatePrivateRoom}
                  onChange={(e) => handleChange('canCreatePrivateRoom', e.target.checked)}
                  className="mr-2"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="canDM" className="cursor-pointer">
                Can send direct messages
              </Label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="canDM"
                  checked={permissions.canDM}
                  onChange={(e) => handleChange('canDM', e.target.checked)}
                  className="mr-2"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="canCreateInvites" className="cursor-pointer">
                Can create invites
              </Label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="canCreateInvites"
                  checked={permissions.canCreateInvites}
                  onChange={(e) => handleChange('canCreateInvites', e.target.checked)}
                  className="mr-2"
                />
              </div>
            </div>
          </div>
          
          {/* Max message length */}
          <div className="space-y-2">
            <Label htmlFor="maxMessageLength">Default max message length</Label>
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
                  Default permissions updated successfully
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Failed to update default permissions
                </>
              )}
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update Default Permissions'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}