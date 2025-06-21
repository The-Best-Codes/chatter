const Room = require('../models/roomModel');
const Message = require('../models/messageModel');

// GET /api/rooms/:roomId/messages
exports.getMessagesForRoom = async (req, res) => {
    const { roomId } = req.params;
    const { before, limit = 50 } = req.query;
    const userId = req.user.id;

    try {
        const isMember = await Room.isUserInRoom(userId, roomId);
        if (!isMember) {
            return res.status(403).json({ message: 'You are not a member of this room.' });
        }

        const messages = await Message.getMessagesByRoomId(roomId, limit, before);
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Failed to fetch messages.' });
    }
};

// POST /api/rooms/dm
exports.createOrGetDmRoom = async (req, res) => {
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    if (!targetUserId || targetUserId === currentUserId) {
        return res.status(400).json({ message: 'Valid target user ID is required.' });
    }

    try {
        const room = await Room.findOrCreateDmRoom(currentUserId, targetUserId);
        res.status(200).json(room); // 200 OK because we might just be getting an existing room
    } catch (error) {
        console.error('Error creating DM room:', error);
        res.status(500).json({ message: 'Failed to create DM room.' });
    }
};
