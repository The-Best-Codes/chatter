class ApiService {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem("chatterUserToken");

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(endpoint, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // User endpoints
  async searchUsers(searchTerm) {
    return this.request(`/api/users?search=${encodeURIComponent(searchTerm)}`);
  }

  async blockUser(userId) {
    return this.request(`/api/users/${userId}/block`, { method: "POST" });
  }

  async unblockUser(userId) {
    return this.request(`/api/users/${userId}/block`, { method: "DELETE" });
  }

  // Room endpoints
  async getRooms() {
    return this.request("/api/rooms");
  }

  async createRoom(name, type = "main_chat") {
    return this.request("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ name, type }),
    });
  }

  async getRoomMessages(roomId, before = null, limit = 50) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append("before", before);

    return this.request(`/api/rooms/${roomId}/messages?${params}`);
  }

  async createDmRoom(targetUserId) {
    return this.request("/api/rooms/dm", {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    });
  }

  async pinMessage(roomId, messageId) {
    return this.request(`/api/rooms/${roomId}/pins`, {
      method: "POST",
      body: JSON.stringify({ messageId }),
    });
  }

  async unpinMessage(roomId, messageId) {
    return this.request(`/api/rooms/${roomId}/pins/${messageId}`, {
      method: "DELETE",
    });
  }

  async getPinnedMessages(roomId) {
    return this.request(`/api/rooms/${roomId}/pins`);
  }

  // Reaction endpoints
  async addReaction(messageId, emoji) {
    return this.request(`/api/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ emojiCode: emoji }),
    });
  }

  async removeReaction(messageId, emoji) {
    return this.request(`/api/messages/${messageId}/reactions`, {
      method: "DELETE",
      body: JSON.stringify({ emojiCode: emoji }),
    });
  }

  // Notification endpoints
  async getNotifications() {
    return this.request("/api/notifications");
  }

  async markNotificationAsRead(notificationId) {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  }

  async clearAllNotifications() {
    return this.request("/api/notifications", { method: "DELETE" });
  }

  // Session endpoints
  async getSessions() {
    return this.request("/api/sessions");
  }

  async deleteSession(sessionId) {
    return this.request(`/api/sessions/${sessionId}`, { method: "DELETE" });
  }

  async deleteCurrentSession() {
    return this.request("/api/sessions/current", { method: "DELETE" });
  }

  // Admin endpoints (if user has admin permissions)
  async getUsers() {
    return this.request("/api/admin/users");
  }

  async updateUserStatus(userId, status) {
    return this.request(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async updateUserPermissions(userId, permissions) {
    return this.request(`/api/admin/users/${userId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    });
  }

  async getAuditLogs() {
    return this.request("/api/admin/audit-logs");
  }

  async generateInviteCode(expiresAt = null) {
    return this.request("/api/admin/invite-codes", {
      method: "POST",
      body: JSON.stringify({ expiresAt }),
    });
  }

  async getInviteCodes() {
    return this.request("/api/admin/invite-codes");
  }

  async deleteInviteCode(codeId) {
    return this.request(`/api/admin/invite-codes/${codeId}`, {
      method: "DELETE",
    });
  }
}

export default new ApiService();
