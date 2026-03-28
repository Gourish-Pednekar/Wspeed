pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

/**
 * BiometricVerify Circuit
 * 
 * Proves: "I know a biometric that matches the stored commitment,
 *          AND I am authorizing this specific transaction hash."
 * 
 * Public inputs:  commitment    (from registration, stored on server)
 *                 txHash        (hash of the transaction being authorized)
 * Private inputs: biometricHash (current scan — must match commitment)
 *                 salt          (user's secret salt)
 * 
 * Used when signing transactions — combines biometric ownership proof
 * with transaction intent in a single ZK proof.
 */
template BiometricVerify() {
    // Private inputs
    signal input biometricHash[2];
    signal input salt;

    // Public inputs
    signal input commitment;
    signal input txHash;

    // Intermediate signals
    signal computedCommitment;
    signal authHash;

    // 1. Recompute commitment from private biometric
    component poseidon1 = Poseidon(3);
    poseidon1.inputs[0] <== biometricHash[0];
    poseidon1.inputs[1] <== biometricHash[1];
    poseidon1.inputs[2] <== salt;
    computedCommitment <== poseidon1.out;

    // 2. Assert computed commitment matches stored commitment
    commitment === computedCommitment;

    // 3. Bind proof to specific transaction (prevents replay)
    component poseidon2 = Poseidon(2);
    poseidon2.inputs[0] <== computedCommitment;
    poseidon2.inputs[1] <== txHash;
    authHash <== poseidon2.out;

    // Output auth hash (proves this proof is for THIS transaction)
    signal output authorizationHash;
    authorizationHash <== authHash;
}

component main {public [commitment, txHash]} = BiometricVerify();
