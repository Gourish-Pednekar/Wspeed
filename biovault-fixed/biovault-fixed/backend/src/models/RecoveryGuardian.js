const mongoose = require("mongoose");

const RecoveryGuardianSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  walletAddress: { type: String, required: true },
  guardians: [{
    address: { type: String, required: true },
    nickname: { type: String },
    addedAt: { type: Date, default: Date.now },
    isConfirmedOnChain: { type: Boolean, default: false },
  }],
  // Shamir's Secret Sharing shares (encrypted, stored off-chain for backup)
  // Each guardian gets one encrypted share
  shamirShares: [{
    guardianAddress: String,
    encryptedShare: String, // AES-encrypted share
    shareIndex: Number,
  }],
  threshold: { type: Number, default: 2 }, // Minimum guardians needed
  totalShares: { type: Number, default: 3 },
  setupCompletedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("RecoveryGuardian", RecoveryGuardianSchema);
