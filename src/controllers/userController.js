const User = require('../models/userModel');

// GET /api/users?search=...
exports.searchUsers = async (req, res) => {
    const searchTerm = req.query.search || '';
    const currentUserId = req.user.id; // From our `protect` middleware

    if (searchTerm.length < 2) {
        return res.status(400).json({ message: 'Search term must be at least 2 characters long.' });
    }

    try {
        const users = await User.searchByUsername(searchTerm, currentUserId);
        res.status(200).json(users);
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ message: 'Error searching for users.' });
    }
};

// POST /api/users/:userId/block
exports.blockUser = async (req, res) => {
    const { userId: blockedUserId } = req.params;
    const blockerUserId = req.user.id;

    if (blockerUserId === blockedUserId) {
        return res.status(400).json({ message: 'You cannot block yourself.' });
    }

    try {
        await User.blockUser(blockerUserId, blockedUserId);
        res.status(201).json({ message: 'User blocked successfully.' });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ message: 'Failed to block user.' });
    }
};

// DELETE /api/users/:userId/block
exports.unblockUser = async (req, res) => {
    const { userId: blockedUserId } = req.params;
    const blockerUserId = req.user.id;

    try {
        await User.unblockUser(blockerUserId, blockedUserId);
        res.status(204).send();
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ message: 'Failed to unblock user.' });
    }
};
