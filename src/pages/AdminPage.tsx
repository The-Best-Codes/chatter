import { DefaultPermissions, UserManagement } from "@/components/admin";
import { useAuth } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UserProfile } from "@/lib/api/users";
import type { DefaultPermissions as DefaultPermissionsType } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [defaultPermissions, setDefaultPermissions] =
    useState<DefaultPermissionsType | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const response = await fetch("/api/admin/users");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (user?.isAdmin) {
      fetchUsers();
    }
  }, [user]);

  // Load default permissions
  useEffect(() => {
    const fetchDefaultPermissions = async () => {
      setIsLoadingDefaults(true);
      try {
        const response = await fetch("/api/admin/default-permissions");
        if (response.ok) {
          const data = await response.json();
          setDefaultPermissions(data);
        }
      } catch (error) {
        console.error("Error fetching default permissions:", error);
      } finally {
        setIsLoadingDefaults(false);
      }
    };

    if (user?.isAdmin) {
      fetchDefaultPermissions();
    }
  }, [user]);

  // Search users
  const handleSearchUsers = async (query: string) => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch(
        `/api/admin/users?search=${encodeURIComponent(query)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Set admin status
  const handleSetAdminStatus = async (
    userId: string,
    isAdmin: boolean,
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/admin-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isAdmin }),
      });

      if (response.ok) {
        // Update local state
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === userId ? { ...u, isAdmin } : u)),
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error setting admin status:", error);
      return false;
    }
  };

  // Update user permissions
  const handleUpdatePermissions = async (
    userId: string,
    permissions: any,
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(permissions),
      });

      if (response.ok) {
        // Update local state
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === userId
              ? { ...u, permissions: { ...u.permissions, ...permissions } }
              : u,
          ),
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating permissions:", error);
      return false;
    }
  };

  // Update default permissions
  const handleUpdateDefaultPermissions = async (
    permissions: Partial<DefaultPermissionsType>,
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/admin/default-permissions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(permissions),
      });

      if (response.ok) {
        // Update local state
        setDefaultPermissions((prev) =>
          prev ? { ...prev, ...permissions } : null,
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating default permissions:", error);
      return false;
    }
  };

  if (loading || !user || !user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chat
        </Button>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="permissions">Default Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserManagement
            users={users}
            isLoading={isLoadingUsers}
            onSearchUsers={handleSearchUsers}
            onSetAdminStatus={handleSetAdminStatus}
            onUpdatePermissions={handleUpdatePermissions}
          />
        </TabsContent>

        <TabsContent value="permissions">
          {defaultPermissions ? (
            <DefaultPermissions
              defaultPermissions={defaultPermissions}
              onUpdateDefaultPermissions={handleUpdateDefaultPermissions}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {isLoadingDefaults
                ? "Loading..."
                : "Failed to load default permissions"}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
