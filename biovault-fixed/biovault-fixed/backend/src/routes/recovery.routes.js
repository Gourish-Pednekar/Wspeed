const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const recoveryService = require("../services/recoveryService");
const User = require("../models/User");
const RecoveryGuardian = require("../models/RecoveryGuardian");

// POST /api/recovery/setup
router.post("/setup", authMiddleware, async (req, res, next) => {
  try {
    const { guardians } = req.body;
    if (!guardians || guardians.length < 2) {
      return res.status(400).json({ error: "At least 2 guardian addresses required" });
    }

    const user = await User.findById(req.user.userId);

    // Generate a recovery key (in production, this is derived from user's biometric)
    const recoveryKey = "0x" + Buffer.from(user._id.toString()).toString("hex").padEnd(64, "0");

    const result = await recoveryService.setupGuardians(
      user._id.toString(),
      user.walletAddress,
      guardians,
      recoveryKey
    );

    user.guardiansSetup = true;
    await user.save();

    res.json({
      success: true,
      threshold: result.threshold,
      total: result.total,
      message: `Recovery setup complete. ${result.threshold}/${result.total} guardians needed to recover.`,
      shares: result.guardianShares, // In production: send to guardians via secure channel
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/recovery/status
router.get("/status", authMiddleware, async (req, res, next) => {
  try {
    const record = await RecoveryGuardian.findOne({ userId: req.user.userId });
    if (!record) return res.json({ setup: false });

    res.json({
      setup: true,
      threshold: record.threshold,
      total: record.totalShares,
      guardians: record.guardians.map((g) => ({
        address: g.address,
        confirmedOnChain: g.isConfirmedOnChain,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/recovery/reconstruct
router.post("/reconstruct", async (req, res, next) => {
  try {
    const { username, guardianShares } = req.body;
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(404).json({ error: "User not found" });

    const recoveredKey = await recoveryService.reconstructKey(
      user._id.toString(),
      guardianShares
    );

    res.json({
      success: true,
      message: "Key reconstructed. Proceed with new biometric enrollment.",
      recoveryToken: Buffer.from(recoveredKey).toString("base64"),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
