const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const WASM_PATH = process.env.ZK_WASM_PATH ||
  path.join(__dirname, "../../../circuits/build/biometric_commitment_js/biometric_commitment.wasm");
const ZKEY_PATH = process.env.ZK_ZKEY_PATH ||
  path.join(__dirname, "../../../circuits/keys/proving_key.zkey");
const VK_PATH = process.env.ZK_VERIFICATION_KEY_PATH ||
  path.join(__dirname, "../../../circuits/keys/verification_key.json");

/**
 * Generate a ZK proof for biometric commitment
 * Called server-side only if proof generation is delegated (normally done client-side)
 * 
 * @param {string} biometricHashHex - hex string of biometric hash
 * @param {string} salt - user's secret salt (bigint string)
 */
async function generateCommitmentProof(biometricHashHex, salt) {
  try {
    // Split 256-bit hash into two 128-bit field elements
    const hashBytes = Buffer.from(biometricHashHex.replace("0x", ""), "hex");
    const high = BigInt("0x" + hashBytes.slice(0, 16).toString("hex"));
    const low = BigInt("0x" + hashBytes.slice(16, 32).toString("hex"));

    const input = {
      biometricHash: [high.toString(), low.toString()],
      salt: salt.toString(),
    };

    if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
      logger.warn("ZK circuit files not found — returning mock proof for dev");
      return generateMockProof(input);
    }

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      WASM_PATH,
      ZKEY_PATH
    );

    return {
      proof,
      publicSignals,
      commitment: publicSignals[0], // The ZK commitment
    };
  } catch (err) {
    logger.error("ZK proof generation failed:", err);
    throw new Error("Failed to generate ZK proof");
  }
}

/**
 * Verify a ZK proof on the server
 */
async function verifyProof(proof, publicSignals) {
  try {
    if (!fs.existsSync(VK_PATH)) {
      logger.warn("Verification key not found — skipping verification in dev");
      return true;
    }

    const vk = JSON.parse(fs.readFileSync(VK_PATH, "utf8"));
    const valid = await snarkjs.groth16.verify(vk, publicSignals, proof);
    return valid;
  } catch (err) {
    logger.error("ZK proof verification failed:", err);
    return false;
  }
}

/**
 * Mock proof for development (when circuits aren't compiled yet)
 */
function generateMockProof(input) {
  const mockCommitment = "0x" + Buffer.from(
    JSON.stringify(input).slice(0, 32)
  ).toString("hex").padEnd(64, "0");

  return {
    proof: {
      pi_a: ["0x1", "0x2", "0x1"],
      pi_b: [["0x1", "0x2"], ["0x3", "0x4"], ["0x1", "0x0"]],
      pi_c: ["0x1", "0x2", "0x1"],
      protocol: "groth16",
    },
    publicSignals: [mockCommitment],
    commitment: mockCommitment,
    isMock: true,
  };
}

module.exports = { generateCommitmentProof, verifyProof };
