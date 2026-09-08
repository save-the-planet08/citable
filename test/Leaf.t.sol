// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Leaf} from "../src/Leaf.sol";

/// @notice Beweist, dass die JS- und die Solidity-Blattberechnung dasselbe Byte-Ergebnis
///         liefern. Kein hardcodiertes Fixture — sonst driften beide Seiten auseinander,
///         ohne dass es auffällt. Braucht `ffi = true` und `npm install`.
contract LeafTest is Test {
    function _jsLeaf(uint256 index, string memory segment) internal returns (bytes32) {
        string[] memory cmd = new string[](4);
        cmd[0] = "node";
        cmd[1] = "script/js/leaf.mjs";
        cmd[2] = vm.toString(index);
        cmd[3] = segment;
        return abi.decode(vm.ffi(cmd), (bytes32));
    }

    function _assertParity(uint256 index, string memory segment) internal {
        assertEq(Leaf.leafOf(index, segment), _jsLeaf(index, segment));
    }

    function test_LeafParity_Ascii() public {
        _assertParity(3, "Wurden die Zahlen manipuliert?");
    }

    function test_LeafParity_Utf8() public {
        _assertParity(7, unicode"Die Grundzüge der Erhöhung — näher betrachtet: ÄÖÜ ß, çà, 你好.");
    }

    function test_LeafParity_Emoji() public {
        _assertParity(0, unicode"Zitat ohne Kontext 🤡 bleibt Desinformation 🧵");
    }

    function test_LeafParity_EmptySegment() public {
        _assertParity(1, "");
    }

    function test_LeafParity_LargeIndex() public {
        _assertParity(2 ** 64 + 1, "Segment an absurder Position");
    }

    /// @notice Der eigentliche Punkt: Die Position steckt im Hash.
    function test_LeafDiffers_ByIndex() public pure {
        string memory segment = "Wurden die Zahlen manipuliert?";
        assertTrue(Leaf.leafOf(3, segment) != Leaf.leafOf(4, segment));
    }
}
