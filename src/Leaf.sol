// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Leaf
/// @notice Leaf computation for Citable merkle trees.
/// @dev Must be reproduced byte for byte in the frontend — see script/js/leaf.mjs.
library Leaf {
    /// @notice Cryptographically binds `segment` to its position `index`.
    /// @dev The index lives inside the leaf because sorted sibling pairs (merkletreejs
    ///      `sortPairs: true`) would otherwise lose the ordering. The double hash is the
    ///      OpenZeppelin convention against second-preimage attacks.
    function leafOf(uint256 index, string memory segment) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(index, segment))));
    }
}
