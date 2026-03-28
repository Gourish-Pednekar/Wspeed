# 🔐 BioVault — Biometric-Secured Decentralized Wallet

BioVault replaces traditional private key management with **WebAuthn biometric authentication** (fingerprint / Face ID) + **ERC-4337 Account Abstraction** + **ZK-proof privacy**.

---

## 🏗️ Architecture Overview

```
User's Fingerprint / Face ID (Browser WebAuthn API)
        ↓
  P256 Keypair generated in device Secure Enclave
        ↓
  ZK Commitment of biometric hash (Circom circuits)
        ↓
  Backend stores ONLY the ZK commitment (never raw biometric)
        ↓
  ERC-4337 Smart Account deployed (BioVaultAccountFactory)
  Wallet address = deterministic from P256 public key
        ↓
  Transaction → UserOperation signed with P256 key
        ↓
  Bundler (Alchemy/Pimlico) → EntryPoint Contract
        ↓
  BiometricVerifier.sol validates P256 sig on-chain ✅
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Ethereum / Polygon (ERC-4337) |
| Smart Contracts | Solidity + Hardhat |
| Biometric Auth | WebAuthn API (@simplewebauthn) |
| Privacy Layer | ZK-SNARKs via Circom + snarkjs |
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Database | MongoDB |
| Recovery | Shamir's Secret Sharing (secrets.js) |

---

## 🚀 Quick Start

### Option A — Docker (Recommended)

```bash
# 1. Start all services (MongoDB + Backend + Frontend)
docker-compose up --build

# 2. Open browser
open http://localhost:5173
```

> First build takes ~2 minutes. MongoDB health check ensures backend waits for DB.

---

### Option B — Manual (Node.js)

**Prerequisites:** Node.js ≥ 18, MongoDB running locally

```bash
# Terminal 1 — Backend (http://localhost:5000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

The `.env` file is pre-configured for local development. Edit `backend/.env` to customise.

---

### Option C — With Local Blockchain (Full Stack)

```bash
# Terminal 1 — Local Hardhat node
cd contracts
npm install
npx hardhat node

# Terminal 2 — Deploy contracts
cd contracts
npx hardhat run scripts/deploy.js --network localhost
# → Copy FACTORY_ADDRESS and RECOVERY_MODULE_ADDRESS into backend/.env

# Terminal 3 — Backend
cd backend && npm run dev

# Terminal 4 — Frontend
cd frontend && npm run dev
```

---

## ⚙️ Environment Variables (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `dev_secret_...` | **Change in production!** |
| `MONGODB_URI` | `mongodb://localhost:27017/biovault` | MongoDB connection string |
| `WEBAUTHN_RP_ID` | `localhost` | Must match your domain |
| `WEBAUTHN_ORIGIN` | `http://localhost:5173` | Must match frontend URL |
| `FACTORY_ADDRESS` | _(empty)_ | Set after contract deployment |
| `ALCHEMY_API_KEY` | _(empty)_ | For production bundler |

---

## 📁 Folder Structure

```
biovault/
├── contracts/          # Solidity smart contracts (Hardhat)
├── circuits/           # ZK circuits (Circom)
├── backend/            # Node.js + Express API
├── frontend/           # React + Vite web app
├── docs/               # Architecture & flow docs
└── docker-compose.yml  # One-command local setup
```

---

## ⚠️ Important Notes

- **WebAuthn requires `localhost` or HTTPS** — it will NOT work over plain HTTP on a non-localhost domain
- The `.env` file included is pre-filled for **local development only** — never commit real secrets
- Without `FACTORY_ADDRESS` set, wallet addresses are generated as dev placeholders (not real on-chain addresses)
- ZK proof generation is mocked client-side — compile Circom circuits for real ZK proofs

---

## 🐛 Fixes Applied (vs original)

1. `vite.config.js` — excluded `snarkjs` from Vite's optimizer (fixes WASM build errors)
2. `backend/src/config/db.js` — removed deprecated Mongoose 8 options
3. `docker-compose.yml` — added `JWT_SECRET`, MongoDB healthcheck, proper service ordering
4. `backend/Dockerfile` — switched to `node src/app.js` (stable for Docker)
5. `backend/src/services/webauthnService.js` — updated for `@simplewebauthn/server` v9 API
6. `backend/src/routes/wallet.routes.js` — added missing `/transactions` endpoint
7. `frontend/src/hooks/useWallet.js` — fetches transactions alongside wallet info
8. `backend/.env` — pre-filled with safe local development defaults
