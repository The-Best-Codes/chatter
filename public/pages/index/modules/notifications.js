export class NotificationManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.hasNotificationPermission = false;

        // Request notification permission if needed
        this.requestNotificationPermission();
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

    shouldNotify() {
        const notificationSetting = this.settingsManager.getSetting('notifications');
        const desktopNotifications = this.settingsManager.getSetting('desktopNotifications');

        if (!desktopNotifications || notificationSetting === 'never') {
            return false;
        }

        if (notificationSetting === 'always') {
            return true;
        }

        return notificationSetting === 'unfocused' && !document.hasFocus();
    }

    notify(title, options = {}) {
        if (!this.shouldNotify() || !this.hasNotificationPermission) {
            return;
        }

        const notification = new Notification(title, {
            icon: '/favicon.ico',
            ...options
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
    }
}
