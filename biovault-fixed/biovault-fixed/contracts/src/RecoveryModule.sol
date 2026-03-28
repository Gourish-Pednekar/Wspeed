// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BioVaultAccount.sol";

/**
 * @title RecoveryModule
 * @notice Social recovery for BioVault wallets
 * @dev Guardians can collectively authorize a biometric key rotation
 *      Requires threshold of guardians to approve before execution
 */
contract RecoveryModule {
    struct RecoveryRequest {
        uint256 newPubKeyX;
        uint256 newPubKeyY;
        uint256 approvalCount;
        uint256 initiatedAt;
        bool executed;
        mapping(address => bool) approvedBy;
    }

    // wallet → recovery request
    mapping(address => RecoveryRequest) public recoveryRequests;

    // Recovery delay: guardians have 48h to approve
    uint256 public constant RECOVERY_DELAY = 48 hours;

    // Minimum guardian threshold (2/3 majority)
    uint256 public constant THRESHOLD_PERCENT = 66;

    event RecoveryInitiated(address indexed wallet, uint256 newPubKeyX, uint256 newPubKeyY);
    event RecoveryApproved(address indexed wallet, address indexed guardian);
    event RecoveryExecuted(address indexed wallet);
    event RecoveryCancelled(address indexed wallet);

    /**
     * @notice Initiate recovery — called by a guardian when user loses biometric
     * @param wallet The BioVaultAccount to recover
     * @param newPubKeyX New P256 X coordinate (new device/biometric)
     * @param newPubKeyY New P256 Y coordinate
     */
    function initiateRecovery(
        address wallet,
        uint256 newPubKeyX,
        uint256 newPubKeyY
    ) external {
        BioVaultAccount bv = BioVaultAccount(payable(wallet));
        require(bv.isGuardian(msg.sender), "RecoveryModule: not a guardian");

        RecoveryRequest storage req = recoveryRequests[wallet];
        req.newPubKeyX = newPubKeyX;
        req.newPubKeyY = newPubKeyY;
        req.approvalCount = 0;
        req.initiatedAt = block.timestamp;
        req.executed = false;

        emit RecoveryInitiated(wallet, newPubKeyX, newPubKeyY);

        // Auto-approve from initiating guardian
        _approve(wallet, msg.sender);
    }

    /**
     * @notice Guardian approves the pending recovery request
     */
    function approveRecovery(address wallet) external {
        BioVaultAccount bv = BioVaultAccount(payable(wallet));
        require(bv.isGuardian(msg.sender), "RecoveryModule: not a guardian");
        _approve(wallet, msg.sender);
    }

    function _approve(address wallet, address guardian) internal {
        RecoveryRequest storage req = recoveryRequests[wallet];
        require(!req.executed, "RecoveryModule: already executed");
        require(!req.approvedBy[guardian], "RecoveryModule: already approved");

        req.approvedBy[guardian] = true;
        req.approvalCount++;

        emit RecoveryApproved(wallet, guardian);

        // Auto-execute if threshold met after delay
        BioVaultAccount bv = BioVaultAccount(payable(wallet));
        uint256 required = (bv.guardianCount() * THRESHOLD_PERCENT) / 100 + 1;
        if (
            req.approvalCount >= required &&
            block.timestamp >= req.initiatedAt + RECOVERY_DELAY
        ) {
            _execute(wallet);
        }
    }

    /**
     * @notice Execute recovery after threshold approvals and time delay
     */
    function executeRecovery(address wallet) external {
        BioVaultAccount bv = BioVaultAccount(payable(wallet));
        RecoveryRequest storage req = recoveryRequests[wallet];

        require(!req.executed, "RecoveryModule: already executed");
        require(
            block.timestamp >= req.initiatedAt + RECOVERY_DELAY,
            "RecoveryModule: delay not elapsed"
        );

        uint256 required = (bv.guardianCount() * THRESHOLD_PERCENT) / 100 + 1;
        require(req.approvalCount >= required, "RecoveryModule: insufficient approvals");

        _execute(wallet);
    }

    function _execute(address wallet) internal {
        RecoveryRequest storage req = recoveryRequests[wallet];
        req.executed = true;

        BioVaultAccount(payable(wallet)).updateBiometricKey(
            req.newPubKeyX,
            req.newPubKeyY
        );

        emit RecoveryExecuted(wallet);
    }

    /**
     * @notice Cancel recovery — only the wallet itself can cancel (via self-call)
     */
    function cancelRecovery(address wallet) external {
        require(msg.sender == wallet, "RecoveryModule: only wallet can cancel");
        delete recoveryRequests[wallet];
        emit RecoveryCancelled(wallet);
    }

    function getRecoveryRequest(address wallet) external view returns (
        uint256 newPubKeyX,
        uint256 newPubKeyY,
        uint256 approvalCount,
        uint256 initiatedAt,
        bool executed
    ) {
        RecoveryRequest storage req = recoveryRequests[wallet];
        return (req.newPubKeyX, req.newPubKeyY, req.approvalCount, req.initiatedAt, req.executed);
    }
}
