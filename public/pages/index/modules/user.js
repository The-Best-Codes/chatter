export class UserManager {
    constructor() {
        this.currentUser = null;
    }

    async initialize() {
        try {
            const response = await fetch('/me');
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
            this.currentUser = await response.json();
            return this.currentUser;
        } catch (error) {
            console.error('Error fetching user info:', error);
            throw error;
        }
    }

    getCurrentUsername() {
        return this.currentUser?.username;
    }

    isCurrentUser(username) {
        return this.currentUser?.username === username;
    }
}
