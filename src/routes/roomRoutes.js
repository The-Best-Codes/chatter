const express = require('express');
const roomController = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes in this file
router.use(protect);

// POST /api/rooms/dm - to create/get a DM room
router.post('/dm', roomController.createOrGetDmRoom);

// GET /api/rooms/:roomId/messages - to get message history
router.get('/:roomId/messages', roomController.getMessagesForRoom);


module.exports = router;
