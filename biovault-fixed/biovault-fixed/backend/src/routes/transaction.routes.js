const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const bundlerService = require("../services/bundlerService");
const webauthnService = require("../services/webauthnService");
const User = require("../models/User");
const VoiceProfile = require("../models/VoiceProfile"); 
const { ethers } = require("ethers");

// POST /api/transaction/prepare
// Returns a UserOperation for the user to sign biometrically
router.post("/prepare", authMiddleware, async (req, res, next) => {
  try {
    const { to, value, data } = req.body;
    const user = await User.findById(req.user.userId);

    // Encode the call
    const callData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256", "bytes"],
      [to, ethers.parseEther(value || "0"), data || "0x"]
    );

    // Build unsigned UserOp
    const userOp = await bundlerService.buildUserOperation(
      user.walletAddress,
      callData,
      "0x"
    );

    // Generate auth options so user can sign with biometric
    const authOptions = await webauthnService.generateAuthOptions(
      user._id.toString(),
      user.credentials
    );

    res.json({ userOp, authOptions, userId: user._id });
  } catch (err) {
    next(err);
  }
});

// POST /api/transaction/send
// Receives biometric-signed UserOp and submits to bundler
router.post("/send", authMiddleware, async (req, res, next) => {
  try {
    // ✅ UPDATED: added voiceAuthId
    const { userId, userOp, biometricCredential, voiceAuthId } = req.body;

    const user = await User.findById(userId || req.user.userId);

    // --- EXISTING WEBAUTHN LOGIC ---
    const matchedCred = user.credentials.find(
      (c) => c.credentialId === biometricCredential.id
    );
    if (!matchedCred) {
      return res.status(400).json({ error: "Credential not found" });
    }

    const authResult = await webauthnService.verifyAuthResponse(
      user._id.toString(),
      biometricCredential,
      matchedCred
    );

    // Update counter
    matchedCred.counter = authResult.newCounter;
    await user.save();

    // --- ✅ NEW VOICE STEP-UP CHECK ---
    const vProfile = await VoiceProfile.findOne({ userId: user._id });

    if (!vProfile || !vProfile.lastVerified) {
      return res.status(401).json({
        error: "Voice step-up authentication required",
      });
    }

    const timeSinceVerification =
      Date.now() - new Date(vProfile.lastVerified).getTime();

    if (timeSinceVerification > 2 * 60 * 1000) {
      // 2 minutes
      return res.status(401).json({
        error: "Voice verification expired. Please re-verify.",
      });
    }

    // --- EXISTING SIGNATURE LOGIC ---
    const signedUserOp = {
      ...userOp,
      signature: ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes", "bytes", "uint256", "uint256"],
        [
          authResult.authenticatorData,
          authResult.clientDataJSON,
          "0x1234", // TODO: replace with actual r
          "0x5678", // TODO: replace with actual s
        ]
      ),
    };

    // Send to bundler
    const result = await bundlerService.sendUserOperation(signedUserOp);

    res.json({
      success: true,
      userOpHash: result.userOpHash,
      status: "submitted",
    });
  } catch (err) {
    next(err);
  }
});

// module.exports = router;