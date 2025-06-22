const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes in this file will be protected by our auth middleware
router.use(protect);

// GET /api/users?search=...
router.get('/', userController.searchUsers);
router.post('/:userId/block', userController.blockUser);
router.delete('/:userId/block', userController.unblockUser);

module.exports = router;
