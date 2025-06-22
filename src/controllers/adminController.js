const Admin = require('../models/adminModel');
const AuditLog = require('../services/auditLogService');
const crypto = require('crypto');

// GET /api/admin/settings
exports.getAppSettings = async (req, res) => {
    try {
        const settings = await Admin.getSettings();
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve settings.' });
    }
};

// PUT /api/admin/settings
exports.updateAppSettings = async (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ message: 'Setting key and value are required.' });
    }

    try {
        const oldSettings = await Admin.getSettings();
        const updatedSetting = await Admin.updateSetting(key, value);

        await AuditLog.logAction({
            adminUserId: req.user.id,
            action: `setting.update.${key}`,
            details: { oldValue: oldSettings[key], newValue: value },
            ipAddress: req.ip
        });

        res.status(200).json(updatedSetting);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update setting.' });
    }
};

// GET /api/admin/users
exports.listUsers = async (req, res) => {
    const { page, limit } = req.query;
    try {
        const result = await Admin.getAllUsers({ page, limit });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve users.' });
    }
};

// POST /api/admin/users/:userId/status
exports.updateUserStatus = async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body; // Expects 'active' or 'frozen'

    if (!['active', 'frozen'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided.' });
    }

    try {
        const updatedUser = await Admin.updateUserStatus(userId, status);
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        await AuditLog.logAction({
            adminUserId: req.user.id,
            action: 'user.update.status',
            targetUserId: userId,
            details: { newStatus: status },
            ipAddress: req.ip
        });

        // TODO: Invalidate user's sessions/websockets here

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update user status.' });
    }
};

// DELETE /api/admin/users/:userId
exports.deleteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const deletedUser = await Admin.softDeleteUser(userId);
         if (!deletedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        await AuditLog.logAction({
            adminUserId: req.user.id,
            action: 'user.delete',
            targetUserId: userId,
            ipAddress: req.ip
        });

        // TODO: Invalidate user's sessions/websockets here

        res.status(200).json({ message: 'User successfully deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user.' });
    }
};

// PUT /api/admin/users/:userId/permissions
exports.updateUserPermissions = async (req, res) => {
    const { userId } = req.params;
    const permissions = req.body; // Expects an object of permissions

    try {
        const updatedPerms = await Admin.updatePermissionsForUser(userId, permissions);
        await AuditLog.logAction({
            adminUserId: req.user.id,
            action: 'user.update.permissions',
            targetUserId: userId,
            details: { newPermissions: permissions },
            ipAddress: req.ip
        });
        res.status(200).json(updatedPerms);
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ message: 'Failed to update user permissions.' });
    }
};

// POST /api/admin/users/:userId/password-reset
exports.generatePasswordResetCode = async (req, res) => {
    const { userId } = req.params;
    // In a real app, this code would be emailed or sent via another secure channel.
    // Here we will just return it to the admin.
    const resetCode = crypto.randomBytes(8).toString('hex');
    const saltRounds = 10;
    const hashedCode = await require('bcrypt').hash(resetCode, saltRounds);

    // TODO: A real implementation would store this hashedCode in a separate
    // password_resets table with an expiry. For simplicity, we skip that.

    await AuditLog.logAction({
        adminUserId: req.user.id,
        action: 'user.password_reset.generate',
        targetUserId: userId,
        ipAddress: req.ip
    });

    res.status(200).json({
        message: 'Password reset code generated. Please securely transmit this to the user.',
        resetCode: resetCode
    });
};
