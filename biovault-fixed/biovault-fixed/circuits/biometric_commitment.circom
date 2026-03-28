pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

/**
 * BiometricCommitment Circuit
 * 
 * Proves: "I know a biometric template T such that Poseidon(T, salt) = commitment"
 * WITHOUT revealing T or salt to anyone.
 * 
 * Public inputs:  commitment (stored on server / blockchain)
 * Private inputs: biometricHash (64-byte hash of fingerprint template)
 *                 salt         (random per-user secret)
 * 
 * This ZK proof is generated client-side in the browser.
 * The server only ever sees the proof + commitment, never the raw biometric.
 */
template BiometricCommitment() {
    // Private inputs (never revealed)
    signal input biometricHash[2]; // Split 256-bit hash into two 128-bit field elements
    signal input salt;

    // Public output (stored on server & blockchain)
    signal output commitment;

    // Compute Poseidon hash of (biometricHash[0], biometricHash[1], salt)
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== biometricHash[0];
    poseidon.inputs[1] <== biometricHash[1];
    poseidon.inputs[2] <== salt;

    commitment <== poseidon.out;
}

component main {public []} = BiometricCommitment();
