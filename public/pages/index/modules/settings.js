export class SettingsManager {
    constructor() {
        this.defaults = {
            notifications: 'unfocused', // 'always', 'unfocused', 'never'
            sound: 'unfocused', // 'always', 'unfocused', 'never'
            theme: 'light',
            desktopNotifications: true
        };
    }

    getSetting(key) {
        const value = localStorage.getItem(`chatter_${key}`);
        return value !== null ? JSON.parse(value) : this.defaults[key];
    }

    setSetting(key, value) {
        localStorage.setItem(`chatter_${key}`, JSON.stringify(value));
    }

    getAllSettings() {
        const settings = {};
        for (const key in this.defaults) {
            settings[key] = this.getSetting(key);
        }
        return settings;
    }

    resetToDefaults() {
        for (const [key, value] of Object.entries(this.defaults)) {
            this.setSetting(key, value);
        }
    }
}
