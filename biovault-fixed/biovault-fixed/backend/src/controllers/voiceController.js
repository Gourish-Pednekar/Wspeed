const crypto = require("crypto");
const VoiceProfile = require("../models/VoiceProfile");
const voiceService = require("../services/voiceService");

const generatePhrase = () => {
  const words = ["alpha", "bravo", "delta", "echo", "falcon", "galaxy", "horizon", "ignite"];
  return Array.from({ length: 4 }, () => words[Math.floor(Math.random() * words.length)]).join(" ");
};

async function getChallenge(req, res, next) {
  try {
    const phrase = generatePhrase();
    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 mins expiry

    await VoiceProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { activeChallenge: { phrase, expiresAt } },
      { upsert: true, new: true }
    );

    res.json({ phrase, expiresAt });
  } catch (err) {
    next(err);
  }
}

async function verifyVoice(req, res, next) {
  try {
    const profile = await VoiceProfile.findOne({ userId: req.user.userId });
    if (!profile || !profile.activeChallenge || profile.activeChallenge.expiresAt < new Date()) {
      return res.status(400).json({ error: "Challenge expired or not found" });
    }

    const { embedding, transcript } = await voiceService.processAudio(req.file.buffer);

    // 1. Verify Transcript Match
    if (transcript !== profile.activeChallenge.phrase) {
      return res.status(401).json({ error: "Transcript did not match the required phrase" });
    }

    // 2. Verify Speaker Embedding Match (Threshold e.g., 0.75)
    const similarity = voiceService.cosineSimilarity(profile.embedding, embedding);
    if (similarity < 0.75) {
      return res.status(401).json({ error: "Voice fingerprint mismatch" });
    }

    // Success: Mark as verified and clear challenge
    profile.lastVerified = new Date();
    profile.activeChallenge = null;
    await profile.save();

    // Generate a short-lived token to prove voice auth in the /send route
    const voiceAuthId = crypto.randomBytes(16).toString('hex');
    
    res.json({ success: true, voiceAuthId });
  } catch (err) {
    next(err);
  }
}

module.exports = { getChallenge, verifyVoice };