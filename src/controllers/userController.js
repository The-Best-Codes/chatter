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
