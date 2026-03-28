import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

export { browserSupportsWebAuthn };

/**
 * Register a new biometric credential
 */
export async function registerBiometric(options) {
  try {
    const credential = await startRegistration(options);
    return { success: true, credential };
  } catch (err) {
    if (err.name === "NotAllowedError") {
      throw new Error("Biometric registration was cancelled or denied.");
    }
    if (err.name === "InvalidStateError") {
      throw new Error("This device is already registered.");
    }
    throw err;
  }
}

/**
 * Authenticate with biometric (login or sign transaction)
 */
export async function authenticateBiometric(options) {
  try {
    const credential = await startAuthentication(options);
    return { success: true, credential };
  } catch (err) {
    if (err.name === "NotAllowedError") {
      throw new Error("Biometric authentication was cancelled.");
    }
    throw err;
  }
}

/**
 * Generate a simple biometric "hash" for ZK commitment
 * In production: use actual biometric template data from WebAuthn response
 * For demo: derive from credential ID
 */
export function deriveBiometricHash(credentialId) {
  // Simulate a 256-bit biometric hash from credential ID
  const encoder = new TextEncoder();
  const data = encoder.encode(credentialId + "_biometric_template");
  return crypto.subtle.digest("SHA-256", data).then((buf) => {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  });
}

/**
 * Generate a random salt for ZK commitment
 */
export function generateSalt() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
