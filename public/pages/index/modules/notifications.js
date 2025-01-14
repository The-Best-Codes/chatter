export class NotificationManager {
  constructor(settingsManager) {
    this.settingsManager = settingsManager;
    this.hasNotificationPermission = false;

    // Request notification permission if needed
    this.updateNotificationPermission();
  }

  async requestNotificationPermission() {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notifications");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasNotificationPermission = permission === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  }

  updateNotificationPermission() {
    const notificationSetting =
      this.settingsManager.getSetting("notifications");

    if (notificationSetting !== "never") {
      this.requestNotificationPermission();
    } else {
      this.hasNotificationPermission = false;
    }
  }

  shouldNotify() {
    const notificationSetting =
      this.settingsManager.getSetting("notifications");

    //console.debug("notificationSetting", notificationSetting);

    if (notificationSetting === "never") {
      return false;
    }

    if (notificationSetting === "always") {
      return true;
    }

    return notificationSetting === "unfocused" && !document.hasFocus();
  }

  notify(title, options = {}) {
    if (!this.shouldNotify() || !this.hasNotificationPermission) {
      //console.debug("Not notifying");
      //console.debug("permission", this.hasNotificationPermission);
      return;
    }

    // Truncate title if it exceeds 100 characters
    const truncatedTitle =
      title.length > 100 ? title.substring(0, 97) + "..." : title;

    const notification = new Notification(truncatedTitle, {
      icon: "/favicon.ico",
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
}
