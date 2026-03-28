const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ERC-4337 EntryPoint v0.6 — deployed on all major testnets
const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying BioVault contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy Factory (uses existing EntryPoint)
  const Factory = await ethers.getContractFactory("BioVaultAccountFactory");
  const factory = await Factory.deploy(ENTRY_POINT_ADDRESS);
  await factory.waitForDeployment();
  console.log("✅ BioVaultAccountFactory deployed:", await factory.getAddress());

  // Deploy RecoveryModule
  const Recovery = await ethers.getContractFactory("RecoveryModule");
  const recovery = await Recovery.deploy();
  await recovery.waitForDeployment();
  console.log("✅ RecoveryModule deployed:", await recovery.getAddress());

  // Save addresses to file for backend use
  const addresses = {
    entryPoint: ENTRY_POINT_ADDRESS,
    factory: await factory.getAddress(),
    recoveryModule: await recovery.getAddress(),
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, "../deployments.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("\n📄 Addresses saved to contracts/deployments.json");
  console.log(JSON.stringify(addresses, null, 2));

  // Also write to backend config
  const backendEnvPath = path.join(__dirname, "../../backend/.env.contracts");
  const envContent = Object.entries(addresses)
    .map(([k, v]) => `${k.toUpperCase()}=${v}`)
    .join("\n");
  fs.writeFileSync(backendEnvPath, envContent);
  console.log("📄 Contract addresses written to backend/.env.contracts");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
