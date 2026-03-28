const mongoose = require("mongoose");

/**
 * BiometricRecord
 * IMPORTANT: We NEVER store raw biometric data.
 * We only store:
 *   1. The ZK commitment (Poseidon hash of biometric + salt)
 *   2. The WebAuthn credential ID (device identifier)
 *   3. Encrypted metadata
 */
const BiometricRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // ZK commitment — this is all the server knows about the biometric
  // Commitment = Poseidon(biometricHash[0], biometricHash[1], salt)
  zkCommitment: {
    type: String,
    required: true,
  },
  // WebAuthn credential reference
  credentialId: {
    type: String,
    required: true,
  },
  // Verification key for proof verification
  verificationKeyHash: {
    type: String,
  },
  // Metadata (never biometric data)
  enrolledAt: { type: Date, default: Date.now },
  lastVerifiedAt: { type: Date },
  deviceInfo: {
    platform: String,
    authenticatorAttachment: String, // "platform" | "cross-platform"
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("BiometricRecord", BiometricRecordSchema);
