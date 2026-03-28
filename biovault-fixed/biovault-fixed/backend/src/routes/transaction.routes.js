const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const bundlerService = require("../services/bundlerService");
const webauthnService = require("../services/webauthnService");
const User = require("../models/User");
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
    const { userId, userOp, biometricCredential } = req.body;
    const user = await User.findById(userId || req.user.userId);

    // Verify biometric signature
    const matchedCred = user.credentials.find(
      (c) => c.credentialId === biometricCredential.id
    );
    if (!matchedCred) return res.status(400).json({ error: "Credential not found" });

    const authResult = await webauthnService.verifyAuthResponse(
      user._id.toString(),
      biometricCredential,
      matchedCred
    );

    // Update counter
    matchedCred.counter = authResult.newCounter;
    await user.save();

    // Attach WebAuthn signature to UserOp
    const signedUserOp = {
      ...userOp,
      signature: ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes", "bytes", "uint256", "uint256"],
        [
          authResult.authenticatorData,
          authResult.clientDataJSON,
          "0x1234", // r component (from P256 sig)
          "0x5678", // s component (from P256 sig)
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

module.exports = router;
