// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./BioVaultAccount.sol";

/**
 * @title BioVaultAccountFactory
 * @notice Deploys BioVaultAccount instances deterministically using CREATE2
 * @dev Wallet address is derived from the user's P256 public key + salt
 *      This means the wallet address is predictable BEFORE deployment
 */
contract BioVaultAccountFactory {
    BioVaultAccount public immutable accountImplementation;

    event WalletCreated(address indexed wallet, uint256 pubKeyX, uint256 pubKeyY);

    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new BioVaultAccount(_entryPoint);
    }

    /**
     * @notice Deploy or return existing wallet for a biometric public key
     * @param pubKeyX P256 X coordinate from WebAuthn registration
     * @param pubKeyY P256 Y coordinate from WebAuthn registration
     * @param salt Additional entropy (e.g., username hash)
     */
    function createAccount(
        uint256 pubKeyX,
        uint256 pubKeyY,
        uint256 salt
    ) external returns (BioVaultAccount) {
        address addr = getAddress(pubKeyX, pubKeyY, salt);

        // Return existing wallet if already deployed
        uint256 codeSize;
        assembly { codeSize := extcodesize(addr) }
        if (codeSize > 0) {
            return BioVaultAccount(payable(addr));
        }

        // Deploy new wallet via ERC1967 proxy
        bytes memory initData = abi.encodeCall(
            BioVaultAccount.initialize,
            (pubKeyX, pubKeyY)
        );

        ERC1967Proxy proxy = new ERC1967Proxy{
            salt: bytes32(salt)
        }(address(accountImplementation), initData);

        emit WalletCreated(address(proxy), pubKeyX, pubKeyY);
        return BioVaultAccount(payable(address(proxy)));
    }

    /**
     * @notice Compute wallet address before deployment (counterfactual address)
     * @dev Frontend calls this to show the user their wallet address immediately
     */
    function getAddress(
        uint256 pubKeyX,
        uint256 pubKeyY,
        uint256 salt
    ) public view returns (address) {
        bytes memory initData = abi.encodeCall(
            BioVaultAccount.initialize,
            (pubKeyX, pubKeyY)
        );
        bytes memory proxyBytecode = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(address(accountImplementation), initData)
        );
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(proxyBytecode)
        );
    }
}
