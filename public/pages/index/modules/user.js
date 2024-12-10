export class UserManager {
    constructor() {
        this.currentUser = null;
    }

    async initialize() {
        try {
            const response = await fetch('/me');
            if (response.status === 401) {
                // User is not authenticated, redirect to login
                window.location.href = '/login';
                return null;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
            this.currentUser = await response.json();
            return this.currentUser;
        } catch (error) {
            console.error('Error fetching user info:', error);
            // Only redirect on authentication errors, not other types of errors
            if (error.message === 'Failed to fetch user info') {
                window.location.href = '/login';
            }
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
