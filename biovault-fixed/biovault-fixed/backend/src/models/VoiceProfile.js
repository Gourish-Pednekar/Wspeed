const mongoose = require("mongoose");

const voiceProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  embedding: { type: [Number], required: true }, // Stored embedding array
  activeChallenge: {
    phrase: String,
    expiresAt: Date,
  },
  lastVerified: { type: Date }
});

module.exports = mongoose.model("VoiceProfile", voiceProfileSchema);