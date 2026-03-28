# BioVault Architecture

## Core Concept

Traditional wallets: Private Key → Sign Transaction
BioVault: Fingerprint → WebAuthn P256 KeyPair → ERC-4337 UserOp → On-chain Verification

## Component Breakdown

### 1. WebAuthn Layer (Browser ↔ Backend)
- **Registration**: Browser generates P256 keypair in Secure Enclave. Server gets public key only.
- **Authentication**: Device signs a challenge with the private key. P256 signature verified server-side.
- **Key point**: Private key NEVER leaves the device's Secure Enclave.

### 2. ZK Privacy Layer (Client-side)
- Client generates `biometricHash = SHA256(credentialId + template)`
- Client generates random `salt`
- Client computes `commitment = Poseidon(biometricHash[0], biometricHash[1], salt)`
- Only `commitment` is sent to the server
- For transaction signing: ZK proof proves "I know biometric matching this commitment AND authorize txHash"

### 3. ERC-4337 Account Abstraction
- `BioVaultAccountFactory` deploys `BioVaultAccount` per user
- Wallet address = `CREATE2(pubKeyX, pubKeyY, salt)` — deterministic, predictable before deploy
- `UserOperation` signed with P256 (from WebAuthn assertion)
- `BiometricVerifier.sol` validates P256 sig using EIP-7212 precompile or fallback library
- Bundler (Alchemy/Pimlico) batches UserOps → EntryPoint

### 4. Recovery Module
- User registers guardians (Ethereum addresses) on-chain
- Recovery key split via Shamir's Secret Sharing (e.g., 2-of-3)
- Each guardian receives one encrypted share
- Recovery flow:
  1. Guardian initiates via `RecoveryModule.sol`
  2. Others approve
  3. After 48h delay + threshold → `updateBiometricKey()` called
  4. User enrolls new biometric

## Data Flow: Registration
```
Browser
  ├── navigator.credentials.create() → P256 keypair in Secure Enclave
  ├── Compute biometricHash + salt → zkCommitment (client-side)
  └── POST /auth/register/finish { credential, zkCommitment }
         ↓
Backend
  ├── verifyRegistrationResponse() → verified credential + publicKey
  ├── Extract P256 (x,y) from COSE key
  ├── Store: User { p256PubKeyX, p256PubKeyY, walletSalt }
  ├── Store: BiometricRecord { zkCommitment } — NOT raw biometric
  └── Call factory.getAddress() → counterfactual walletAddress
```

## Data Flow: Transaction
```
Browser
  ├── POST /transaction/prepare → UserOp + authOptions
  ├── navigator.credentials.get() → P256 assertion (fingerprint)
  └── POST /transaction/send { userOp, biometricCredential }
         ↓
Backend
  ├── verifyAuthenticationResponse() → P256 sig verified
  ├── Encode sig into UserOp.signature
  └── eth_sendUserOperation → Bundler → EntryPoint
         ↓
Chain
  └── BioVaultAccount._validateSignature() → BiometricVerifier → ✅
```
