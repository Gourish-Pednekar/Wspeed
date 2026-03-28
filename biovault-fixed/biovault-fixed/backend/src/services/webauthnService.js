const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

const RP_NAME = process.env.WEBAUTHN_RP_NAME || "BioVault";
const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:5173";

const challengeStore = new Map();

async function generateRegOptions(userId, username, existingCredentials = []) {
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: Buffer.from(userId),
    userName: username,
    userDisplayName: username,
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      requireResidentKey: true,
      residentKey: "required",
      userVerification: "required",
    },
    supportedAlgorithmIDs: [-7, -8],
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credentialId,
      type: "public-key",
      transports: cred.transports || [],
    })),
    timeout: 60000,
  });
  challengeStore.set(userId, { challenge: options.challenge, expiresAt: Date.now() + 60000 });
  return options;
}

async function verifyRegResponse(userId, response) {
  const stored = challengeStore.get(userId);
  if (!stored || Date.now() > stored.expiresAt) throw new Error("Challenge expired or not found");

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });

  challengeStore.delete(userId);
  if (!verification.verified || !verification.registrationInfo) throw new Error("Registration verification failed");

  const info = verification.registrationInfo;
  const publicKeyBytes = info.credentialPublicKey;
  const credId = info.credentialID;
  const counter = info.counter ?? 0;

  if (!publicKeyBytes) throw new Error("No public key found");

  return {
    credentialId: Buffer.from(credId).toString("base64url"),
    publicKey: Buffer.from(publicKeyBytes).toString("base64url"),
    counter,
    deviceType: info.credentialDeviceType ?? "singleDevice",
    backedUp: info.credentialBackedUp ?? false,
    transports: response.response?.transports || [],
    p256Key: extractP256Key(publicKeyBytes),
  };
}

async function generateAuthOptions(userId, credentials) {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: credentials.map((cred) => ({
      id: Buffer.from(cred.credentialId, "base64url"),
      type: "public-key",
      transports: cred.transports || [],
    })),
    userVerification: "required",
    timeout: 60000,
  });
  challengeStore.set(`auth_${userId}`, { challenge: options.challenge, expiresAt: Date.now() + 60000 });
  return options;
}

async function verifyAuthResponse(userId, response, matchedCred) {
  const stored = challengeStore.get(`auth_${userId}`);
  if (!stored || Date.now() > stored.expiresAt) throw new Error("Challenge expired");

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: Buffer.from(matchedCred.credentialId, "base64url"),
      credentialPublicKey: Buffer.from(matchedCred.publicKey, "base64url"),
      counter: Number(matchedCred.counter) || 0,
      transports: matchedCred.transports || [],
    },
    requireUserVerification: true,
  });

  challengeStore.delete(`auth_${userId}`);
  if (!verification.verified) throw new Error("Authentication verification failed");

  return {
    verified: true,
    newCounter: verification.authenticationInfo?.newCounter ?? 0,
  };
}

function extractP256Key(cosePublicKey) {
  try {
    const keyBytes = Buffer.from(cosePublicKey);
    return {
      x: "0x" + keyBytes.slice(-64, -32).toString("hex"),
      y: "0x" + keyBytes.slice(-32).toString("hex"),
    };
  } catch {
    return { x: "0x" + "a".repeat(64), y: "0x" + "b".repeat(64) };
  }
}

module.exports = { generateRegOptions, verifyRegResponse, generateAuthOptions, verifyAuthResponse };
