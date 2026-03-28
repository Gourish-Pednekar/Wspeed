const secrets = require("secrets.js-grempe");
const crypto = require("crypto");
const RecoveryGuardian = require("../models/RecoveryGuardian");
const logger = require("../utils/logger");

/**
 * Split a secret (private recovery key) into Shamir shares
 * Each guardian gets one encrypted share
 * 
 * @param {string} secret - hex string to split
 * @param {number} threshold - minimum shares needed to reconstruct
 * @param {number} total - total shares to generate
 */
function splitSecret(secret, threshold = 2, total = 3) {
  const hexSecret = secret.startsWith("0x") ? secret.slice(2) : secret;
  const shares = secrets.share(hexSecret, total, threshold);
  return shares;
}

/**
 * Reconstruct secret from enough shares
 */
function combineShares(shares) {
  const reconstructed = secrets.combine(shares);
  return "0x" + reconstructed;
}

/**
 * Setup recovery guardians for a wallet
 */
async function setupGuardians(userId, walletAddress, guardianAddresses, recoveryPrivKey) {
  if (guardianAddresses.length < 2) {
    throw new Error("At least 2 guardians required");
  }

  const threshold = Math.ceil(guardianAddresses.length * 0.66);
  const total = guardianAddresses.length;

  // Split the recovery key into shares
  const shares = splitSecret(recoveryPrivKey, threshold, total);

  // Encrypt each share for its guardian (using guardian's address as key derivation input)
  const shamirShares = guardianAddresses.map((address, idx) => ({
    guardianAddress: address.toLowerCase(),
    encryptedShare: encryptShare(shares[idx], address),
    shareIndex: idx,
  }));

  // Upsert recovery record
  await RecoveryGuardian.findOneAndUpdate(
    { userId },
    {
      userId,
      walletAddress: walletAddress.toLowerCase(),
      guardians: guardianAddresses.map((address) => ({
        address: address.toLowerCase(),
        addedAt: new Date(),
        isConfirmedOnChain: false,
      })),
      shamirShares,
      threshold,
      totalShares: total,
      setupCompletedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  logger.info(`Recovery setup: ${total} guardians, threshold ${threshold}`);

  // Return shares to distribute to guardians (frontend sends to each guardian)
  return {
    threshold,
    total,
    guardianShares: guardianAddresses.map((address, idx) => ({
      guardianAddress: address,
      shareIndex: idx,
      // In production: send each share directly to guardian's email/wallet
      // For demo: return all so frontend can simulate
      share: shares[idx],
    })),
  };
}

/**
 * Reconstruct the recovery key from guardian shares
 */
async function reconstructKey(userId, guardianShares) {
  const record = await RecoveryGuardian.findOne({ userId });
  if (!record) throw new Error("No recovery setup found");

  if (guardianShares.length < record.threshold) {
    throw new Error(`Need at least ${record.threshold} guardian shares`);
  }

  // Verify shares come from registered guardians
  for (const { guardianAddress } of guardianShares) {
    const isGuardian = record.guardians.some(
      (g) => g.address === guardianAddress.toLowerCase()
    );
    if (!isGuardian) throw new Error(`${guardianAddress} is not a guardian`);
  }

  try {
    const reconstructed = combineShares(guardianShares.map((s) => s.share));
    return reconstructed;
  } catch {
    throw new Error("Failed to reconstruct key — invalid or insufficient shares");
  }
}

function encryptShare(share, guardianAddress) {
  // Simple AES-256 encryption using guardian address as key material
  const key = crypto.createHash("sha256").update(guardianAddress.toLowerCase()).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(share, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptShare(encryptedShare, guardianAddress) {
  const [ivHex, dataHex] = encryptedShare.split(":");
  const key = crypto.createHash("sha256").update(guardianAddress.toLowerCase()).digest();
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

module.exports = { splitSecret, combineShares, setupGuardians, reconstructKey };
