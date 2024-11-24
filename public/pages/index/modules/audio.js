export class AudioManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.notificationSound = new Audio('/public/sounds/notification.mp3');
        this.notificationSound.volume = 1; // Full volume

        // Handle loading errors
        this.notificationSound.addEventListener('error', (e) => {
            console.error('Error loading notification sound:', e.error);
        });

        // Preload the audio
        this.notificationSound.load();
    }

    shouldPlaySound() {
        const soundSetting = this.settingsManager.getSetting('sound');

        if (soundSetting === 'never') {
            return false;
        }

        if (soundSetting === 'always') {
            return true;
        }

        return soundSetting === 'unfocused' && !document.hasFocus();
    }

    playMessageNotification() {
        if (!this.shouldPlaySound()) {
            return;
        }

        try {
            this.notificationSound.currentTime = 0; // Reset audio to start
            const playPromise = this.notificationSound.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Error playing notification sound:', error);
                });
            }
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    setVolume(volume) {
        // volume should be between 0 and 1
        this.notificationSound.volume = Math.max(0, Math.min(1, volume));
    }
}
