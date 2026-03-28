const { ethers } = require("ethers");
const logger = require("../utils/logger");

const FACTORY_ABI = [
  "function createAccount(uint256 pubKeyX, uint256 pubKeyY, uint256 salt) returns (address)",
  "function getAddress(uint256 pubKeyX, uint256 pubKeyY, uint256 salt) view returns (address)",
];

const ACCOUNT_ABI = [
  "function execute(address dest, uint256 value, bytes calldata func) external",
  "function getNonce() view returns (uint256)",
];

function getProvider() {
  const url = process.env.NETWORK_RPC_URL;
  if (!url) return null;
  try { return new ethers.JsonRpcProvider(url); } catch { return null; }
}

async function getCounterfactualAddress(pubKeyX, pubKeyY, salt) {
  try {
    const provider = getProvider();
    if (!provider || !process.env.FACTORY_ADDRESS) {
      const hash = ethers.keccak256(ethers.toUtf8Bytes(`${pubKeyX}${pubKeyY}${salt}`));
      return "0x" + hash.slice(26);
    }
    const factory = new ethers.Contract(process.env.FACTORY_ADDRESS, FACTORY_ABI, provider);
    const address = await factory.getAddress(BigInt(pubKeyX), BigInt(pubKeyY), BigInt(salt));
    return address.toLowerCase();
  } catch (err) {
    logger.warn("Could not get counterfactual address:", err.message);
    const hash = ethers.keccak256(ethers.toUtf8Bytes(`${pubKeyX}${pubKeyY}${salt}`));
    return "0x" + hash.slice(26);
  }
}

async function buildUserOperation(walletAddress, callData, signature) {
  return {
    sender: walletAddress,
    nonce: "0",
    initCode: "0x",
    callData,
    callGasLimit: "200000",
    verificationGasLimit: "150000",
    preVerificationGas: "21000",
    maxFeePerGas: "1000000000",
    maxPriorityFeePerGas: "1000000000",
    paymasterAndData: "0x",
    signature: signature || "0x",
  };
}

async function sendUserOperation(userOp) {
  logger.info("Submitting UserOp (dev mode):", userOp.sender);
  return { userOpHash: "0x" + "0".repeat(64), status: "submitted_dev" };
}

async function getNonce(walletAddress) {
  return 0n;
}

async function getBalance(walletAddress) {
  try {
    const provider = getProvider();
    if (!provider) return "0";
    const balWei = await provider.getBalance(walletAddress);
    return ethers.formatEther(balWei);
  } catch {
    return "0";
  }
}

module.exports = { getCounterfactualAddress, buildUserOperation, sendUserOperation, getBalance, getNonce };
