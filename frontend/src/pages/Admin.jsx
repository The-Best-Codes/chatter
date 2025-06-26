import {
  ArrowLeft,
  Ban,
  CheckCircle,
  FileText,
  Plus,
  Settings,
  Shield,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
//import { useAuth } from "../contexts/AuthContext";
import ApiService from "../services/api-service";

// Simple permissions form component
const PermissionsForm = ({ user, onSave, onCancel }) => {
  const [permissions, setPermissions] = useState({
    can_send_messages: user.permissions?.can_send_messages ?? true,
    can_dm_users: user.permissions?.can_dm_users ?? true,
    can_send_attachments: user.permissions?.can_send_attachments ?? true,
    max_attachment_size_kb: user.permissions?.max_attachment_size_kb ?? 10240,
    max_message_length: user.permissions?.max_message_length ?? 2000,
    can_edit_messages: user.permissions?.can_edit_messages ?? true,
    can_delete_messages: user.permissions?.can_delete_messages ?? true,
    can_react_to_messages: user.permissions?.can_react_to_messages ?? true,
    message_rate_limit: user.permissions?.message_rate_limit ?? 10,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(permissions);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="can_send_messages"
            checked={permissions.can_send_messages}
            onCheckedChange={(checked) =>
              setPermissions({
                ...permissions,
                can_send_messages: checked,
              })
            }
          />
          <Label htmlFor="can_send_messages">Can send messages</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="can_dm_users"
            checked={permissions.can_dm_users}
            onCheckedChange={(checked) =>
              setPermissions({
                ...permissions,
                can_dm_users: checked,
              })
            }
          />
          <Label htmlFor="can_dm_users">Can DM users</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="can_send_attachments"
            checked={permissions.can_send_attachments}
            onCheckedChange={(checked) =>
              setPermissions({
                ...permissions,
                can_send_attachments: checked,
              })
            }
          />
          <Label htmlFor="can_send_attachments">Can send attachments</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="can_edit_messages"
            checked={permissions.can_edit_messages}
            onCheckedChange={(checked) =>
              setPermissions({
                ...permissions,
                can_edit_messages: checked,
              })
            }
          />
          <Label htmlFor="can_edit_messages">Can edit messages</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="can_delete_messages"
            checked={permissions.can_delete_messages}
            onCheckedChange={(checked) =>
              setPermissions({
                ...permissions,
                can_delete_messages: checked,
              })
            }
          />
          <Label htmlFor="can_delete_messages">Can delete messages</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="can_react_to_messages"
            checked={permissions.can_react_to_messages}
            onCheckedChange={(checked) =>
              setPermissions({
                ...permissions,
                can_react_to_messages: checked,
              })
            }
          />
          <Label htmlFor="can_react_to_messages">Can react to messages</Label>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="max_message_length">Max message length:</Label>
          <Input
            id="max_message_length"
            type="number"
            value={permissions.max_message_length}
            onChange={(e) =>
              setPermissions({
                ...permissions,
                max_message_length: parseInt(e.target.value),
              })
            }
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="max_attachment_size_kb">Max attachment size (KB):</Label>
          <Input
            id="max_attachment_size_kb"
            type="number"
            value={permissions.max_attachment_size_kb}
            onChange={(e) =>
              setPermissions({
                ...permissions,
                max_attachment_size_kb: parseInt(e.target.value),
              })
            }
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="message_rate_limit">Message rate limit (per minute):</Label>
          <Input
            id="message_rate_limit"
            type="number"
            value={permissions.message_rate_limit}
            onChange={(e) =>
              setPermissions({
                ...permissions,
                message_rate_limit: parseInt(e.target.value),
              })
            }
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Permissions</Button>
      </div>
    </form>
  );
};

export function AdminPage() {
  //const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [inviteCodes, setInviteCodes] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "users": {
          const userList = await ApiService.getUsers();
          setUsers(userList.users || []);
          break;
        }
        case "audit": {
          const logs = await ApiService.getAuditLogs();
          setAuditLogs(logs);
          break;
        }
        case "invites": {
          const codes = await ApiService.getInviteCodes();
          setInviteCodes(codes);
          break;
        }
        case "settings": {
          const appSettings = await ApiService.getSettings();
          // Convert JSONB values to simple values
          const processedSettings = {};
          Object.keys(appSettings).forEach(key => {
            const value = appSettings[key];
            processedSettings[key] = value && typeof value === 'object' && value.value !== undefined 
              ? value.value 
              : value;
          });
          setSettings(processedSettings);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserStatusChange = async (userId, newStatus) => {
    try {
      await ApiService.updateUserStatus(userId, newStatus);
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)),
      );
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await ApiService.deleteUser(userId);
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, status: "deleted" } : u)),
      );
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  };

  const handleGenerateInviteCode = async () => {
    try {
      const newCode = await ApiService.generateInviteCode();
      setInviteCodes([newCode, ...inviteCodes]);
    } catch (error) {
      console.error("Failed to generate invite code:", error);
    }
  };

  const handleDeleteInviteCode = async (codeId) => {
    try {
      await ApiService.deleteInviteCode(codeId);
      setInviteCodes(inviteCodes.filter((c) => c.id !== codeId));
    } catch (error) {
      console.error("Failed to delete invite code:", error);
    }
  };

  const handleUpdateSetting = async (key, value) => {
    try {
      await ApiService.updateSetting(key, value);
      setSettings({ ...settings, [key]: value });
    } catch (error) {
      console.error("Failed to update setting:", error);
    }
  };

  const handleEditPermissions = (user) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  const handleSavePermissions = async (permissions) => {
    try {
      await ApiService.updateUserPermissions(selectedUser.id, permissions);
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, permissions } : u,
        ),
      );
      setShowPermissionsModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Failed to update permissions:", error);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: "default",
      frozen: "secondary",
      deleted: "destructive",
    };

    const icons = {
      active: CheckCircle,
      frozen: XCircle,
      deleted: Ban,
    };

    const Icon = icons[status];

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const tabs = [
    { id: "users", label: "Users", icon: Users },
    { id: "audit", label: "Audit Logs", icon: FileText },
    { id: "invites", label: "Invite Codes", icon: Shield },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chat
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage users, settings, and system configuration
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64">
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors ${
                          activeTab === tab.id
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === "users" && (
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Loading users...</div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="text-lg font-medium mb-2">No users found</div>
                      <div className="text-sm">Users will appear here once they sign up</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 border border-border rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback>
                                {user.display_name?.charAt(0) ||
                                  user.username.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.display_name || user.username}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                @{user.username} • Joined{" "}
                                {new Date(user.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {getStatusBadge(user.status)}

                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUserStatusChange(user.id, "active")
                                }
                                disabled={user.status === "active"}
                              >
                                Activate
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUserStatusChange(user.id, "frozen")
                                }
                                disabled={user.status === "frozen"}
                              >
                                Freeze
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPermissions(user)}
                                className="mr-2"
                              >
                                Permissions
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={user.status === "deleted"}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "audit" && (
              <Card>
                <CardHeader>
                  <CardTitle>Audit Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      Loading audit logs...
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="text-lg font-medium mb-2">No audit logs found</div>
                      <div className="text-sm">Admin actions will be logged here</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 border border-border rounded-md"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{log.action}</div>
                              <div className="text-sm text-muted-foreground">
                                by {log.admin_username} •{" "}
                                {new Date(log.created_at).toLocaleString()}
                              </div>
                            </div>
                            {log.target_username && (
                              <Badge variant="outline">
                                Target: {log.target_username}
                              </Badge>
                            )}
                          </div>
                          {log.details && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              {typeof log.details === 'object' 
                                ? JSON.stringify(log.details, null, 2)
                                : log.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "invites" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Invite Codes</CardTitle>
                  <Button onClick={handleGenerateInviteCode}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Code
                  </Button>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      Loading invite codes...
                    </div>
                  ) : inviteCodes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <div className="text-lg font-medium mb-2">No invite codes found</div>
                      <div className="text-sm">Generate invite codes to allow new users to join</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {inviteCodes.map((code) => (
                        <div
                          key={code.id}
                          className="flex items-center justify-between p-3 border border-border rounded-md"
                        >
                          <div>
                            <div className="font-mono font-medium">
                              {code.code}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Created:{" "}
                              {new Date(code.created_at).toLocaleString()}
                              {code.expires_at && (
                                <>
                                  {" "}
                                  • Expires:{" "}
                                  {new Date(code.expires_at).toLocaleString()}
                                </>
                              )}
                              {code.used_by_user_id && (
                                <> • Used by user {code.used_by_user_id}</>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {code.used_by_user_id ? (
                              <Badge variant="secondary">Used</Badge>
                            ) : code.expires_at &&
                              new Date(code.expires_at) < new Date() ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : (
                              <Badge variant="default">Active</Badge>
                            )}

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteInviteCode(code.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "settings" && (
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Loading settings...</div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="signupMode">Signup Mode</Label>
                        <Select
                          value={settings.signup_mode || "enabled"}
                          onValueChange={(value) =>
                            handleUpdateSetting("signup_mode", value)
                          }
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Select signup mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enabled">Enabled</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                            <SelectItem value="invite-only">Invite Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="maxMessageLength">
                          Max Message Length
                        </Label>
                        <Input
                          id="maxMessageLength"
                          type="number"
                          value={settings.max_message_length || "2000"}
                          onChange={(e) =>
                            handleUpdateSetting(
                              "max_message_length",
                              e.target.value,
                            )
                          }
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                        <Input
                          id="maxFileSize"
                          type="number"
                          value={settings.max_file_size || "10"}
                          onChange={(e) =>
                            handleUpdateSetting("max_file_size", e.target.value)
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Permissions Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit Permissions for {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <PermissionsForm
              user={selectedUser}
              onSave={handleSavePermissions}
              onCancel={() => {
                setShowPermissionsModal(false);
                setSelectedUser(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
