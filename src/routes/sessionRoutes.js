const express = require("express");
const sessionController = require("../controllers/sessionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", sessionController.getActiveSessions);
router.delete("/:sessionId", sessionController.logoutSession);

module.exports = router;
