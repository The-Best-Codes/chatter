import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '@/lib/api/users';
import { UserPermissions } from './UserPermissions';
import { Search, User, Shield, ShieldOff } from 'lucide-react';

interface UserManagementProps {
  users: UserProfile[];
  isLoading: boolean;
  onSearchUsers: (query: string) => void;
  onSetAdminStatus: (userId: string, isAdmin: boolean) => Promise<boolean>;
  onUpdatePermissions: (userId: string, permissions: any) => Promise<boolean>;
}

export function UserManagement({
  users,
  isLoading,
  onSearchUsers,
  onSetAdminStatus,
  onUpdatePermissions
}: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Handle search input
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchUsers(searchQuery);
  };
  
  // Handle admin status change
  const handleAdminStatusChange = async (userId: string, isAdmin: boolean) => {
    const success = await onSetAdminStatus(userId, isAdmin);
    if (success && selectedUser?.id === userId) {
      setSelectedUser({
        ...selectedUser,
        isAdmin
      });
    }
    return success;
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* User List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
          
          {/* User list */}
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No users found</div>
            ) : (
              users.map(user => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                    selectedUser?.id === user.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{user.username}</span>
                  </div>
                  {user.isAdmin && (
                    <Shield className="h-4 w-4 text-blue-500" />
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* User Details */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>View and edit user information</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedUser ? (
            <div className="space-y-6">
              {/* Basic info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{selectedUser.username}</h3>
                  <Button
                    variant={selectedUser.isAdmin ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => handleAdminStatusChange(selectedUser.id, !selectedUser.isAdmin)}
                  >
                    {selectedUser.isAdmin ? (
                      <>
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Remove Admin
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Make Admin
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                <div className="text-sm">
                  <span className="text-muted-foreground">Joined: </span>
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </div>
                {selectedUser.lastLogin && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Last login: </span>
                    {new Date(selectedUser.lastLogin).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              {/* Permissions */}
              <UserPermissions
                user={selectedUser}
                onUpdatePermissions={onUpdatePermissions}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4" />
              <p>Select a user to view details</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}