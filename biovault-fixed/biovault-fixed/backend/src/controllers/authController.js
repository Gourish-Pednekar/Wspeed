const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const BiometricRecord = require("../models/BiometricRecord");
const webauthnService = require("../services/webauthnService");
const bundlerService = require("../services/bundlerService");
const logger = require("../utils/logger");

async function registerStart(req, res, next) {
  try {
    const { username, email } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Username already taken" });

    const userId = uuidv4();
    const options = await webauthnService.generateRegOptions(userId, username);
    res.json({ options, userId });
  } catch (err) {
    next(err);
  }
}

async function registerFinish(req, res, next) {
  try {
    const { userId, username, email, credential, zkCommitment } = req.body;

    const verifiedCred = await webauthnService.verifyRegResponse(userId, credential);

    const walletSalt = BigInt("0x" + Buffer.from(username).toString("hex")).toString();

    const user = new User({
      username: username.toLowerCase(),
      email,
      credentials: [{
        credentialId: verifiedCred.credentialId,
        publicKey: verifiedCred.publicKey,
        counter: verifiedCred.counter ?? 0,
        deviceType: verifiedCred.deviceType,
        backedUp: verifiedCred.backedUp,
        transports: verifiedCred.transports || [],
      }],
      p256PubKeyX: verifiedCred.p256Key.x,
      p256PubKeyY: verifiedCred.p256Key.y,
      walletSalt,
    });

    const walletAddress = await bundlerService.getCounterfactualAddress(
      verifiedCred.p256Key.x,
      verifiedCred.p256Key.y,
      walletSalt
    );
    user.walletAddress = walletAddress;
    await user.save();

    if (zkCommitment) {
      await BiometricRecord.create({
        userId: user._id,
        zkCommitment,
        credentialId: verifiedCred.credentialId,
        deviceInfo: { authenticatorAttachment: credential.authenticatorAttachment },
      });
    }

    const token = jwt.sign(
      { userId: user._id, walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    logger.info(`New user registered: ${username} → ${walletAddress}`);
    res.json({ token, user: { id: user._id, username: user.username, walletAddress: user.walletAddress } });
  } catch (err) {
    next(err);
  }
}

async function loginStart(req, res, next) {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(404).json({ error: "User not found" });

    const options = await webauthnService.generateAuthOptions(
      user._id.toString(),
      user.credentials
    );
    res.json({ options, userId: user._id });
  } catch (err) {
    next(err);
  }
}

async function loginFinish(req, res, next) {
  try {
    const { userId, credential } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    logger.info(`Login attempt, credentials in DB: ${user.credentials.map(c => c.credentialId)}`);
    logger.info(`Credential from browser: ${credential.id}`);

    // Try to match credential ID — handle both raw and base64url encoded forms
    let matchedCred = user.credentials.find(c => c.credentialId === credential.id);

    if (!matchedCred) {
      // Try converting browser credential.id (base64url) to match stored format
      const asBase64url = Buffer.from(credential.id, "base64url").toString("base64url");
      matchedCred = user.credentials.find(c => c.credentialId === asBase64url);
    }

    if (!matchedCred) {
      logger.error(`No matching credential found. DB has: ${JSON.stringify(user.credentials.map(c => c.credentialId))}, browser sent: ${credential.id}`);
      return res.status(400).json({ error: "Credential not found" });
    }

    // Ensure counter is a number
    matchedCred.counter = Number(matchedCred.counter) || 0;

    const result = await webauthnService.verifyAuthResponse(
      userId,
      credential,
      matchedCred
    );

    matchedCred.counter = result.newCounter;
    user.lastLogin = new Date();
    await user.save();

    await BiometricRecord.updateOne(
      { userId, credentialId: matchedCred.credentialId },
      { lastVerifiedAt: new Date() }
    );

    const token = jwt.sign(
      { userId: user._id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({ token, user: { id: user._id, username: user.username, walletAddress: user.walletAddress } });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerStart, registerFinish, loginStart, loginFinish };