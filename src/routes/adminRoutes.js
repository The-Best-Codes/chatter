const express = require('express');
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

// Apply both middlewares to all routes in this file
router.use(protect, isAdmin);

// Settings Routes
router.get('/settings', adminController.getAppSettings);
router.put('/settings', adminController.updateAppSettings);

// User Management Routes
router.get('/users', adminController.listUsers);
router.post('/users/:userId/status', adminController.updateUserStatus);
router.delete('/users/:userId', adminController.deleteUser);

router.put('/users/:userId/permissions', adminController.updateUserPermissions);
router.post('/users/:userId/password-reset', adminController.generatePasswordResetCode);

module.exports = router;
