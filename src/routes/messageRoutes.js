const express = require("express");
const messageController = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/:messageId/reactions", messageController.addReaction);
router.delete("/:messageId/reactions", messageController.removeReaction); // Using DELETE method is more semantic

module.exports = router;
