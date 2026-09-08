// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Leaf
/// @notice Blattberechnung für Citable-Merkle-Bäume.
/// @dev Muss byte-identisch im Frontend nachgebaut werden — siehe script/js/leaf.mjs.
library Leaf {
    /// @notice Bindet `segment` kryptografisch an seine Position `index`.
    /// @dev Der Index sitzt im Blatt, weil sortierte Geschwisterpaare (merkletreejs
    ///      `sortPairs: true`) die Reihenfolge sonst verlieren würden. Doppelte Hashung
    ///      ist die OpenZeppelin-Konvention gegen Second-Preimage-Angriffe.
    function leafOf(uint256 index, string memory segment) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(index, segment))));
    }
}
