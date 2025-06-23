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
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";
import ApiService from "../services/api-service";

export function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [inviteCodes, setInviteCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "users":
          const userList = await ApiService.getUsers();
          setUsers(userList);
          break;
        case "audit":
          const logs = await ApiService.getAuditLogs();
          setAuditLogs(logs);
          break;
        case "invites":
          const codes = await ApiService.getInviteCodes();
          setInviteCodes(codes);
          break;
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
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleUserStatusChange(user.id, "deleted")
                                }
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
                              {log.details}
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
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="signupMode">Signup Mode</Label>
                      <select
                        id="signupMode"
                        className="w-full mt-1 p-2 border border-border rounded-md"
                      >
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                        <option value="invite-only">Invite Only</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="maxMessageLength">
                        Max Message Length
                      </Label>
                      <Input
                        id="maxMessageLength"
                        type="number"
                        defaultValue="2000"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                      <Input
                        id="maxFileSize"
                        type="number"
                        defaultValue="10"
                        className="mt-1"
                      />
                    </div>

                    <Button>Save Settings</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
