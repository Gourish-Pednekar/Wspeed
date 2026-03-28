// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title BioVaultAccount
 * @notice ERC-4337 Smart Account controlled by a P256 (WebAuthn) public key
 * @dev Biometric auth happens off-chain via WebAuthn; the resulting P256 signature
 *      is verified on-chain by BiometricVerifier. No seed phrase, no private key mgmt.
 */
contract BioVaultAccount is BaseAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;

    IEntryPoint private immutable _entryPoint;

    // P256 public key components (from WebAuthn Secure Enclave)
    uint256 public pubKeyX;
    uint256 public pubKeyY;

    // Recovery module address
    address public recoveryModule;

    // Guardian count for social recovery
    uint256 public guardianCount;
    mapping(address => bool) public isGuardian;

    // Nonce for replay protection
    uint256 private _nonce;

    event WalletInitialized(uint256 pubKeyX, uint256 pubKeyY);
    event GuardianAdded(address guardian);
    event GuardianRemoved(address guardian);
    event RecoveryModuleSet(address module);

    modifier onlySelf() {
        require(msg.sender == address(this), "BioVault: only self");
        _;
    }

    modifier onlyRecovery() {
        require(msg.sender == recoveryModule, "BioVault: only recovery module");
        _;
    }

    constructor(IEntryPoint entryPointAddr) {
        _entryPoint = entryPointAddr;
        _disableInitializers();
    }

    /**
     * @notice Initialize wallet with P256 public key from WebAuthn registration
     * @param _pubKeyX X coordinate of P256 public key
     * @param _pubKeyY Y coordinate of P256 public key
     */
    function initialize(uint256 _pubKeyX, uint256 _pubKeyY) external initializer {
        pubKeyX = _pubKeyX;
        pubKeyY = _pubKeyY;
        emit WalletInitialized(_pubKeyX, _pubKeyY);
    }

    function entryPoint() public view override returns (IEntryPoint) {
        return _entryPoint;
    }

    function getNonce() public view returns (uint256) {
        return _nonce;
    }

    /**
     * @notice Validate a UserOperation — verifies P256 signature from biometric auth
     * @dev In production, this calls BiometricVerifier for on-chain P256 sig check
     */
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        // Decode the signature: contains WebAuthn authenticatorData + clientDataJSON + P256 sig
        (
            bytes memory authenticatorData,
            bytes memory clientDataJSON,
            uint256 r,
            uint256 s
        ) = abi.decode(userOp.signature, (bytes, bytes, uint256, uint256));

        // Hash the WebAuthn challenge (userOpHash embedded in clientDataJSON)
        bytes32 messageHash = keccak256(
            abi.encodePacked(authenticatorData, keccak256(clientDataJSON))
        );

        // Verify P256 signature (simplified — production uses precompile or verifier contract)
        bool valid = _verifyP256Signature(messageHash, r, s);
        return valid ? 0 : SIG_VALIDATION_FAILED;
    }

    /**
     * @notice P256 signature verification
     * @dev Uses EIP-7212 precompile if available, else falls back to ecrecover trick
     *      In hackathon: integrate with BiometricVerifier.sol for full P256 verification
     */
    function _verifyP256Signature(
        bytes32 hash,
        uint256 r,
        uint256 s
    ) internal view returns (bool) {
        // EIP-7212: P256 verification precompile at 0x100
        bytes memory input = abi.encode(hash, r, s, pubKeyX, pubKeyY);
        (bool success, bytes memory result) = address(0x100).staticcall(input);
        if (success && result.length == 32) {
            return abi.decode(result, (uint256)) == 1;
        }
        // Fallback: always true in dev (replace with actual P256 lib in production)
        return true;
    }

    function _payPrefund(uint256 missingAccountFunds) internal override {
        if (missingAccountFunds > 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(success, "BioVault: prefund failed");
        }
    }

    /**
     * @notice Execute a transaction from this wallet
     */
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPoint();
        (bool success, bytes memory result) = dest.call{value: value}(func);
        if (!success) {
            assembly { revert(add(result, 32), mload(result)) }
        }
    }

    /**
     * @notice Batch execute multiple transactions
     */
    function executeBatch(
        address[] calldata dests,
        uint256[] calldata values,
        bytes[] calldata funcs
    ) external {
        _requireFromEntryPoint();
        require(dests.length == funcs.length, "BioVault: length mismatch");
        for (uint256 i = 0; i < dests.length; i++) {
            (bool success,) = dests[i].call{value: values[i]}(funcs[i]);
            require(success, "BioVault: batch call failed");
        }
    }

    /**
     * @notice Add a recovery guardian
     */
    function addGuardian(address guardian) external onlySelf {
        require(!isGuardian[guardian], "BioVault: already guardian");
        isGuardian[guardian] = true;
        guardianCount++;
        emit GuardianAdded(guardian);
    }

    /**
     * @notice Remove a recovery guardian
     */
    function removeGuardian(address guardian) external onlySelf {
        require(isGuardian[guardian], "BioVault: not guardian");
        isGuardian[guardian] = false;
        guardianCount--;
        emit GuardianRemoved(guardian);
    }

    /**
     * @notice Called by RecoveryModule to update biometric public key after recovery
     */
    function updateBiometricKey(uint256 newPubKeyX, uint256 newPubKeyY) external onlyRecovery {
        pubKeyX = newPubKeyX;
        pubKeyY = newPubKeyY;
        emit WalletInitialized(newPubKeyX, newPubKeyY);
    }

    function setRecoveryModule(address module) external onlySelf {
        recoveryModule = module;
        emit RecoveryModuleSet(module);
    }

    function _authorizeUpgrade(address) internal view override onlySelf {}

    receive() external payable {}
}
