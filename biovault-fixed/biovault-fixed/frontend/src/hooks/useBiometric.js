import { useState } from "react";
import {
  registerBiometric,
  authenticateBiometric,
  browserSupportsWebAuthn,
  deriveBiometricHash,
  generateSalt,
} from "../utils/webauthn";
import api from "../services/api";

export function useBiometric() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSupported = browserSupportsWebAuthn();

  async function register(username, email) {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Get registration options from server
      const { data } = await api.post("/auth/register/start", { username, email });
      const { options, userId } = data;

      // Step 2: Trigger device biometric prompt
      const { credential } = await registerBiometric(options);

      // Step 3: Generate ZK commitment client-side (never send raw biometric)
      const bioHash = await deriveBiometricHash(credential.id);
      const salt = generateSalt();
      // In production: run snarkjs circuit here to get actual ZK commitment
      const zkCommitment = "0x" + bioHash.slice(0, 32) + salt.slice(0, 32);

      // Step 4: Complete registration
      const { data: result } = await api.post("/auth/register/finish", {
        userId,
        username,
        email,
        credential,
        zkCommitment,
      });

      return result;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function login(username) {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Get auth options
      const { data } = await api.post("/auth/login/start", { username });
      const { options, userId } = data;

      // Step 2: Trigger biometric prompt
      const { credential } = await authenticateBiometric(options);

      // Step 3: Verify on server
      const { data: result } = await api.post("/auth/login/finish", {
        userId,
        credential,
      });

      return result;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function signTransaction(userId, userOp, authOptions) {
    setLoading(true);
    setError(null);
    try {
      const { credential } = await authenticateBiometric(authOptions);
      const { data } = await api.post("/transaction/send", {
        userId,
        userOp,
        biometricCredential: credential,
      });
      return data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }

  return { register, login, signTransaction, loading, error, isSupported };
}
