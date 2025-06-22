const Session = require('../models/sessionModel');

// GET /api/sessions
exports.getActiveSessions = async (req, res) => {
    try {
        const sessions = await Session.findByUserId(req.user.id);
        res.status(200).json(sessions);
    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({ message: 'Failed to retrieve sessions.' });
    }
};

// DELETE /api/sessions/:sessionId
exports.logoutSession = async (req, res) => {
    const { sessionId } = req.params;
    try {
        const deletedCount = await Session.delete(sessionId, req.user.id);
        if (deletedCount === 0) {
            return res.status(404).json({ message: 'Session not found or you do not have permission to delete it.' });
        }
        res.status(204).send(); // 204 No Content is standard for a successful DELETE
    } catch (error) {
        console.error('Error logging out session:', error);
        res.status(500).json({ message: 'Failed to log out session.' });
    }
};
