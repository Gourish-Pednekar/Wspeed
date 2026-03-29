const express = require("express");
const multer = require("multer");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const voiceController = require("../controllers/voiceController");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/challenge", authMiddleware, voiceController.getChallenge);
router.post("/verify", authMiddleware, upload.single("audio"), voiceController.verifyVoice);

module.exports = router;