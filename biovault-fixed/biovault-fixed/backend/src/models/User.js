const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
  },
  email: {
    type: String,
    sparse: true,
    trim: true,
    lowercase: true,
  },
  // Wallet address (ERC-4337 smart account)
  walletAddress: {
    type: String,
    sparse: true,
    lowercase: true,
  },
  // WebAuthn credential IDs (can have multiple devices)
  credentials: [{
    credentialId: { type: String, required: true },
    publicKey: { type: String, required: true }, // COSE-encoded P256 public key
    counter: { type: Number, default: 0 },
    deviceType: { type: String }, // "singleDevice" | "multiDevice"
    backedUp: { type: Boolean, default: false },
    transports: [String],
    createdAt: { type: Date, default: Date.now },
  }],
  // P256 key coordinates (extracted from WebAuthn for on-chain use)
  p256PubKeyX: { type: String }, // hex string
  p256PubKeyY: { type: String }, // hex string
  // Salt for factory deployment
  walletSalt: { type: String },
  // Recovery setup
  guardiansSetup: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
